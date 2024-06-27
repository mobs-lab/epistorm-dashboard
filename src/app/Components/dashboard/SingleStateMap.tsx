// components/StateDetail.tsx
'use client'

import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {useAppSelector} from '../../store/hooks';
import InfoButton from './InfoButton';

const shapeFile = '/states-10m.json';

const SingleStateMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const {selectedStateName} = useAppSelector((state) => state.filter);

    const mapInfo = (
        <div>
            <p>This map shows the selected state or the entire US.</p>
            <p>The map updates based on your state selection in the filters pane.</p>
        </div>
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const us: any = await d3.json(shapeFile);
                const states = topojson.feature(us, us.objects.states);

                const svg = d3.select(svgRef.current);
                svg.selectAll('*').remove();

                const width = svgRef.current?.clientWidth || 400;
                const height = svgRef.current?.clientHeight || 300;

                const path = d3.geoPath();

                if (selectedStateName === 'US') {
                    const projection = d3.geoAlbersUsa().fitSize([width, height], states);
                    path.projection(projection);

                    svg.selectAll('path')
                        .data(states.features)
                        .enter()
                        .append('path')
                        .attr('d', path)
                        .attr('fill', '#32bbe0')
                        .attr('stroke', 'white');
                } else {
                    const selectedState = states.features.find(
                        (feature) => feature.properties.name === selectedStateName
                    );

                    if (selectedState) {
                        const projection = d3.geoAlbersUsa().fitSize([width, height], selectedState);
                        path.projection(projection);

                        svg.append('path')
                            .datum(selectedState)
                            .attr('d', path)
                            .attr('fill', '#32bbe0')
                            .attr('stroke', 'white');
                    }
                }
            } catch (error) {
                console.error('Error loading shapefile:', error);
            }
        };

        fetchData();
    }, [selectedStateName]);

    return (
        <div className="text-white p-4 rounded relative">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">{selectedStateName}</h2>
                <InfoButton title="State Map Information" content={mapInfo} />
            </div>
            <div className="flex items-center">
                <svg ref={svgRef} width={"100%"} height={"100%"}/>
            </div>
        </div>
    );
};

export default SingleStateMap;
