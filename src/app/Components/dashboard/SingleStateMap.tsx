// components/StateDetail.tsx
'use client'

import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {useAppSelector} from '../../store/hooks';

const shapeFile = '/states-10m.json';

const SingleStateMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const {selectedStateName} = useAppSelector((state) => state.filter);

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

                if (selectedStateName === 'US') {
                    const projection = d3.geoAlbersUsa().fitSize([width, height], states);
                    path.projection(projection);

                    svg.selectAll('path')
                        .data(states.features)
                        .enter()
                        .append('path')
                        .attr('d', path)
                        .attr('fill', 'lightblue')
                        .attr('stroke', 'black');
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
                            .attr('fill', 'lightblue')
                            .attr('stroke', 'black');
                    }
                }
            } catch (error) {
                console.error('Error loading shapefile:', error);
            }
        };

        fetchData();
    }, [selectedStateName]);

    return (
        <div className="bg-gray-800 text-white p-4 rounded">
            <h2 className="text-3xl font-bold mb-4">{selectedStateName}</h2>
            <div className="flex items-center">
                <svg ref={svgRef} width={400} height={300}/>
            </div>
        </div>
    );
};

export default SingleStateMap;
