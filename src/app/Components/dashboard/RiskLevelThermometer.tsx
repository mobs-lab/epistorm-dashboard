import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useAppSelector } from '../../store/hooks';

const RiskLevelThermometer: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { USStateNum, userSelectedRiskLevelModel, userSelectedWeek } = useAppSelector(state => state.filter);
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
            { level: 'low', position: 0 },
            { level: 'medium', position: 0.4 },
            { level: 'high', position: 0.9 },
            { level: 'very high', position: 0.975 },
            { level: 'max', position: 1 }
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
            .attr('fill', (d, i) => riskColors[i]);

        // Draw threshold lines
        const thresholdLevels = [
            { name: 'medium', value: stateThresholds.medium, position: 0.4 },
            { name: 'high', value: stateThresholds.high, position: 0.9 },
            { name: 'very high', value: stateThresholds.veryHigh, position: 0.975 }
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

        // Calculate positions for dotted and solid lines
        const latestGroundTruth = groundTruthData
            .filter(d => d.stateNum === USStateNum && d.admissions !== -1)
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

        if (latestGroundTruth) {
            const maxThreshold = Math.max(stateThresholds.medium, stateThresholds.high, stateThresholds.veryHigh);
            const valueScale = d3.scaleLinear()
                .domain([0, maxThreshold])
                .range([0, 97.5]);  // Map to 0-97.5% of the thermometer

            const dottedLineY = yScale(valueScale(latestGroundTruth.weeklyRate));

            // Draw dotted line
            svg.append('line')
                .attr('x1', 0)
                .attr('x2', width)
                .attr('y1', dottedLineY)
                .attr('y2', dottedLineY)
                .attr('stroke', 'white')
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', '3,5');

            // Calculate solid line position
            const selectedModel = predictionsData.find(m => m.modelName === userSelectedRiskLevelModel);
            if (selectedModel) {
                const prediction = selectedModel.predictionData
                    .filter(p => p.stateNum === USStateNum && p.referenceDate.getTime() === latestGroundTruth.date.getTime())
                    .find(p => {
                        const oneWeekLater = new Date(latestGroundTruth.date);
                        oneWeekLater.setDate(oneWeekLater.getDate() + 7);
                        return p.targetEndDate.getTime() === oneWeekLater.getTime();
                    });

                if (prediction) {
                    const statePopulation = locationData.find(l => l.stateNum === USStateNum)?.population;
                    if (statePopulation) {
                        const solidLineValue = (prediction.confidence500 / statePopulation) * 1000;
                        const solidLineY = yScale(valueScale(solidLineValue));
                        console.info("The solidLine Y value is: ", solidLineY);

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
        }

    }, [USStateNum, userSelectedRiskLevelModel, userSelectedWeek, groundTruthData, predictionsData, locationData, thresholdsData]);

    return (
        <svg ref={svgRef} width="70%" height="100%"/>
    );
};

export default RiskLevelThermometer;