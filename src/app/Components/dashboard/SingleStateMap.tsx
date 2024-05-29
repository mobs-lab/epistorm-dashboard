// components/StateDetail.tsx
'use client'

import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import {useAppSelector} from '../../store/hooks';

//TODO: this is the correct shapefile to use, lets change all below code accordingly.
const shapeFile = "/states-albers-10m.json"

type StateDetailProps = {
    stateNum: string; // hospitalizations: number;
};

const SingleStateMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const {selectedStateName, USStateNum} = useAppSelector((state) => state.filter);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const us: any = await d3.json(shapeFile);
                const states = topojson.feature(us, us.objects.states);

                const svg = d3.select(svgRef.current);
                svg.selectAll('*').remove();

                const width = 400;
                const height = 300;

                const path = d3.geoPath();

                if (selectedStateName === "United States") {
                    const projection = d3.geoAlbersUsa().fitSize([width, height], states);
                    path.projection(projection);

                    svg.selectAll("path")
                        .data(states.features)
                        .enter()
                        .append("path")
                        .attr("d", path)
                        .attr("fill", "lightblue")
                        .attr("stroke", "black");
                } else {
                    const selectedState = states.features.find(
                        (feature) => feature.properties.name === selectedStateName
                    );

                    if (selectedState) {
                        const bounds = path.bounds(selectedState);
                        const dx = bounds[1][0] - bounds[0][0];
                        const dy = bounds[1][1] - bounds[0][1];
                        const x = (bounds[0][0] + bounds[1][0]) / 2;
                        const y = (bounds[0][1] + bounds[1][1]) / 2;
                        const scale = 0.8 / Math.max(dx / width, dy / height);
                        const translate = [width / 2 - scale * x, height / 2 - scale * y];

                        const stateProjection = d3.geoTransform({
                            point: function (px, py) {
                                this.stream.point(px * scale + translate[0], py * scale + translate[1]);
                            }
                        });

                        const statePath = d3.geoPath().projection(stateProjection);

                        svg.append("path")
                            .datum(selectedState)
                            .attr("d", statePath)
                            .attr("fill", "lightblue")
                            .attr("stroke", "black");
                    }
                }
            } catch (error) {
                console.error("Error loading shapefile:", error);
            }
        };

        fetchData();
    }, [selectedStateName]);

    return (
        <div className="bg-gray-800 text-white p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Influenza Hospitalizations 2023-2024</h2>
            <div className="flex items-center">
                <svg ref={svgRef} width={400} height={300}/>
                <span className="text-3xl">{selectedStateName}</span>
            </div>
        </div>
    );
};

export default SingleStateMap;