import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

import { useAppSelector } from '../../../store/hooks';

import { DataPoint, isUTCDateEqual, ModelPrediction } from '../../../interfaces/forecast-interfaces';
import { useResponsiveSVG } from "../../../interfaces/responsiveSVG";
import { modelColorMap } from "../../../interfaces/epistorm-constants";

interface ScoreDataPoint {
    referenceDate: Date;
    score: number;
}

const SingleModelScoreLineChart: React.FC = () => {
    const { containerRef, dimensions, isResizing } = useResponsiveSVG();
    const chartRef = useRef<SVGSVGElement>(null);
    const isDraggingRef = useRef(false);

    // Get the ground and prediction data-slices from store
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    // console.debug("DEBUG: SingleModelHorizonPlot.tsx: groundTruthData", groundTruthData);

    const predictionsData = useAppSelector((state) => state.predictions.data);
    // Get data-slices and settings from Redux
    const evaluationsScoreData = useAppSelector((state) => state.evaluationsSingleModelScoreData.data);
    const {
        evaluationsSingleModelViewModel,
        evaluationsSingleModelViewSelectedStateCode,
        evaluationsSingleModelViewDateStart,
        evaluationSingleModelViewDateEnd,
        evaluationSingleModelViewScoresOption,
        evaluationSingleModelViewHorizon
    } = useAppSelector((state) => state.evaluationsSingleModelSettings);

    function findActualDataRange(
        groundTruthData: DataPoint[],
        predictionsData: ModelPrediction[],
        modelName: string,
        state: string,
        dateRange: [Date, Date]
    ): [Date, Date] {

        // Filter ground truth data-slices for valid entries (with valid admissions, including placeholders)
        const validGroundTruth = groundTruthData.filter(d =>
            d.stateNum === state &&
            d.admissions >= -1 &&
            d.date >= dateRange[0] &&
            d.date <= dateRange[1]
        );

        // Get the model's prediction data-slices
        const modelPrediction = predictionsData.find(model => model.modelName === modelName);
        // Check each date for valid predictions, only dates with predictions are included
        const validPredictions = modelPrediction?.predictionData.filter(d =>
            d.stateNum === state &&
            d.referenceDate >= dateRange[0] &&
            d.referenceDate <= dateRange[1]
        ) || [];

        // Find the earliest and latest dates with actual data-slices, only those that both have valid admission value & has predictions made on that day
        const startDates = [
            validGroundTruth.length > 0 ? validGroundTruth[0].date : dateRange[1],
            validPredictions.length > 0 ? validPredictions[0].referenceDate : dateRange[1]
        ];

        const endDates = [
            validGroundTruth.length > 0 ? validGroundTruth[validGroundTruth.length - 1].date : dateRange[0],
            validPredictions.length > 0 ? validPredictions[validPredictions.length - 1].referenceDate : dateRange[0]
        ];

        // Use max and min to cut the ones missing prediction/admission, and we end up with range with actual concrete data-slices values
        return [
            new Date(Math.max(...startDates.map(d => d.getTime()))),
            new Date(Math.min(...endDates.map(d => d.getTime())))
        ];
    }

    function createInteractiveElements(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number; right: number; bottom: number; left: number },
        chartWidth: number,
        chartHeight: number
    ) {
        // Mouse follow line
        const mouseFollowLine = svg.append('line')
            .attr('class', 'mouse-follow-line')
            .attr('stroke', 'gray')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '5,5')
            .attr('y1', margin.top)
            .attr('y2', chartHeight + margin.top)
            .style('opacity', 0);

        // Vertical indicator group
        const indicatorGroup = svg.append('g')
            .attr('class', 'vertical-indicator-group')
            .style('opacity', 0);

        indicatorGroup.append('line')
            .attr('class', 'vertical-indicator')
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2)
            .attr('y1', margin.top)
            .attr('y2', chartHeight + margin.top);

        const dateLabel = indicatorGroup.append('text')
            .attr('class', 'date-label')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .style('font-family', 'var(--font-dm-sans)')
            .attr('y', margin.top + 20);

        // Corner tooltip
        const cornerTooltip = svg.append('g')
            .attr('class', 'corner-tooltip')
            .style('opacity', 0);

        // Event capture area
        const eventOverlay = svg.append('rect')
            .attr('class', 'event-overlay')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .style('fill', 'none')
            .style('pointer-events', 'all');

        return {
            mouseFollowLine,
            indicatorGroup,
            dateLabel,
            cornerTooltip,
            eventOverlay
        };
    }

    function updateCornerTooltip(
        tooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: ScoreDataPoint,
        isRightSide: boolean,
        chartWidth: number,
        scoreOption: string
    ) {
        tooltip.selectAll('*').remove();

        const padding = 12;
        const background = tooltip.append('rect')
            .attr('fill', '#333943')
            .attr('rx', 8)
            .attr('ry', 8);

        const dateText = tooltip.append('text')
            .attr('x', padding)
            .attr('y', padding + 12)
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .style('font-family', 'var(--font-dm-sans)')
            .text(`Date: ${data.referenceDate.toUTCString().slice(5, 16)}`);

        const scoreText = tooltip.append('text')
            .attr('x', padding)
            .attr('y', padding + 36)
            .attr('fill', 'white')
            .style('font-family', 'var(--font-dm-sans)')
            .text(`${scoreOption}: ${scoreOption === 'MAPE' ?
                `${data.score.toFixed(1)}%` :
                data.score.toFixed(3)}`);

        const textWidth = Math.max(
            dateText.node()!.getComputedTextLength(),
            scoreText.node()!.getComputedTextLength()
        );

        background
            .attr('width', textWidth + padding * 2)
            .attr('height', 60);

        const tooltipX = isRightSide ?
            chartWidth - textWidth - padding * 2 - 10 :
            10;

        tooltip
            .attr('transform', `translate(${tooltipX}, 10)`)
            .style('opacity', 1);
    }

    function generateSaturdayDates(startDate: Date, endDate: Date): Date[] {
        const dates: Date[] = [];
        let currentDate = new Date(startDate);

        // Move to the first Saturday if not already on one
        while (currentDate.getDay() !== 6) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Generate all Saturdays until end date
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 7);
        }

        return dates;
    }

    function findClosestDataPoint(mouseX: number, xScale: d3.ScaleBand<string>, margin: any, filteredData: ScoreDataPoint[]): ScoreDataPoint | null {

        if (filteredData.length === 0) return null;

        // Adjust mouseX to account for margin
        const adjustedX = mouseX - margin.left;

        // Get all the dates in our scale
        const dates = xScale.domain().map(dateStr => new Date(dateStr));

        // Find the closest date based on x position
        const bandWidth = xScale.bandwidth();
        const step = xScale.step();
        const index = Math.floor(adjustedX / step);

        // Ensure we're within bounds
        if (index < 0) return filteredData[0];
        if (index >= dates.length) return filteredData[filteredData.length - 1];

        // Find the actual data-slices point closest to this date
        const targetDate = dates[index];
        return filteredData.reduce((closest, current) => {
            if (!closest) return current;

            const closestDiff = Math.abs(closest.referenceDate.getTime() - targetDate.getTime());
            const currentDiff = Math.abs(current.referenceDate.getTime() - targetDate.getTime());

            return currentDiff < closestDiff ? current : closest;
        }, null as ScoreDataPoint | null);
    }
    function createScalesAndAxes(
        saturdayDates: Date[],
        filteredData: ScoreDataPoint[],
        chartWidth: number,
        chartHeight: number,
        actualStart: Date,
        scoreOption: string
    ) {
        // Create band scale for x-axis
        const xScale = d3.scaleBand()
            .domain(saturdayDates.map(d => d.toISOString()))
            .range([0, chartWidth])
            .padding(0.1);

        // Calculate y-scale domain
        const scores = filteredData.map(d => d.score);
        const maxScore = Math.max(...scores);
        const yDomain = [0, maxScore * 1.02];

        const yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([chartHeight, 0])
            .nice();

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickValues(saturdayDates.map(d => d.toISOString()))
            .tickFormat((d: string) => {
                const date = new Date(d);
                const month = d3.timeFormat('%b')(date);
                const day = d3.timeFormat('%d')(date);
                const isFirst = isUTCDateEqual(date, actualStart);
                const isFirstTickInNewMonth = date.getDate() < 7 && date.getDate() > 0;
                const isNearYearChange = date.getMonth() === 0 && date.getDate() <= 7;

                if (chartWidth < 500) {
                    if (isFirst || isFirstTickInNewMonth || isNearYearChange) {
                        return month;
                    }
                    return '';
                } else {
                    if (isFirst || isFirstTickInNewMonth || isNearYearChange) {
                        return `${month}\n${day}`;
                    }
                    return day;
                }
            });

        const yAxis = d3.axisLeft(yScale)
            .tickFormat((d: number) => {
                if (scoreOption === 'MAPE') {
                    return d >= 10 ? `${d.toFixed(0)}%` : `${d.toFixed(1)}%`;
                }
                return d.toFixed(1);
            });

        return { xScale, yScale, xAxis, yAxis };
    }

    function updateVisuals(event: any, {
        mouseFollowLine,
        indicatorGroup,
        dateLabel,
        cornerTooltip,
        xScale,
        margin,
        chartWidth,
        filteredData,
        isDragging
    }: {
        mouseFollowLine: d3.Selection<SVGLineElement, unknown, null, undefined>;
        indicatorGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
        dateLabel: d3.Selection<SVGTextElement, unknown, null, undefined>;
        cornerTooltip: d3.Selection<SVGGElement, unknown, null, undefined>;
        xScale: d3.ScaleBand<string>;
        margin: { top: number; right: number; bottom: number; left: number };
        chartWidth: number;
        filteredData: ScoreDataPoint[];
        isDragging: boolean;
    }) {
        const [mouseX] = d3.pointer(event);
        const dataPoint = findClosestDataPoint(mouseX, xScale, margin, filteredData);

        if (!dataPoint) return;

        // Calculate position using the band scale
        const xPos = (xScale(dataPoint.referenceDate.toISOString()) || 0) + xScale.bandwidth() / 2 + margin.left;
        const isRightSide = mouseX < chartWidth / 2;

        mouseFollowLine
            .attr('transform', `translate(${xPos}, 0)`)
            .style('opacity', 1);

        if (isDragging) {
            indicatorGroup
                .attr('transform', `translate(${xPos}, 0)`)
                .style('opacity', 1);

            dateLabel
                .attr('x', isRightSide ? 5 : -5)
                .attr('text-anchor', isRightSide ? 'start' : 'end')
                .text(dataPoint.referenceDate.toUTCString().slice(5, 16));
        }

        updateCornerTooltip(
            cornerTooltip,
            dataPoint,
            isRightSide,
            chartWidth,
            evaluationSingleModelViewScoresOption
        );
    }

    function renderVisualElements(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        filteredData: ScoreDataPoint[],
        xScale: d3.ScaleBand<string>,
        yScale: d3.ScaleLinear<number, number>,
        modelName: string,
        scoreOption: string
    ) {
        // Draw reference line at y = 1 for WIS_ratio
        if (scoreOption === 'WIS_Ratio') {
            chart.append('line')
                .attr('x1', 0)
                .attr('x2', xScale.range()[1])
                .attr('y1', yScale(1))
                .attr('y2', yScale(1))
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,4')
                .attr('opacity', 0.5);
        }

        // Create container for all visual elements
        const visualContainer = chart.append('g')
            .attr('class', 'visual-container');

        // Create specific groups for different visual elements
        const linesGroup = visualContainer.append('g').attr('class', 'lines');
        const pointsGroup = visualContainer.append('g').attr('class', 'points');

        // Modified line generator
        const line = d3.line<ScoreDataPoint>()
            .defined(d => !isNaN(d.score))
            .x(d => (xScale(d.referenceDate.toISOString()) || 0) + xScale.bandwidth() / 2)
            .y(d => yScale(d.score));

        // Draw line
        linesGroup.append('path')
            .datum(filteredData)
            .attr('fill', 'none')
            .attr('stroke', modelColorMap[modelName])
            .attr('stroke-width', 2)
            .attr('d', line);

        // Draw points
        pointsGroup.selectAll('circle')
            .data(filteredData)
            .enter()
            .append('circle')
            .attr('cx', d => (xScale(d.referenceDate.toISOString()) || 0) + xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.score))
            .attr('r', 4)
            .attr('fill', modelColorMap[modelName]);
    }

    function renderChart() {
        if (!chartRef.current || !dimensions.width || !dimensions.height) return;

        const svg = d3.select(chartRef.current);
        svg.selectAll('*').remove();

        // Setup dimensions
        const width = dimensions.width;
        const height = dimensions.height;
        const margin = {
            top: height * 0.04,
            right: Math.max(width * 0.03, 25),
            bottom: height * 0.15,
            left: Math.max(width * 0.05, 60)
        };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Get data-slices range and prepare data-slices
        const [actualStart, actualEnd] = findActualDataRange(
            groundTruthData,
            predictionsData,
            evaluationsSingleModelViewModel,
            evaluationsSingleModelViewSelectedStateCode,
            [evaluationsSingleModelViewDateStart, evaluationSingleModelViewDateEnd]
        );

        const saturdayDates = generateSaturdayDates(actualStart, actualEnd);

        const filteredData = evaluationsScoreData
            .find(d => d.modelName === evaluationsSingleModelViewModel &&
                d.scoreMetric === evaluationSingleModelViewScoresOption)
            ?.scoreData.filter(d =>
                d.location === evaluationsSingleModelViewSelectedStateCode &&
                d.referenceDate >= actualStart &&
                d.referenceDate <= actualEnd &&
                d.horizon == evaluationSingleModelViewHorizon
            ) || [];

        // Handle when no data-slices is present: just display a information
        if (filteredData.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .style('font-family', 'var(--font-dm-sans)')
                .text('No score data available for selected criteria');
            return;
        }

        // Create scales and axes
        const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
            saturdayDates,
            filteredData,
            chartWidth,
            chartHeight,
            actualStart,
            evaluationSingleModelViewScoresOption
        );

        // Create main chart group
        const chart = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Render visual elements
        renderVisualElements(
            chart,
            filteredData,
            xScale,
            yScale,
            evaluationsSingleModelViewModel,
            evaluationSingleModelViewScoresOption
        );
        /* Helper function to wrap x-axis label*/
        function wrap(text, width) {
            text.each(function () {
                var text = d3.select(this), words = text.text().split(/\n+/).reverse(), word, line = [], lineNumber = 0,
                    lineHeight = 1.0, // ems
                    y = text.attr("y"), dy = parseFloat(text.attr("dy")), tspan = text
                        .text(null)
                        .append("tspan")
                        .attr("x", 0)
                        .attr("y", y)
                        .attr("dy", dy + "em");
                while ((word = words.pop())) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text
                            .append("tspan")
                            .attr("x", 0)
                            .attr("y", 0)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
                    }
                }
            });
        }

        // Add axes with styling
        chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .style('font-family', 'var(--font-dm-sans)')
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'middle')
            .style('font-size', '13px')
            .call(wrap, 20);

        chart.append('g')
            .style('font-family', 'var(--font-dm-sans)')
            .call(yAxis)
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line')
                .attr('stroke-opacity', 0.5)
                .attr('stroke-dasharray', '2,2')
                .attr('x2', chartWidth))
            .style('font-size', '18px');

        // Add interactivity
        const interactiveElements = createInteractiveElements(svg, margin, chartWidth, chartHeight);
        const { mouseFollowLine, indicatorGroup, dateLabel, cornerTooltip, eventOverlay } = interactiveElements;

        // Add interaction handlers
        let isDragging = isDraggingRef.current;

        eventOverlay
            .on('mousemove', (event) => {
                const params = {
                    mouseFollowLine,
                    indicatorGroup,
                    dateLabel,
                    cornerTooltip,
                    xScale,
                    margin,
                    chartWidth,
                    filteredData,
                    isDragging
                };
                updateVisuals(event, params);
            })
            .on('mouseout', () => {
                mouseFollowLine.style('opacity', 0);
                // cornerTooltip.style('opacity', 0);
                isDragging = false;
                // indicatorGroup.style('opacity', 0);
            })
            .on('mousedown', (event) => {
                isDraggingRef.current = true;
                isDragging = true;
                const params = {
                    mouseFollowLine,
                    indicatorGroup,
                    dateLabel,
                    cornerTooltip,
                    xScale,
                    margin,
                    chartWidth,
                    filteredData,
                    isDragging
                };
                updateVisuals(event, params);
                indicatorGroup.style('opacity', 1);
            })
            .on('mouseup', () => {
                isDragging = false;
            })
            .on('mouseleave', () => {
                isDragging = false;
            });

        // Ensure tooltip is always on top
        cornerTooltip.raise();
    }

    useEffect(() => {
        if (!isResizing && dimensions.width > 0 && dimensions.height > 0) {
            renderChart();
        }
    }, [
        dimensions,
        isResizing,
        evaluationsSingleModelViewModel,
        evaluationsSingleModelViewSelectedStateCode,
        evaluationsSingleModelViewDateStart,
        evaluationSingleModelViewDateEnd,
        evaluationSingleModelViewScoresOption,
        evaluationSingleModelViewHorizon,
        evaluationsScoreData
    ]
    );

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg
                ref={chartRef}
                width="100%"
                height="100%"
                className="w-full h-full"
                style={{
                    fontFamily: "var(--font-dm-sans)",
                    opacity: isResizing ? 0.5 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
                preserveAspectRatio="xMidYMid meet"
            />
        </div>
    );
};

export default SingleModelScoreLineChart;