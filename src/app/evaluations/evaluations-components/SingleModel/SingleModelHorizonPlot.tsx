'use client'

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { subWeeks } from "date-fns";

import { modelColorMap } from "../../../interfaces/epistorm-constants";
import {
    DataPoint,
    isUTCDateEqual,
    ModelPrediction,
    PredictionDataPoint
} from "../../../interfaces/forecast-interfaces";
import { useAppDispatch, useAppSelector } from "../../../Store/hooks";
import { useResponsiveSVG } from "../../../interfaces/responsiveSVG";

interface HoverData {
    date: Date;
    median: number;
    quantile05: number;
    quantile25: number;
    quantile75: number;
    quantile95: number;
    groundTruthValue?: number;
}


const SingleModelHorizonPlot: React.FC = () => {
    const { containerRef, dimensions, isResizing } = useResponsiveSVG();
    const svgRef = useRef<SVGSVGElement>(null);

    // Track active event listeners for cleanup
    const eventListenersRef = useRef<{
        overlay?: d3.Selection<any, unknown, null, undefined>;
        tooltip?: d3.Selection<SVGGElement, unknown, null, undefined>;
    }>({});


    // Get the ground and prediction data from store
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    // console.debug("DEBUG: SingleModelHorizonPlot.tsx: groundTruthData", groundTruthData);

    const predictionsData = useAppSelector((state) => state.predictions.data);

    const {
        evaluationsSingleModelViewSelectedStateCode,
        evaluationsSingleModelViewDateStart,
        evaluationSingleModelViewDateEnd,
        evaluationsSingleModelViewModel,
        evaluationSingleModelViewHorizon,
        // evaluationSingleModelViewSeasonOptions,
    } = useAppSelector((state) => state.evaluationsSingleModelSettings);


    // Function to filter ground truth data by selected state and dates
    function filterGroundTruthData(data: DataPoint[], state: string, dateRange: [Date, Date]): DataPoint[] {
        let filteredData = data.filter((d) => d.stateNum === state);

        // console.debug("DEBUG: SingleModelHorizonPlot.tsx: filterGroundTruthData: filteredData (using state)", filteredData);

        // Filter data by date range
        filteredData = filteredData.filter(
            (d) => d.date >= dateRange[0] && d.date <= dateRange[1]
        );

        return filteredData;
    }

    // Process data function
    function processVisualizationData(
        predictions: ModelPrediction[],
        modelName: string,
        state: string,
        horizon: number,
        dateRange: [Date, Date]
    ) {
        const modelPrediction = predictions.find(model => model.modelName === modelName);
        if (!modelPrediction) return [];

        // Filter predictions for selected state and date range
        const stateData = modelPrediction.predictionData.filter(d =>
            d.stateNum === state &&
            d.referenceDate >= dateRange[0] &&
            d.referenceDate <= dateRange[1]
        );

        // Group by reference date
        const groupedData = d3.group(stateData, d => d.referenceDate.toISOString());

        // Process each group
        return Array.from(groupedData, ([date, group]) => {
            const targetWeekData = group.filter(d => {
                // Calculate expected target date for this horizon
                const expectedTargetDate = new Date(d.referenceDate);
                expectedTargetDate.setDate(expectedTargetDate.getDate() + (horizon * 7));

                // Set both dates to UTC midnight for comparison
                const targetEndUTC = new Date(d.targetEndDate);
                targetEndUTC.setUTCHours(0, 0, 0, 0);
                expectedTargetDate.setUTCHours(0, 0, 0, 0);

                // Calculate weeks between dates
                const weeksDiff = Math.round(
                    (targetEndUTC.getTime() - d.referenceDate.getTime()) /
                    (7 * 24 * 60 * 60 * 1000)
                );

                // Buffer for same-day comparison
                const bufferMs = 2 * 60 * 60 * 1000;
                const timeDiff = Math.abs(targetEndUTC.getTime() - expectedTargetDate.getTime());

                // Only return true if this is exactly the horizon we want
                return timeDiff <= bufferMs && weeksDiff === horizon;
            });

            if (targetWeekData.length === 0) return null;

            const prediction = targetWeekData[0];
            return {
                date: new Date(date),
                median: prediction.confidence500,
                quantile05: prediction.confidence050,
                quantile25: prediction.confidence250,
                quantile75: prediction.confidence750,
                quantile95: prediction.confidence950
            };
        }).filter(d => d !== null);
    }


    function createScalesAndAxes(
        groundTruthData: DataPoint[],
        visualData: any[],
        chartWidth: number,
        chartHeight: number
    ) {
        // Create band scale for x-axis
        const xScale = d3.scaleBand()
            .domain(groundTruthData.map(d => d.date.toISOString()))
            .range([0, chartWidth])
            .padding(0.1);

        // Generate Saturday ticks
        const saturdayTicks = groundTruthData
            .filter(d => d.date.getDay() === 6)
            .map(d => d.date)
            .sort((a, b) => a.getTime() - b.getTime());

        // Create x-axis with same formatting as ForecastChart
        const xAxis = d3.axisBottom(xScale)
            .tickValues(saturdayTicks.map(d => d.toISOString()))  // Convert to ISOString to match domain
            .tickFormat((d: string) => {
                const date = new Date(d);
                const month = d3.timeFormat("%b")(date);
                const day = d3.timeFormat("%d")(date);
                const isFirst = isUTCDateEqual(date, saturdayTicks[0]);  // Use isUTCDateEqual
                const isFirstTickInNewMonth = date.getDate() < 7 && date.getDate() > 0;
                const isNearYearChange = date.getMonth() === 0 && date.getDate() <= 10;

                // Rest of the formatting logic remains the same
                if (chartWidth < 500) {
                    if (isFirst || isFirstTickInNewMonth || isNearYearChange) {
                        return month;
                    } else {
                        return '';
                    }
                } else {
                    if (isFirst || isFirstTickInNewMonth || isNearYearChange) {
                        return `${month}\n${day}`;
                    } else {
                        return day;
                    }
                }
            });


        // Create y scale using all possible values
        const allValues = visualData.flatMap(d => [
            d.quantile05,
            d.quantile25,
            d.median,
            d.quantile75,
            d.quantile95
        ]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(allValues) * 1.1])
            .range([chartHeight, 0]);

        // Create y-axis with same formatting as ForecastChart
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => {
                const val = d.valueOf();
                if (val >= 1000) return d3.format(".2~s")(val);
                if (val >= 100) return d3.format(".0f")(val);
                return d3.format(".1f")(val);
            });

        return { xScale, yScale, xAxis, yAxis };
    }

    function findActualDataRange(
        groundTruthData: DataPoint[],
        predictionsData: ModelPrediction[],
        modelName: string,
        state: string,
        dateRange: [Date, Date]
    ): [Date, Date] {

        // Filter ground truth data for valid entries (with valid admissions, including placeholders)
        const validGroundTruth = groundTruthData.filter(d =>
            d.stateNum === state &&
            d.admissions >= -1 &&
            d.date >= dateRange[0] &&
            d.date <= dateRange[1]
        );

        // Get the model's prediction data
        const modelPrediction = predictionsData.find(model => model.modelName === modelName);
        // Check each date for valid predictions, only dates with predictions are included
        const validPredictions = modelPrediction?.predictionData.filter(d =>
            d.stateNum === state &&
            d.referenceDate >= dateRange[0] &&
            d.referenceDate <= dateRange[1]
        ) || [];

        // Find the earliest and latest dates with actual data, only those that both have valid admission value & has predictions made on that day
        const startDates = [
            validGroundTruth.length > 0 ? validGroundTruth[0].date : dateRange[1],
            validPredictions.length > 0 ? validPredictions[0].referenceDate : dateRange[1]
        ];

        const endDates = [
            validGroundTruth.length > 0 ? validGroundTruth[validGroundTruth.length - 1].date : dateRange[0],
            validPredictions.length > 0 ? validPredictions[validPredictions.length - 1].referenceDate : dateRange[0]
        ];

        // Use max and min to cut the ones missing prediction/admission, and we end up with range with actual concrete data values
        return [
            new Date(Math.max(...startDates.map(d => d.getTime()))),
            new Date(Math.min(...endDates.map(d => d.getTime())))
        ];
    }


    function renderBoxPlot() {
        if (!svgRef.current || !dimensions.width || !dimensions.height) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Get dimensions
        const width = dimensions.width;
        const height = dimensions.height;

        // Calculate margins
        const margin = {
            top: height * 0.04,
            right: Math.max(width * 0.03, 25),
            bottom: height * 0.15,
            left: Math.max(width * 0.05, 60)
        };

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Get data range and filter data
        const [actualStart, actualEnd] = findActualDataRange(
            groundTruthData,
            predictionsData,
            evaluationsSingleModelViewModel,
            evaluationsSingleModelViewSelectedStateCode,
            [evaluationsSingleModelViewDateStart, evaluationSingleModelViewDateEnd]
        );

        const filteredGroundTruth = filterGroundTruthData(
            groundTruthData,
            evaluationsSingleModelViewSelectedStateCode,
            [actualStart, actualEnd]
        );

        const visualizationData = processVisualizationData(
            predictionsData,
            evaluationsSingleModelViewModel,
            evaluationsSingleModelViewSelectedStateCode,
            evaluationSingleModelViewHorizon,
            [actualStart, actualEnd]
        );

        if (visualizationData.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .style("font-family", "var(--font-dm-sans)")
                .text("No data available for selected criteria");
            return;
        }

        // Create scales and chart group
        const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
            filteredGroundTruth,
            visualizationData,
            chartWidth,
            chartHeight
        );

        /* Helper function to wrap x-axis label*/
        function wrap(text, width) {
            text.each(function () {
                var text = d3.select(this), words = text.text().split(/\n+/).reverse(), word, line = [], lineNumber = 0,
                    lineHeight = 1.1, // ems
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

        // Create main chart group
        const chart = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create axes first (bottom layer)
        const xAxisGroup = chart.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .style("font-family", "var(--font-dm-sans)")
            .call(xAxis);

        // Style x-axis ticks
        xAxisGroup
            .selectAll(".tick text")
            .style("text-anchor", "middle")
            .style('font-size', '13px')
            .call(wrap, 20); // 20 is the minimum width to accommodate year number at 1080p 100% zoom view environment, adjust as needed


        const yAxisGroup = chart.append("g")
            .style("font-family", "var(--font-dm-sans)")
            .call(yAxis)
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke-opacity", 0.5)
                .attr("stroke-dasharray", "2,2")
                .attr("x2", chartWidth))
            .style('font-size', '18px');

        // Create container for all visual elements
        const visualContainer = chart.append('g')
            .attr('class', 'visual-container');

        // Create specific groups for different visual elements
        const boxesGroup = visualContainer.append('g').attr('class', 'boxes');
        const linesGroup = visualContainer.append('g').attr('class', 'lines');
        const pointsGroup = visualContainer.append('g').attr('class', 'points');

        // Create hover areas group
        const hoverGroup = visualContainer.append('g')
            .attr('class', 'hover-areas')
            .style('pointer-events', 'all');

        // Create tooltip group (will be raised to top)
        const tooltipGroup = chart.append('g')
            .attr('class', 'horizon-tooltip')
            .style('opacity', 0)
            .style('pointer-events', 'none');

        // Render visualization elements
        visualizationData.forEach(d => {
            const x = xScale(d.date.toISOString());
            if (x === undefined) return;

            const groundTruthValue = filteredGroundTruth.find(g =>
                isUTCDateEqual(g.date, d.date)
            )?.admissions;

            // 90% interval box
            boxesGroup.append("rect")
                .attr("x", x)
                .attr("y", yScale(d.quantile95))
                .attr("width", xScale.bandwidth())
                .attr("height", yScale(d.quantile05) - yScale(d.quantile95))
                .attr("fill", modelColorMap[evaluationsSingleModelViewModel])
                .attr("opacity", 0.3);

            // 50% interval box
            boxesGroup.append("rect")
                .attr("x", x)
                .attr("y", yScale(d.quantile75))
                .attr("width", xScale.bandwidth())
                .attr("height", yScale(d.quantile25) - yScale(d.quantile75))
                .attr("fill", modelColorMap[evaluationsSingleModelViewModel])
                .attr("opacity", 0.6);

            // Median line
            linesGroup.append("line")
                .attr("x1", x)
                .attr("x2", x + xScale.bandwidth())
                .attr("y1", yScale(d.median))
                .attr("y2", yScale(d.median))
                .attr("stroke", modelColorMap[evaluationsSingleModelViewModel])
                .attr("stroke-width", 2);

            // Ground truth point
            if (groundTruthValue && groundTruthValue >= 0) {
                pointsGroup.append("circle")
                    .attr("cx", x + xScale.bandwidth() / 2)
                    .attr("cy", yScale(groundTruthValue))
                    .attr("r", 4)
                    .attr("fill", "white")
                    .attr("stroke", modelColorMap[evaluationsSingleModelViewModel])
                    .attr("stroke-width", 1);
            }

            // Add hover area for this date
            hoverGroup.append("rect")
                .attr("x", x)
                .attr("y", 0)
                .attr("width", xScale.bandwidth())
                .attr("height", chartHeight)
                .attr("fill", "transparent")
                .attr("class", "hover-area")
                .style("cursor", "pointer")
                .style("pointer-events", "all")
                .on("mouseover", function (event) {
                    event.stopPropagation();

                    // Highlight effect
                    d3.select(this)
                        .attr("fill", "white")
                        .attr("opacity", 0.1);

                    // Update tooltip
                    tooltipGroup.selectAll("*").remove();

                    const padding = 12;
                    let currentY = padding;
                    const lineHeight = 24;

                    const background = tooltipGroup.append("rect")
                        .attr("fill", "#333943")
                        .attr("rx", 8)
                        .attr("ry", 8);

                    // Tooltip content
                    const items = [
                        [`Date: ${d.date.toUTCString().slice(5, 16)}`, true],
                        [`Median: ${d.median.toFixed(1)}`, false],
                        [`90% CI: [${d.quantile05.toFixed(1)}, ${d.quantile95.toFixed(1)}]`, false],
                        [`50% CI: [${d.quantile25.toFixed(1)}, ${d.quantile75.toFixed(1)}]`, false]
                    ];

                    if (groundTruthValue !== undefined && groundTruthValue >= 0) {
                        items.push([`Actual: ${groundTruthValue.toFixed(1)}`, false]);
                    }

                    const textElements = items.map(([text, isHeader]) => {
                        const element = tooltipGroup.append("text")
                            .attr("x", padding)
                            .attr("y", currentY + 16)
                            .attr("fill", "white")
                            .style("font-family", "var(--font-dm-sans)")
                            .style("font-size", isHeader ? "14px" : "12px")
                            .style("font-weight", isHeader ? "bold" : "normal")
                            .text(text as string);

                        currentY += lineHeight;
                        return element;
                    });

                    // Calculate tooltip dimensions and position
                    const maxWidth = Math.max(...textElements.map(el => el.node()!.getComputedTextLength()));
                    const [mouseX] = d3.pointer(event);
                    const isRightSide = mouseX < chartWidth / 2;

                    background
                        .attr("width", maxWidth + padding * 2)
                        .attr("height", currentY + padding);

                    const tooltipX = isRightSide ?
                        10 :
                        chartWidth - maxWidth - padding * 2 - 10;

                    tooltipGroup
                        .attr("transform", `translate(${tooltipX}, 10)`)
                        .style("opacity", 1);
                })
                .on("mouseout", function (event) {
                    event.stopPropagation();

                    // Remove highlight
                    d3.select(this)
                        .attr("fill", "transparent");

                    // Hide tooltip
                    tooltipGroup.style("opacity", 0);
                });
        });

        // Ensure tooltip is always on top
        tooltipGroup.raise();
    }

    /* NOTE:
        Horizon Plot should react to changes in these Redux slice variables:
    * - Time (Via Season change, no individual change):
    *   - evaluationsSingleModelViewDateStart: Date
    *   - evaluationSingleModelViewDateEnd: Date
    * - forecast model but UNLIKE Forecast Page, here only a single model can be selected
    *   - evaluationsSingleViewModel: string
    * - evaluationSingleModelViewHorizon: number
    * - evaluationsSingleModelViewSelectedStateCode: string
    *  */
    useEffect(() => {
        if (!isResizing && dimensions.width > 0 && dimensions.height > 0) {
            renderBoxPlot();
        }
    }, [
        dimensions,
        isResizing,
        evaluationsSingleModelViewSelectedStateCode,
        evaluationsSingleModelViewDateStart,
        evaluationSingleModelViewDateEnd,
        evaluationsSingleModelViewModel,
        evaluationSingleModelViewHorizon,
        groundTruthData,
        predictionsData
    ]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className="w-full h-full"
                style={{
                    fontFamily: "var(--font-dm-sans)",
                    visibility: isResizing ? 'hidden' : 'visible'
                }}
                viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
                preserveAspectRatio="xMidYMid meet"
            />
        </div>
    )
};


export default SingleModelHorizonPlot;