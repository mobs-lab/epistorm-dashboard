// SingleStateMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useAppSelector } from '../../store/hooks';
import InfoButton from './InfoButton';
import RiskLevelThermometer from './RiskLevelThermometer';

const shapeFile = '/states-10m.json';

const SingleStateMap: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapSvgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const { selectedStateName, USStateNum } = useAppSelector((state) => state.filter);



    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const us: any = await d3.json(shapeFile);
                const states = topojson.feature(us, us.objects.states);

                const svg = d3.select(mapSvgRef.current);
                svg.selectAll('*').remove();

                const width = dimensions.width * 0.4;
                const height = dimensions.height * 0.6;

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
    }, [dimensions, selectedStateName]);

    return (
        <div ref={containerRef} className="text-white p-4 rounded relative h-full flex flex-col">

            <div className="flex items-stretch justify-between flex-grow">
                <div className="w-3/5">
                    <svg ref={mapSvgRef} width="80%" height="100%" preserveAspectRatio="xMidYMid meet" />
                </div>
                <div className="w-2/5">
                    <RiskLevelThermometer />
                </div>
            </div>
        </div>
    );
};

export default SingleStateMap;