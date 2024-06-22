import React, {useEffect, useRef} from "react";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import {zoom, zoomIdentity} from "d3-zoom";
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {updateSelectedState} from '../../store/filterSlice';

const usStateData = "/states-10m.json";

const StateMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const dispatch = useAppDispatch();
    const {selectedStateName} = useAppSelector((state) => state.filter);
    const locationData = useAppSelector((state) => state.location.data);

    const renderMap = () => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current)
            .attr("viewBox", "0 0 960 600") // Adjusted viewBox to fit the aspect ratio
            .attr("preserveAspectRatio", "xMidYMid meet") // Maintain aspect ratio
            .attr("style", "max-width: 100%; height: auto;");

        const projection = d3.geoAlbersUsa().fitSize([960, 600], {type: "Sphere"}); // Use Albers USA projection
        const path = d3.geoPath().projection(projection);

        let g = svg.select("g");
        if (g.empty()) {
            g = svg.append("g");
        }

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
                    .attr("fill", "#444")
                    .attr("stroke", "#fff")
                    .attr("cursor", "pointer")
                    .on("click", (event, d) => handleClick(event, d, path, zoomBehavior))
                    .attr("d", path);

                states.append("title")
                    .text((d: any) => d.properties.name);

                // Initial zoom and center
                const [[x0, y0], [x1, y1]] = path.bounds(topojson.feature(us, us.objects.states));
                const initialScale = Math.min(8, 0.9 / Math.max((x1 - x0) / 960, (y1 - y0) / 600));
                const initialTranslate = [480 - initialScale * (x0 + x1) / 2, 300 - initialScale * (y0 + y1) / 2];

                svg.call(zoomBehavior.transform, zoomIdentity.translate(initialTranslate[0], initialTranslate[1]).scale(initialScale));
            } catch (error) {
                console.error("Error loading map data:", error);
            }
        };

        const handleClick = (event: any, d: any, path: any, zoomBehavior: any) => {
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            const scale = Math.max(1, Math.min(8, 0.9 / Math.max((x1 - x0) / 960, (y1 - y0) / 600)));
            const translate = [480 - scale * (x0 + x1) / 2, 300 - scale * (y0 + y1) / 2];

            svg.transition().duration(750).call(
                zoomBehavior.transform,
                zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );

            dispatch(updateSelectedState({stateName: d.properties.name, stateNum: d.id}));

            // Zoom out to the initial view after a certain duration
            setTimeout(() => {
                svg.transition().duration(750).call(zoomBehavior.transform, zoomIdentity);
            }, 2000);
        };

        fetchData();
    };

    useEffect(() => {
        if (locationData.length > 0) {
            renderMap();
        }
    }, [locationData]);

    useEffect(() => {
        if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const paths = svg.selectAll("path");
            paths.transition().style("fill", null);

            const selectedState = paths.filter((d: any) => d && d.properties && d.properties.name === selectedStateName);
            selectedState.transition().style("fill", "red");
        }
    }, [selectedStateName]);

    return <svg ref={svgRef}/>;
};


export default StateMap;