import React, { useEffect, useRef, useState } from "react";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { zoom, zoomIdentity } from "d3-zoom";
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateSelectedState } from '../../store/filterSlice';

const usStateData = "/states-10m.json";

const StateMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const dispatch = useAppDispatch();
    const { selectedStateName } = useAppSelector((state) => state.filter);
    const locationData = useAppSelector((state) => state.location.data);

    useEffect(() => {
        const updateDimensions = () => {
            if (svgRef.current) {
                const { width, height } = svgRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const renderMap = () => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        svg.selectAll("*").remove(); // Clear previous content

        const projection = d3.geoAlbersUsa().fitSize([dimensions.width, dimensions.height], { type: "Sphere" });
        const path = d3.geoPath().projection(projection);

        const g = svg.append("g");

        const zoomBehavior = zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => g.attr("transform", event.transform));

        svg.call(zoomBehavior);

        const fetchData = async () => {
            try {
                const us: any = await d3.json(usStateData);
                const states = g.selectAll("path")
                    .data(topojson.feature(us, us.objects.states).features)
                    .join("path")
                    .attr("fill", "#00505b")
                    .attr("stroke", "lightgray")
                    .attr("cursor", "pointer")
                    .on("click", (event, d) => handleClick(event, d, path, zoomBehavior))
                    .attr("d", path);

                states.append("title")
                    .text((d: any) => d.properties.name);

                // Initial zoom and center
                const [[x0, y0], [x1, y1]] = path.bounds(topojson.feature(us, us.objects.states));
                const initialScale = Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height));
                const initialTranslate = [
                    dimensions.width / 2 - initialScale * (x0 + x1) / 2,
                    dimensions.height / 2 - initialScale * (y0 + y1) / 2
                ];

                svg.call(zoomBehavior.transform, zoomIdentity.translate(initialTranslate[0], initialTranslate[1]).scale(initialScale));
            } catch (error) {
                console.error("Error loading map data:", error);
            }
        };

        const handleClick = (event: any, d: any, path: any, zoomBehavior: any) => {
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            const scale = Math.max(1, Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height)));
            const translate = [
                dimensions.width / 2 - scale * (x0 + x1) / 2,
                dimensions.height / 2 - scale * (y0 + y1) / 2
            ];

            svg.transition().duration(750).call(
                zoomBehavior.transform,
                zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );

            dispatch(updateSelectedState({ stateName: d.properties.name, stateNum: d.id }));

            // Zoom out to the initial view after a certain duration
            setTimeout(() => {
                svg.transition().duration(750).call(zoomBehavior.transform, zoomIdentity);
            }, 2000);
        };

        fetchData();
    };

    useEffect(() => {
        if (locationData.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
            renderMap();
        }
    }, [locationData, dimensions]);

    useEffect(() => {
        if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const paths = svg.selectAll("path");
            paths.transition().style("fill", null);

            const selectedState = paths.filter((d: any) => d && d.properties && d.properties.name === selectedStateName);
            selectedState.transition().style("fill", "red");
        }
    }, [selectedStateName]);

    return <svg ref={svgRef} width="100%" height="100%"/>;
};

export default StateMap;