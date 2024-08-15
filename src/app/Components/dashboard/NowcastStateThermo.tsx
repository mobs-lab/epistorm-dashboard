import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {useAppSelector} from '../../store/hooks';
import {format, subDays} from "date-fns";

const shapeFile = '/states-10m.json';

/* Color legend boxes */
const ThermoLegendBoxes: React.FC = () => {
    const riskLevels = ['Low', 'Medium', 'High', 'Very high'];
    const riskColors = ['#7cd8c9', '#2bafe2', '#435fce', '#3939a8'];

    return (
        <div className="flex justify-around items-end space-x-4 h-full px-10">
            {riskLevels.map((level, index) => (
                <div key={level} className="flex items-center">
                    <div
                        className="w-5 h-5"
                        style={{backgroundColor: riskColors[index]}}
                    ></div>
                    <span className="text-sm mx-2">{level}</span>
                </div>
            ))}
        </div>
    );
};

/* Bigger legend area for lines */
const ThermoLegendArea: React.FC<{
    currentWeek: string,
    previousWeek: string,
    currentRiskLevel: string,
    previousRiskLevel: string
}> = ({currentWeek, previousWeek, currentRiskLevel, previousRiskLevel}) => {

    // console.log('DEBUG: Rendering ThermoLegendArea', {currentWeek, previousWeek, currentRiskLevel, previousRiskLevel});

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel.toLowerCase()) {
            case 'low':
                return '#7cd8c9';
            case 'medium':
                return '#2bafe2';
            case 'high':
                return '#435fce';
            case 'very high':
                return '#3939a8';
            default:
                return '#7cd8c9';
        }
    };

    return (
        <div
            className="flex flex-col h-full flex-nowrap justify-between items-center bg-mobs-lab-color-filterspane p-4 rounded mx-4 mb-4">
            <div className="text-2xl font-bold">Activity level</div>
            <div className="h-full w-full flex flex-col justify-around space-y-2">
                <div className="flex flex-col">
                    <div className="flex items-center">
                        <svg width="16" height="2" className="mr-2">
                            <line x1="0" y1="1" x2="16" y2="1" stroke="white" strokeWidth="2"/>
                        </svg>
                        <span>Forecasted week</span>
                    </div>
                    <div className="ml-6 font-bold">{currentWeek}</div>
                    <div className="ml-6 flex items-center mt-1">
                        <div
                            className="w-full h-6 flex items-center justify-center text-sm"
                            style={{backgroundColor: getRiskColor(currentRiskLevel)}}
                        >
                            {currentRiskLevel}
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-300 my-2"></div>
                <div className="flex flex-col">
                    <div className="flex items-center">
                        <svg width="16" height="2" className="mr-2">
                            <line x1="0" y1="1" x2="16" y2="1" stroke="white" strokeWidth="2" strokeDasharray="2,2"/>
                        </svg>
                        <span>Previous week</span>
                    </div>
                    <div className="ml-6 font-bold">{previousWeek}</div>
                    <div className="ml-6 flex items-center mt-1">
                        <div
                            className="w-full h-6 flex items-center justify-center text-sm"
                            style={{backgroundColor: getRiskColor(previousRiskLevel)}}
                        >
                            {previousRiskLevel}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NowcastStateThermo: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapSvgRef = useRef<SVGSVGElement>(null);
    const thermometerSvgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});
    const {
        selectedStateName, USStateNum, userSelectedRiskLevelModel, userSelectedWeek
    } = useAppSelector((state) => state.filter);
    const groundTruthData = useAppSelector(state => state.groundTruth.data);
    const predictionsData = useAppSelector(state => state.predictions.data);
    const locationData = useAppSelector(state => state.location.data);
    const thresholdsData = useAppSelector(state => state.stateThresholds.data);
    const [riskColor, setRiskColor] = useState('#7cd8c9'); // Default to low risk color

    const [currentRiskLevel, setCurrentRiskLevel] = useState('Low');
    const [previousRiskLevel, setPreviousRiskLevel] = useState('Low');

    const [currentWeek, setCurrentWeek] = useState('');
    const [previousWeek, setPreviousWeek] = useState('');

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

                const width = mapSvgRef.current?.clientWidth || 0;
                const height = mapSvgRef.current?.clientHeight || 0;

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
                        .attr('stroke', riskColor);
                } else {
                    const selectedState = states.features.find((feature) => feature.properties.name === selectedStateName);

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
                svg.attr('width', '100%')
                    .attr('height', '100%')
                    .attr('viewBox', `0 0 ${width} ${height}`)
                    .attr('preserveAspectRatio', 'xMidYMid meet');

            } catch (error) {
                console.error('Error loading shapefile to display map:', error);
            }
        };

        drawMap();
    }, [dimensions, selectedStateName, riskColor]);


    /* NOTE: Use Effect that draws the Thermometer */
    useEffect(() => {
        if (!thermometerSvgRef.current || !tooltipRef.current) return;

        const svg = d3.select(thermometerSvgRef.current);
        svg.selectAll('*').remove();

        const width = thermometerSvgRef.current.clientWidth;
        const height = thermometerSvgRef.current.clientHeight;
        const tooltip = d3.select(tooltipRef.current);

        const margin = {top: 0, right: width * 0.32, bottom: 0, left: width * 0.32};
        const thermoWidth = width - margin.left - margin.right;
        const thermoHeight = height - margin.top - margin.bottom;

        svg.attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const thermoGroup = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Define risk levels and colors
        const riskLevels = ['low', 'medium', 'high', 'very high'];
        const riskColors = ['#7cd8c9', '#2bafe2', '#435fce', '#3939a8'];

        // Get thresholds for the selected state
        const stateThresholds = thresholdsData.find(t => t.location === USStateNum);
        if (!stateThresholds) return;

        // Create scale
        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([thermoHeight, 0]);

        // Define risk level positions
        const riskPositions = [{level: 'low', position: 0}, {level: 'medium', position: 0.4}, {
            level: 'high',
            position: 0.9
        }, {level: 'very high', position: 0.975}, {level: 'max', position: 1}];

        // Calculate relative last week and current selected week
        const currentSelectedWeek = new Date(userSelectedWeek);
        const relativeLastWeek = new Date(currentSelectedWeek);
        relativeLastWeek.setDate(relativeLastWeek.getDate() - 7);

        // Get ground truth value
        const groundTruthEntry = groundTruthData.find(d => d.stateNum === USStateNum && d.date.getTime() === relativeLastWeek.getTime());
        const groundTruthValue = groundTruthEntry ? groundTruthEntry.weeklyRate : 0;

        // Get predicted value
        let predictedValue = 0;
        const selectedModel = predictionsData.find(m => m.modelName === userSelectedRiskLevelModel);
        if (selectedModel) {
            const prediction = selectedModel.predictionData.find(p => p.stateNum === USStateNum && p.referenceDate.getTime() === relativeLastWeek.getTime() && p.targetEndDate.getTime() === currentSelectedWeek.getTime());
            if (prediction) {
                const statePopulation = locationData.find(l => l.stateNum === USStateNum)?.population;
                if (statePopulation) {
                    predictedValue = (prediction.confidence500 / statePopulation) * 100000;
                }
            }
        }

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

        // Calculate positions for ground truth and predicted lines
        const groundTruthPosition = calculateLinePosition(groundTruthValue);
        const predictedPosition = calculateLinePosition(predictedValue);

        // Update risk levels
        setPreviousRiskLevel(groundTruthPosition.riskLevel.charAt(0).toUpperCase() + groundTruthPosition.riskLevel.slice(1));
        setCurrentRiskLevel(predictedPosition.riskLevel.charAt(0).toUpperCase() + predictedPosition.riskLevel.slice(1));

        // Helper functions for tooltip
        const formatNumber = (num: number) => num.toLocaleString('en-US', {maximumFractionDigits: 2});
        const getRangeString = (level: string, value: number, nextValue: number | null) => {
            if (level === 'low') return `[0, ${formatNumber(stateThresholds.medium)}]`;
            if (level === 'very high') return `[${formatNumber(stateThresholds.veryHigh)}, ∞)`;
            return `[${formatNumber(value)}, ${formatNumber(nextValue!)}]`;
        };

        // Helper function to get page coordinates
        const getPageCoordinates = (event: MouseEvent) => {
            const svgElement = thermometerSvgRef.current;
            if (!svgElement) return {x: 0, y: 0};

            const svgRect = svgElement.getBoundingClientRect();
            return {
                x: event.clientX - svgRect.left,
                y: event.clientY
            };
        };

        // Draw background rectangles with tooltips
        thermoGroup.selectAll('rect')
            .data(riskLevels)
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', (d, i) => yScale(riskPositions[i + 1].position * 100))
            .attr('width', thermoWidth)
            .attr('height', (d, i) => {
                const start = riskPositions[i].position;
                const end = riskPositions[i + 1].position;
                return yScale(start * 100) - yScale(end * 100);
            })
            .attr('fill', (d, i) => riskColors[i])
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2)
            .on('mouseover', function (event, d) {
                const level = d;
                const levelIndex = riskLevels.indexOf(level);
                const value = level === 'low' ? 0 : stateThresholds[level === 'medium' ? 'medium' : level === 'high' ? 'high' : 'veryHigh'];
                const nextValue = level === 'very high' ? null : stateThresholds[level === 'low' ? 'medium' : level === 'medium' ? 'high' : 'veryHigh'];

                tooltip.html(`
                <div style="font-size: 14px">
                    <div style="display: flex; align-items: center; margin: 5px;">
                        <div style="width: 12px; height: 12px; background-color: ${riskColors[levelIndex]}; margin-right: 5px;"></div>
                        <span>${level.charAt(0).toUpperCase() + level.slice(1)}: ${getRangeString(level, value, nextValue)}</span>
                    </div>
                    <div style="margin: 10px;">Surveillance: ${formatNumber(groundTruthValue)}</div>
                    <div style="margin: 10px;">Predicted: ${formatNumber(predictedValue)}</div>
                    </div>
                `);

                const tooltipNode = tooltip.node();
                if (tooltipNode) {
                    const {x, y} = getPageCoordinates(event);
                    const tooltipWidth = tooltipNode.offsetWidth;
                    const tooltipHeight = tooltipNode.offsetHeight;

                    const containerRect = containerRef.current?.getBoundingClientRect();
                    const thermometerRect = thermometerSvgRef.current?.getBoundingClientRect();

                    if (containerRect && thermometerRect) {
                        const left = thermometerRect.left - containerRect.left + x - tooltipWidth - 10;
                        const top = thermometerRect.top - containerRect.top + y - tooltipHeight / 2;


                        tooltip.style('left', `${left}px`)
                            .style('top', `${top}px`)
                            .style('display', 'block');
                    }
                }
            })
            .on('mousemove', function (event) {
                const tooltipNode = tooltip.node();
                if (tooltipNode) {
                    const {x, y} = getPageCoordinates(event);
                    const tooltipWidth = tooltipNode.offsetWidth;
                    const tooltipHeight = tooltipNode.offsetHeight;

                    const containerRect = containerRef.current?.getBoundingClientRect();
                    const thermometerRect = thermometerSvgRef.current?.getBoundingClientRect();

                    if (containerRect && thermometerRect) {
                        const left = thermometerRect.left - containerRect.left + x - tooltipWidth - 10;
                        const top = thermometerRect.top - containerRect.top + y - tooltipHeight / 2;

                        tooltip.style('left', `${left}px`)
                            .style('top', `${top}px`);
                    }
                }
            })
            .on('mouseout', () => {
                tooltip.style('display', 'none');
            });

        // Draw ground truth line (dotted)
        thermoGroup.append('line')
            .attr('x1', 0)
            .attr('x2', thermoWidth)
            .attr('y1', groundTruthPosition.yPosition)
            .attr('y2', groundTruthPosition.yPosition)
            .attr('stroke', 'white')
            .attr('stroke-width', 4)
            .attr('stroke-dasharray', '3,5');

        // Draw predicted line (solid)
        thermoGroup.append('line')
            .attr('x1', 0)
            .attr('x2', thermoWidth)
            .attr('y1', predictedPosition.yPosition)
            .attr('y2', predictedPosition.yPosition)
            .attr('stroke', 'white')
            .attr('stroke-width', 6);

        // Update risk color for the map
        setRiskColor(riskColors[riskLevels.indexOf(predictedPosition.riskLevel)]);

    }, [dimensions, USStateNum, userSelectedRiskLevelModel, userSelectedWeek, groundTruthData, predictionsData, locationData, thresholdsData]);

    useEffect(() => {
        const dateB = new Date(userSelectedWeek);
        const dateA = subDays(dateB, 6);
        const dateD = subDays(dateB, 7);
        const dateC = subDays(dateD, 6);

        const formatDate = (date: Date) => format(date, 'MMM dd');

        const currentWeekText = `${formatDate(dateA)} to ${formatDate(dateB)}`;
        const previousWeekText = `${formatDate(dateC)} to ${formatDate(dateD)}`;

        // console.log('DEBUG: Date strings calculated:', {currentWeekText, previousWeekText});

        // Update state variables to trigger re-render of ThermoLegendArea
        setCurrentWeek(currentWeekText);
        setPreviousWeek(previousWeekText);

        // console.log('DEBUG: State updated:', {currentWeek, previousWeek});
    }, [userSelectedWeek]);

    // console.log('DEBUG: Rendering NowcastStateThermo', {currentWeek, previousWeek});

    return (
        <div ref={containerRef}
             className="nowcast-state-thermo-grid-layout text-white w-min-full h-min-full">

            <div className="map-svg">
                <svg ref={mapSvgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
            </div>

            <div className="thermometer">
                <svg ref={thermometerSvgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
                <div ref={tooltipRef}
                     className="absolute hidden bg-white text-black rounded shadow-md text-sm"
                     style={{pointerEvents: 'none', zIndex: 10}}></div>
            </div>

            <div className="thermo-legend-area">
                <ThermoLegendArea
                    currentWeek={currentWeek}
                    previousWeek={previousWeek}
                    currentRiskLevel={currentRiskLevel}
                    previousRiskLevel={previousRiskLevel}
                />
            </div>

            <div className="thermo-legend-boxes">
                <ThermoLegendBoxes/>
            </div>
        </div>
    );

};

export default NowcastStateThermo;
