import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import {useAppSelector} from '../src/app/store/hooks';

const RiskLevelThermometer: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const {USStateNum, userSelectedRiskLevelModel, userSelectedWeek} = useAppSelector(state => state.filter);
    const groundTruthData = useAppSelector(state => state.groundTruth.data);
    const predictionsData = useAppSelector(state => state.predictions.data);
    const locationData = useAppSelector(state => state.location.data);
    const thresholdsData = useAppSelector(state => state.stateThresholds.data);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

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

        const maxThreshold = Math.max(stateThresholds.medium, stateThresholds.high, stateThresholds.veryHigh);
        const valueScale = d3.scaleLinear()
            .domain([0, maxThreshold])
            .range([0, 97.5]);  // Map to 0-97.5% of the thermometer

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

            return { riskLevel, yPosition };
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
                    const solidLineValue = (prediction.confidence500 / statePopulation) * 100000; //NOTE: ask is it 1000 or 100000? 100000 seems more likely?
                    const solidLineY = yScale(valueScale(solidLineValue));

                    // Draw solid line
                    svg.append('line')
                        .attr('x1', 0)
                        .attr('x2', width)
                        .attr('y1', solidLineY)
                        .attr('y2', solidLineY)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 6);
                }
            }
        }

        // Calculate dotted line position (ground truth risk level trend)
        const groundTruthEntry = groundTruthData.find(d =>
            d.stateNum === USStateNum &&
            d.date.getTime() === relativeLastWeek.getTime()
        );

        if (groundTruthEntry) {
            const dottedLineY = yScale(valueScale(groundTruthEntry.weeklyRate));

            // Draw dotted line
            svg.append('line')
                .attr('x1', 0)
                .attr('x2', width)
                .attr('y1', dottedLineY)
                .attr('y2', dottedLineY)
                .attr('stroke', 'white')
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', '3,5');
        }


    }, [USStateNum, userSelectedRiskLevelModel, userSelectedWeek, groundTruthData, predictionsData, locationData, thresholdsData]);

    return (
        <svg ref={svgRef} width="70%" height="100%"/>
    );
};

export default RiskLevelThermometer;