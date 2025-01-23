import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import {useAppSelector} from '../../../store/hooks';
import {isUTCDateEqual} from '../../../Interfaces/forecast-interfaces';

interface ScoreDataPoint {
    referenceDate: Date;
    score: number;
}

const SingleModelScoreLineChart: React.FC = () => {
        const chartRef = useRef<SVGSVGElement>(null);

        // Get data and settings from Redux
        const evaluationsScoreData = useAppSelector((state) => state.evaluationsSingleModelScoreData.data);
        const {
            evaluationSingleModelViewModel,
            evaluationsSingleModelViewSelectedStateCode,
            evaluationsSingleModelViewDateStart,
            evaluationSingleModelViewDateEnd,
            evaluationSingleModelViewScoresOption,
            evaluationSingleModelViewHorizon
        } = useAppSelector((state) => state.evaluationsSingleModelSettings);

        const chartColor = '#4a9eff';

        function findActualDateRange(data: any[]): [Date, Date] {
            if (!data || data.length === 0) return [evaluationsSingleModelViewDateStart, evaluationSingleModelViewDateEnd];

            const validDates = data
                .filter(d => d.score !== undefined && !isNaN(d.score))
                .map(d => d.referenceDate);

            const start = new Date(Math.max(
                d3.min(validDates) || evaluationsSingleModelViewDateStart.getTime(),
                evaluationsSingleModelViewDateStart.getTime()
            ));
            const end = new Date(Math.min(
                d3.max(validDates) || evaluationSingleModelViewDateEnd.getTime(),
                evaluationSingleModelViewDateEnd.getTime()
            ));

            return [start, end];
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
                .attr('y', margin.top - 5);

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

        function renderChart() {
            if (!chartRef.current) return;

            const svg = d3.select(chartRef.current);
            svg.selectAll('*').remove();

            // Get dimensions and set margins
            const width = chartRef.current.clientWidth;
            const height = chartRef.current.clientHeight;

            const margin = {
                top: height * 0.05,
                right: width * 0.02,
                bottom: height * 0.1,
                left: width * 0.05  // Increased for axis labels
            };

            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;

            // Filter data
            const filteredData = evaluationsScoreData
                .find(d => d.modelName === evaluationSingleModelViewModel &&
                    d.scoreMetric === evaluationSingleModelViewScoresOption)
                ?.scoreData.filter(d =>
                    d.location === evaluationsSingleModelViewSelectedStateCode &&
                    d.referenceDate >= evaluationsSingleModelViewDateStart &&
                    d.referenceDate <= evaluationSingleModelViewDateEnd &&
                    d.horizon == evaluationSingleModelViewHorizon
                ) || [];

            console.debug("Evaluations: SingleModelScoreLineChart.tsx: renderChart(): filteredData after applying all filters: ", filteredData);

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

            // Find actual date range
            const [actualStart, actualEnd] = findActualDateRange(filteredData);

            // Create scales
            const xScale = d3.scaleTime()
                .domain([actualStart, actualEnd])
                .range([0, chartWidth]);

            // Calculate y-scale domain
            const scores = filteredData.map(d => d.score);
            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);
            const yDomain = evaluationSingleModelViewScoresOption === 'MAPE' ?
                [0, maxScore * 1.1] :  // For MAPE, start at 0
                [Math.min(minScore, 1.0 - (maxScore - 1.0)),
                    Math.max(maxScore, 1.0 + (1.0 - minScore))]; // For WIS_ratio, center around 1.0

            const yScale = d3.scaleLinear()
                .domain(yDomain)
                .range([chartHeight, 0])
                .nice();

            // Create chart group
            const chart = svg
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Draw reference line at y = 1 for WIS_ratio
            if (evaluationSingleModelViewScoresOption === 'WIS_Ratio') {
                chart.append('line')
                    .attr('x1', 0)
                    .attr('x2', chartWidth)
                    .attr('y1', yScale(1))
                    .attr('y2', yScale(1))
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4,4')
                    .attr('opacity', 0.5);
            }

            // Create line
            const line = d3.line<any>()
                .defined(d => !isNaN(d.score))
                .x(d => xScale(d.referenceDate))
                .y(d => yScale(d.score));

            // Draw line
            chart.append('path')
                .datum(filteredData)
                .attr('fill', 'none')
                .attr('stroke', chartColor)
                .attr('stroke-width', 2)
                .attr('d', line);

            // Draw points
            chart.selectAll('circle')
                .data(filteredData)
                .enter()
                .append('circle')
                .attr('cx', d => xScale(d.referenceDate))
                .attr('cy', d => yScale(d.score))
                .attr('r', 4)
                .attr('fill', chartColor);

            // Create axes
            const xAxis = d3.axisBottom(xScale)
                .tickValues(d3.timeDay.range(actualStart, actualEnd, 7))
                .tickFormat((d: Date) => {
                    const month = d3.timeFormat('%b')(d);
                    const day = d3.timeFormat('%d')(d);
                    const year = d.getUTCFullYear();
                    const isFirst = isUTCDateEqual(d, actualStart);
                    const isNearYearChange = d.getMonth() === 0 && d.getDate() <= 7;

                    return isFirst || isNearYearChange ?
                        `${year}\n${month}\n${day}` :
                        `${month}\n${day}`;
                });

            const yAxis = d3.axisLeft(yScale)
                .tickFormat((d: number) =>
                    evaluationSingleModelViewScoresOption === 'MAPE' ?
                        `${d.toFixed(1)}%` :
                        d.toFixed(2)
                );

            // Add axes
            chart.append('g')
                .attr('transform', `translate(0,${chartHeight})`)
                .style('font-family', 'var(--font-dm-sans)')
                .call(xAxis)
                .selectAll('text')
                .style('text-anchor', 'middle');

            chart.append('g')
                .style('font-family', 'var(--font-dm-sans)')
                .call(yAxis)
                .call(g => g.select('.domain').remove())
                .call(g => g.selectAll('.tick line')
                    .attr('stroke-opacity', 0.5)
                    .attr('stroke-dasharray', '2,2')
                    .attr('x2', chartWidth));

            // Add interactivity
            const {
                mouseFollowLine,
                indicatorGroup,
                dateLabel,
                cornerTooltip,
                eventOverlay
            } = createInteractiveElements(svg, margin, chartWidth, chartHeight);

            // Add interaction handlers
            let isDragging = false;

            function findClosestDataPoint(mouseX: number): ScoreDataPoint | null {
                const date = xScale.invert(mouseX - margin.left);
                const bisect = d3.bisector((d: ScoreDataPoint) => d.referenceDate).left;
                const index = bisect(filteredData, date);

                if (index >= filteredData.length) return filteredData[filteredData.length - 1];
                if (index === 0) return filteredData[0];

                const left = filteredData[index - 1];
                const right = filteredData[index];

                return date.getTime() - left.referenceDate.getTime() >
                right.referenceDate.getTime() - date.getTime() ? right : left;
            }

            function updateVisuals(event: any) {
                const [mouseX] = d3.pointer(event);
                const dataPoint = findClosestDataPoint(mouseX);

                if (!dataPoint) return;

                const xPos = xScale(dataPoint.referenceDate) + margin.left;
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

            eventOverlay
                .on('mousemove', updateVisuals)
                .on('mouseout', () => {
                    mouseFollowLine.style('opacity', 0);
                    cornerTooltip.style('opacity', 0);
                    isDragging = false; // Reset drag state when mouse leaves
                    indicatorGroup.style('opacity', 0); // Hide indicator when mouse leaves
                })
                .on('mousedown', (event) => {
                    isDragging = true;
                    // Immediately update visuals when clicking
                    updateVisuals(event);
                    indicatorGroup.style('opacity', 1);
                })
                .on('mouseup', () => {
                    isDragging = false;
                })
                // Add global mouse up handler in case mouse is released outside chart
                .on('mouseleave', () => {
                    isDragging = false;
                });
        }

        useEffect(() => {
                renderChart();
                return () => {
                    // Cleanup event listeners when component unmounts
                    if (chartRef.current) {
                        d3.select(chartRef.current).selectAll('.event-overlay')
                            .on('mousemove', null)
                            .on('mouseout', null)
                            .on('mousedown', null)
                            .on('mouseup', null)
                            .on('mouseleave', null);
                    }
                };
            }, [
                evaluationSingleModelViewModel,
                evaluationsSingleModelViewSelectedStateCode,
                evaluationsSingleModelViewDateStart,
                evaluationSingleModelViewDateEnd,
                evaluationSingleModelViewScoresOption,
                evaluationSingleModelViewHorizon,
                evaluationsScoreData
            ]
        );

        return (
            <div className="w-full h-full">
                <svg
                    ref={chartRef}
                    width="100%"
                    height="100%"
                    className="w-full h-full"
                />
            </div>
        );
    }
;

export default SingleModelScoreLineChart;