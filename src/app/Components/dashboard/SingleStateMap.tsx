import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {useAppSelector} from '../../store/hooks';
import InfoButton from './InfoButton';
import RiskLevelThermometer from './RiskLevelThermometer';
import RiskLevelGauge from './RiskLevelGauge';
import {NowcastTrend} from "../../Interfaces/forecast-interfaces";

const shapeFile = '/states-10m.json';

const SingleStateMap: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});
    const {selectedStateName, USStateNum} = useAppSelector((state) => state.filter);
    const [nowcastTrend, setNowcastTrend] = useState<NowcastTrend | null>(null);

    const mapInfo = (
        <div>
            <p>This map shows the selected state or the entire US.</p>
            <p>The map updates based on your state selection in the filters pane.</p>
            <p>The thermometer on the right shows the current risk level trend.</p>
        </div>
    );

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const {width, height} = containerRef.current.getBoundingClientRect();
                setDimensions({width: width * 0.8, height}); // 80% width for the map
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const fetchNowcastTrend = async () => {
            try {
                const response = await fetch('/data/processed/nowcast_trends.csv');
                const csvData = await response.text();
                const parsedData = d3.csvParse(csvData) as NowcastTrend[];
                const stateData = parsedData.find(d => d.location === USStateNum);
                setNowcastTrend(stateData || null);
            } catch (error) {
                console.error('Error loading nowcast data:', error);
            }
        };

        fetchNowcastTrend();
    }, [USStateNum]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const us: any = await d3.json(shapeFile);
                const states = topojson.feature(us, us.objects.states);

                const svg = d3.select(svgRef.current);
                svg.selectAll('*').remove();

                const width = dimensions.width * 0.8;
                const height = dimensions.height * 0.7;

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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">{selectedStateName}</h2>
                <InfoButton title="State Map Information" content={mapInfo}/>
            </div>
            <div className="flex items-stretch justify-between flex-grow">
                <svg ref={svgRef} width={"100%"} height={"100%"} preserveAspectRatio={"xMidYMid meet"}/>
                <RiskLevelThermometer nowcastTrend={nowcastTrend}/>
            </div>
        </div>
    );
};

export default SingleStateMap;