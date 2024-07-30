import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {useAppSelector} from '../../store/hooks';
import {format, subDays} from "date-fns";

const shapeFile = '/states-10m.json';

const SingleStateNowcast: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapSvgRef = useRef<SVGSVGElement>(null);
    const thermometerSvgRef = useRef<SVGSVGElement>(null);
    const currentWeekRef = useRef<HTMLSpanElement>(null);
    const previousWeekRef = useRef<HTMLSpanElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});
    const {
        selectedStateName,
        USStateNum,
        userSelectedRiskLevelModel,
        userSelectedWeek
    } = useAppSelector((state) => state.filter);
    const groundTruthData = useAppSelector(state => state.groundTruth.data);
    const predictionsData = useAppSelector(state => state.predictions.data);
    const locationData = useAppSelector(state => state.location.data);
    const thresholdsData = useAppSelector(state => state.stateThresholds.data);
    const [riskColor, setRiskColor] = useState('#7cd8c9'); // Default to low risk color

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const {width, height} = containerRef.current.getBoundingClientRect();
                setDimensions({width, height});
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const drawMap = async () => {
            try {
                const us: any = await d3.json(shapeFile);
                const states = topojson.feature(us, us.objects.states);

                const svg = d3.select(mapSvgRef.current);
                svg.selectAll('*').remove();

                const width = dimensions.width * 0.6;
                const height = dimensions.height * 0.7;

                const path = d3.geoPath();

                if (USStateNum === 'US') {
                    const projection = d3.geoAlbersUsa().fitSize([width, height], states);
                    path.projection(projection);

                    svg.selectAll('path')
                        .data(states.features)
                        .enter()
                        .append('path')
                        .attr('d', path)
                        .attr('fill', riskColor)
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
                            .attr('fill', riskColor)
                            .attr('stroke', 'white');
                    }
                }
            } catch (error) {
                console.error('Error loading shapefile:', error);
            }
        };

        drawMap();
    }, [dimensions, selectedStateName, riskColor]);

    useEffect(() => {
        if (!thermometerSvgRef.current) return;

        const svg = d3.select(thermometerSvgRef.current);
        svg.selectAll('*').remove();

        const width = thermometerSvgRef.current.clientWidth;
        const height = thermometerSvgRef.current.clientHeight;

        // Define risk levels and colors
        const riskLevels = ['low', 'medium', 'high', 'very high'];
        const riskColors = ['#7cd8c9', '#2bafe2', '#435fce', '#3939a8'];

        // Get thresholds for the selected state
        const stateThresholds = thresholdsData.find(t => t.location === USStateNum);
        if (!stateThresholds) return;

        // Create an arbitrary scale
        const yScale = d3.scaleLinear()
            .domain([0, 100])  // Arbitrary domain
            .range([height, 0]);

        // Define risk level positions
        const riskPositions = [
            {level: 'low', position: 0},
            {level: 'medium', position: 0.4},
            {level: 'high', position: 0.9},
            {level: 'very high', position: 0.975},
            {level: 'max', position: 1}
        ];

        // Draw background rectangles
        svg.selectAll('rect')
            .data(riskLevels)
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', (d, i) => yScale(riskPositions[i + 1].position * 100))
            .attr('width', width)
            .attr('height', (d, i) => {
                const start = riskPositions[i].position;
                const end = riskPositions[i + 1].position;
                return yScale(start * 100) - yScale(end * 100);
            })
            .attr('fill', (d, i) => riskColors[i])
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        // Draw threshold lines
        const thresholdLevels = [
            {name: 'medium', value: stateThresholds.medium, position: 0.4},
            {name: 'high', value: stateThresholds.high, position: 0.9},
            {name: 'very high', value: stateThresholds.veryHigh, position: 0.975}
        ];

        svg.selectAll('.threshold-line')
            .data(thresholdLevels)
            .enter()
            .append('line')
            .attr('class', 'threshold-line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', d => yScale(d.position * 100))
            .attr('y2', d => yScale(d.position * 100))
            .attr('stroke', 'black')
            .attr('stroke-width', 2);

        // Calculate relative last week and current selected week
        const currentSelectedWeek = new Date(userSelectedWeek);
        const relativeLastWeek = new Date(currentSelectedWeek);
        relativeLastWeek.setDate(relativeLastWeek.getDate() - 7);

        // Function to calculate line position and risk level
        const calculateLinePosition = (value: number) => {
            let riskLevel = 'low';
            let yPosition = 0;

            if (value >= stateThresholds.veryHigh) {
                riskLevel = 'very high';
                yPosition = yScale(riskPositions[3].position * 100);
            } else if (value >= stateThresholds.high) {
                riskLevel = 'high';
                const fraction = (value - stateThresholds.high) / (stateThresholds.veryHigh - stateThresholds.high);
                yPosition = yScale((riskPositions[2].position + fraction * (riskPositions[3].position - riskPositions[2].position)) * 100);
            } else if (value >= stateThresholds.medium) {
                riskLevel = 'medium';
                const fraction = (value - stateThresholds.medium) / (stateThresholds.high - stateThresholds.medium);
                yPosition = yScale((riskPositions[1].position + fraction * (riskPositions[2].position - riskPositions[1].position)) * 100);
            } else {
                const fraction = value / stateThresholds.medium;
                yPosition = yScale((riskPositions[0].position + fraction * (riskPositions[1].position - riskPositions[0].position)) * 100);
            }

            return {riskLevel, yPosition};
        };

        // Calculate solid line position (predicted risk level trend)
        const selectedModel = predictionsData.find(m => m.modelName === userSelectedRiskLevelModel);
        if (selectedModel) {
            const prediction = selectedModel.predictionData.find(p =>
                p.stateNum === USStateNum &&
                p.referenceDate.getTime() === relativeLastWeek.getTime() &&
                p.targetEndDate.getTime() === currentSelectedWeek.getTime()
            );

            if (prediction) {
                const statePopulation = locationData.find(l => l.stateNum === USStateNum)?.population;
                if (statePopulation) {
                    const solidLineValue = (prediction.confidence500 / statePopulation) * 100000;
                    const {riskLevel, yPosition} = calculateLinePosition(solidLineValue);

                    // Draw solid line
                    svg.append('line')
                        .attr('x1', 0)
                        .attr('x2', width)
                        .attr('y1', yPosition)
                        .attr('y2', yPosition)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 6);

                    // Update risk color for the map
                    const newRiskColor = riskColors[riskLevels.indexOf(riskLevel)];
                    setRiskColor(newRiskColor);
                }
            }
        }

        // Calculate dotted line position (ground truth risk level trend)
        const groundTruthEntry = groundTruthData.find(d =>
            d.stateNum === USStateNum &&
            d.date.getTime() === relativeLastWeek.getTime()
        );

        if (groundTruthEntry) {
            const {yPosition} = calculateLinePosition(groundTruthEntry.weeklyRate);

            // Draw dotted line
            svg.append('line')
                .attr('x1', 0)
                .attr('x2', width)
                .attr('y1', yPosition)
                .attr('y2', yPosition)
                .attr('stroke', 'white')
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', '3,5');
        }

    }, [dimensions, USStateNum, userSelectedRiskLevelModel, userSelectedWeek, groundTruthData, predictionsData, locationData, thresholdsData]);

    useEffect(() => {
        if (!currentWeekRef.current || !previousWeekRef.current) return;

        const dateB = new Date(userSelectedWeek);
        const dateA = subDays(dateB, 6);
        const dateD = subDays(dateB, 7);
        const dateC = subDays(dateD, 6);

        const formatDate = (date: Date) => format(date, 'MMM d');

        currentWeekRef.current.textContent = `${formatDate(dateA)}–${formatDate(dateB)}`;
        previousWeekRef.current.textContent = `${formatDate(dateC)}–${formatDate(dateD)}`;
    }, [userSelectedWeek]);

    return (
        <div ref={containerRef} className="text-white pl-10 pr-10 pt-6 rounded relative h-full flex flex-col">
            <div className="flex items-stretch justify-between flex-grow mb-4">
                <div className="w-[82%]">
                    <svg ref={mapSvgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
                </div>
                <div className="w-[18%]">
                    <svg ref={thermometerSvgRef} width="100%" height="100%" preserveAspectRatio={"xMidYMid meet"}/>
                </div>
            </div>
            <div className="w-full h-8 flex justify-between items-center text-sm">
                <div className="legend-activity "><b>Activity level</b></div>
                <div className="legend-current flex items-center">
                    <svg width="16" height="2" className="mr-2">
                        <line x1="0" y1="1" x2="16" y2="1" stroke="white" strokeWidth="2"/>
                    </svg>
                    <span ref={currentWeekRef}></span>
                </div>
                <div className="legend-previous flex items-center">
                    <svg width="16" height="2" className="mr-2">
                        <line x1="0" y1="1" x2="16" y2="1" stroke="white" strokeWidth="2" strokeDasharray="2,2"/>
                    </svg>
                    <span ref={previousWeekRef}></span>
                </div>
            </div>
        </div>
    );
};

export default SingleStateNowcast;