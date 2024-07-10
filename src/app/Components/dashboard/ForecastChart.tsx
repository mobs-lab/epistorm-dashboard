// src/app/Components/dashboard/ForecastChart.tsx
'use client';

import React, {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {Axis, BaseType, NumberValue, ScaleLinear, ScaleLogarithmic, ScaleTime} from "d3";
import {useAppSelector} from '../../store/hooks';
import {modelColorMap} from '../../Interfaces/modelColors';
import {DataPoint, ModelPrediction, PredictionDataPoint} from "../../Interfaces/forecast-interfaces";
import InfoButton from "./InfoButton";

const ForecastChart: React.FC = () => {

    const chartInfo = (
        <div>
            <p>The solid line represents surveillance data, while the dashed lines show predictions from different
                models.</p>
            <p>You can hover over the chart to see detailed information for each date.</p>
        </div>
    );

    // reference to svg object
    const svgRef = useRef(null);

    // Get the ground and prediction data from store
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const predictionsData = useAppSelector((state) => state.predictions.data);
    // Get all settings variables from Redux
    const {
        USStateNum, forecastModel, numOfWeeksAhead, dateStart, dateEnd, yAxisScale, confidenceInterval, displayMode,
    } = useAppSelector((state) => state.filter);

    // State Variables that only the component itself needs to keep track of selected week and whether it is loaded
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [userSelectedWeek, setUserSelectedWeek] = useState(new Date());

    // Set up size and margins
    // TODO: Size will be dynamic after layout change
    const width = 1400;
    const height = 648;
    const marginTop = 30;
    const marginBottom = 60;
    const marginLeft = 30;
    const marginRight = 50;
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;


    // Function to filter ground truth data by selected state and dates
    function filterGroundTruthData(data: DataPoint[], state: string, dateRange: [Date, Date]) {
        var filteredGroundTruthDataByState = data.filter((d) => d.stateNum === state);

        // Filter data by extracting those entries that fall within the selected date range
        filteredGroundTruthDataByState = filteredGroundTruthDataByState.filter((d) => d.date >= dateRange[0] && d.date <= dateRange[1]);

        return filteredGroundTruthDataByState;
    }

    function processPredictionData(allPredictions: ModelPrediction[], selectedModels: string[], state: string, selectedWeek: any, weeksAhead: number, confidenceIntervals: string[], displayMode: string) {

        // Create an object to store the prediction data for each selected model
        let modelData = {};

        selectedModels.forEach(modelName => {
            const modelPrediction = allPredictions.find(model => model.modelName === modelName);
            if (modelPrediction) {
                modelData[modelName] = modelPrediction.predictionData.filter(d => d.stateNum === state);
            } else {
                modelData[modelName] = [];
            }
        });

        if (displayMode === "byDate") {
            // First extract the entries with referenceDate that matches userSelectedWeek, but referenceDate is in string format
            // Filter the prediction data by referenceDate and targetEndDate for each model
            let filteredModelData = {};
            Object.entries(modelData).forEach(([modelName, predictionData]) => {

                let filteredByReferenceDate = predictionData.filter(d => d.referenceDate.getFullYear() === selectedWeek.getFullYear() && d.referenceDate.getMonth() === selectedWeek.getMonth() && d.referenceDate.getDate() === selectedWeek.getDate());

                let filteredByTargetEndDate = filteredByReferenceDate.filter(d => {
                    let targetWeek = new Date(selectedWeek);
                    targetWeek.setDate(targetWeek.getDate() + weeksAhead * 7);
                    return d.targetEndDate >= d.referenceDate && d.targetEndDate <= targetWeek;
                });
                filteredModelData[modelName] = filteredByTargetEndDate;
            });

            // Create an object to store the confidence interval data for each model
            let confidenceIntervalData = {};

            // Iterate over each model's predictions
            Object.entries(filteredModelData).forEach(([modelName, modelPredictions]) => {
                confidenceIntervalData[modelName] = [];

                // Check if any confidence intervals are selected
                if (confidenceIntervals.length > 0) {
                    // Iterate over each confidence interval
                    confidenceIntervals.forEach((interval) => {
                        var confidenceIntervalPredictions = modelPredictions.map((d) => {
                            var confidenceLow, confidenceHigh;
                            if (interval === "50") {
                                confidenceLow = d.confidence250;
                                confidenceHigh = d.confidence750;
                            } else if (interval === "90") {
                                confidenceLow = d.confidence050;
                                confidenceHigh = d.confidence950;
                            } else if (interval === "95") {
                                confidenceLow = d.confidence025;
                                confidenceHigh = d.confidence975;
                            }
                            return {
                                ...d,
                                confidence_low: confidenceLow,
                                confidence_high: confidenceHigh,
                                referenceDate: d.referenceDate, // Convert referenceDate to Date object
                                targetEndDate: d.targetEndDate// Convert targetEndDate to Date object
                            };
                        });

                        confidenceIntervalData[modelName].push({
                            interval: interval, data: confidenceIntervalPredictions
                        });
                    });
                } else {
                    // No confidence intervals selected, use the original prediction data
                    confidenceIntervalData[modelName].push({
                        interval: "", data: modelPredictions.map((d) => ({
                            ...d, referenceDate: d.referenceDate, // Convert referenceDate to Date object
                            targetEndDate: d.targetEndDate// Convert targetEndDate to Date object
                        }))
                    });
                }
            });

            return confidenceIntervalData;
        } else if (displayMode === "byHorizon") {
            // TODO: S2: instead of rendering all models, calculate the confidence interval that should overlay on top of the userSelectedWeek
            return {};
        }
    }

    function createScalesAndAxes(ground: DataPoint[], predictions: any, chartWidth: number, chartHeight: number, yAxisScale: string) {

        const maxGroundTruthDate = d3.max(ground, d => d.date) as Date;

        const maxPredictionDate = Object.values(predictions)
            .flatMap((modelData: any) => modelData[0]?.data || [])
            .reduce((maxDate: Date, dataPoint: PredictionDataPoint) => {
                const targetEndDate = new Date(dataPoint.targetEndDate);
                return targetEndDate > maxDate ? targetEndDate : maxDate;
            }, new Date(0));

        const maxDate = d3.max([maxGroundTruthDate, maxPredictionDate]) as Date;

        const xScale = d3.scaleTime()
            .domain([dateStart, maxDate])
            .range([0, chartWidth]);

        // Generate ticks for all Saturdays within the date range
        const allSaturdays = d3.timeDay.range(dateStart, maxDate)
            .filter(d => d.getDay() === 6);

        // Determine the ideal number of ticks
        const idealTickCount = Math.min(Math.max(10, allSaturdays.length), 20);

        // Select evenly spaced Saturdays
        const tickInterval = Math.max(1, Math.floor(allSaturdays.length / idealTickCount));
        const selectedTicks = allSaturdays.filter((_, i) => i % tickInterval === 0);

        const xAxis = d3.axisBottom(xScale)
            .tickValues(selectedTicks)
            .tickFormat((d: Date) => {
                const month = d3.timeFormat("%b")(d);
                const day = d3.timeFormat("%d")(d);
                const year = d.getFullYear();
                const isNearYearChange = (d.getMonth() === 11 && d.getDate() >= 24) || (d.getMonth() === 0 && d.getDate() <= 14);

                return isNearYearChange ? `${year}\n${month}\n${day}` : `${month}\n${day}`;
            });

        // Modify the xAxis to use multi-line labels
        xAxis.tickSize(18) // Increase tick size to accommodate multi-line labels

        //TODO: wrap ticks into two lines


        // Initialize yScale with a default linear scale
        // Update yScale
        let yScale: d3.ScaleSymlog<number, number> | d3.ScaleLinear<number, number>;
        const maxGroundTruthValue = d3.max(ground.filter(d => d.admissions !== -1), d => d.admissions) as number;
        let maxPredictionValue = 0;

        if (predictions && Object.keys(predictions).length > 0) {
            const predictionValues = Object.values(predictions)
                .flatMap((modelData: any) => modelData[0]?.data || [])
                .map((p: any) => p.confidence_high || p.confidence500);

            maxPredictionValue = predictionValues.length > 0 ? d3.max(predictionValues) : 0;
        }

        const maxValue = Math.max(maxGroundTruthValue, maxPredictionValue);

        if (yAxisScale === "linear") {
            yScale = d3.scaleLinear()
                .domain([0, maxValue * 1.1])
                .range([chartHeight, 0]);
        } else {
            const minPositiveValue = d3.min(ground.filter(d => d.admissions > 0), d => d.admissions) || 1;
            yScale = d3.scaleSymlog()
                .domain([0, maxValue * 1.1])
                .constant(minPositiveValue / 2)
                .range([chartHeight, 0]);
        }

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format("~s"))
            .tickSize(-chartWidth);

        if (yAxisScale === "log") {
            yAxis.ticks(10);
        }


        /*let yScale: ScaleLogarithmic<number, number, never> | ScaleLinear<number, number, never>;
        const maxGroundTruthValue = d3.max(ground.filter(d => d.admissions !== -1), d => d.admissions) as number;
        let maxPredictionValue = 0;

        if (predictions && Object.keys(predictions).length > 0) {
            const predictionValues = Object.values(predictions)
                .flatMap((modelData: any) => modelData[0]?.data || [])
                .map((p: any) => p.confidence_high || p.confidence500);

            maxPredictionValue = predictionValues.length > 0 ? d3.max(predictionValues) : 0;
        }

        const maxValue = Math.max(maxGroundTruthValue, maxPredictionValue);


        if (yAxisScale === "linear") {
            yScale = d3.scaleLinear()
                .domain([0, maxValue * 1.1]) // Add 10% padding to the top
                .range([chartHeight, 0]);
        } else if (yAxisScale === "log") {
            const minNonZeroValue = d3.min(ground.filter(d => d.admissions > 0), d => d.admissions) as number;
            yScale = d3.scaleLog()
                .domain([Math.max(0.5, minNonZeroValue / 2), maxValue * 1.05]) // Extend lower bound and add 10% padding to the top
                .range([chartHeight, 0])
                .nice();
        }

        // Create a smart tick generator for y-axis
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format("~s"))
            .tickSize(-chartWidth);

        if (yAxisScale === "log") {
            yAxis.ticks(10, ".0s");
        }

        */
        return {xScale, yScale, xAxis, yAxis};
    }

    function renderGroundTruthData(svg: Selection<BaseType, unknown, HTMLElement, any>, surveillanceData: DataPoint[], xScale: ScaleTime<number, number, never>, yScale: ScaleLogarithmic<number, number, never> | ScaleLinear<number, number, never>, marginLeft: number, marginTop: number) {
        // Remove existing ground truth data paths and circles
        svg.selectAll(".ground-truth-path, .ground-truth-dot").remove();

        const line = d3.line<DataPoint>()
            .defined(d => d.admissions !== -1 || d.admissions === null) // Include placeholder points
            .x(d => xScale(d.date))
            .y(d => d.admissions !== -1 ? yScale(d.admissions) : yScale.range()[0]); // Use bottom of chart for placeholders

        svg.append("path")
            .datum(surveillanceData)
            .attr("class", "ground-truth-path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("d", line)
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);

        // Add circles for ground truth data points (including placeholders)
        svg.selectAll(".ground-truth-dot")
            .data(surveillanceData)
            .enter()
            .append("circle")
            .attr("class", "ground-truth-dot")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => d.admissions !== -1 ? yScale(d.admissions) : yScale.range()[0])
            .attr("r", 3)
            .attr("fill", d => d.admissions !== -1 ? "white" : "transparent")
            .attr("stroke", d => d.admissions !== -1 ? "white" : "none")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);
    }

    function renderPredictionData(svg: d3.Selection<null, unknown, null, undefined>, predictionData: {}, xScale: d3.ScaleTime<number, number, never>, yScale: d3.ScaleLinear<number, number, never>, marginLeft: number, marginTop: number, confidenceInterval: string[], isGroundTruthDataPlaceHolderOnly: boolean) {
        // Remove existing prediction data paths and circles
        svg.selectAll(".prediction-path, .prediction-dot, .confidence-area").remove();

        // Check if predictionData is not empty
        if (Object.keys(predictionData).length > 0) {
            // Get an array of values from the predictionData object
            const predictionDataArray = Object.values(predictionData);

            predictionDataArray.forEach((predictions, index) => {
                if (predictions[0]?.data) {
                    const modelName = Object.keys(predictionData)[index];
                    const modelColor = modelColorMap[modelName] || `hsl(${index * 60}, 100%, 50%)`;

                    // Render prediction data points
                    const line = d3.line<any>()
                        .x(d => xScale(new Date(d.targetEndDate)))
                        .y(d => yScale(d.confidence500));

                    if (isGroundTruthDataPlaceHolderOnly) {
                        // If there is only a placeholder data point, render the prediction data as its own branch
                        svg.append("path")
                            .datum(predictions[0].data)
                            .attr("class", "prediction-path")
                            .attr("fill", "none")
                            .attr("stroke", modelColor)
                            .attr("stroke-width", 1.5)
                            .attr("d", line)
                            .attr("transform", `translate(${marginLeft}, ${marginTop})`);
                    } else {
                        // Render prediction data points as usual
                        svg.append("path")
                            .datum(predictions[0].data)
                            .attr("class", "prediction-path")
                            .attr("fill", "none")
                            .attr("stroke", modelColor)
                            .attr("stroke-width", 1.5)
                            .attr("d", line)
                            .attr("transform", `translate(${marginLeft}, ${marginTop})`);

                        // Add circles for prediction data points
                        svg.selectAll(`.prediction-dot-${index}`)
                            .data(predictions[0].data)
                            .enter()
                            .append("circle")
                            .attr("class", `prediction-dot prediction-dot-${index}`)
                            .attr("cx", d => xScale(new Date(d.targetEndDate)))
                            .attr("cy", d => yScale(d.confidence500))
                            .attr("r", 3)
                            .attr("fill", modelColor)
                            .attr("transform", `translate(${marginLeft}, ${marginTop})`);
                    }
                }
            });


            // Render confidence intervals separately
            predictionDataArray.forEach((predictions, index) => {
                if (predictions[0]?.data) {
                    const modelName = Object.keys(predictionData)[index];
                    const modelColor = modelColorMap[modelName] || `hsl(${index * 60}, 100%, 50%)`;

                    predictions.forEach((confidenceIntervalData) => {
                        const area = d3.area<any>()
                            .x(d => xScale(new Date(d.targetEndDate)))
                            .y0(d => yScale(d.confidence_low))
                            .y1(d => yScale(d.confidence_high));

                        const opacity = confidenceIntervalData.interval === "50" ? 0.32 : confidenceIntervalData.interval === "90" ? 0.2 : confidenceIntervalData.interval === "95" ? 0.1 : 1;

                        const color = d3.color(modelColor);
                        color.opacity = opacity;

                        svg.append("path")
                            .datum(confidenceIntervalData.data)
                            .attr("class", "confidence-area")
                            .attr("fill", color.toString())
                            .attr("d", area)
                            .attr("transform", `translate(${marginLeft}, ${marginTop})`)
                            .attr("pointer-events", "none");
                    });
                }
            });
        }
    }


    function renderVerticalIndicator(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, xScale: d3.ScaleTime<number, number>, marginLeft: number, marginTop: number, height: number, marginBottom: number) {
        const group = svg.append("g").attr("class", "vertical-indicator-group");

        const line = group.append("line")
            .attr("class", "vertical-indicator")
            .attr("stroke", "gray")
            .attr("stroke-width", 0.8)
            .attr("y1", marginTop)
            .attr("y2", height - marginBottom);

        const tooltip = group.append("text")
            .attr("class", "line-tooltip")
            .attr("fill", "white")
            .attr("font-size", 12)
            .attr("text-anchor", "end")
            .attr("y", marginTop + 5);

        return {group, line, tooltip};
    }

    function updateVerticalIndicator(date: Date, xScale: d3.ScaleTime<number, number>, marginLeft: number, chartWidth: number, group: d3.Selection<SVGGElement, unknown, null, undefined>, tooltip: d3.Selection<SVGTextElement, unknown, null, undefined>) {
        const xPosition = xScale(date);
        const epiweek = getEpiweek(date);
        const isLeftSide = xPosition < chartWidth / 5;

        group.attr("transform", `translate(${xPosition + marginLeft}, 0)`);

        group.select("line")
            .attr("stroke", "lightgray")
            .attr("stroke-width", 2);

        tooltip
            .attr("x", isLeftSide ? 5 : -5)
            .attr("text-anchor", isLeftSide ? "start" : "end")
            .text(`${date.toLocaleDateString()} (Week ${epiweek})`)
            .attr("fill", "white");
    }

    function getEpiweek(date: Date): number {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    }

    function createMouseFollowLine(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, marginLeft: number, marginTop: number, height: number, marginBottom: number) {
        return svg.append("line")
            .attr("class", "mouse-follow-line")
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("y1", marginTop)
            .attr("y2", height - marginBottom)
            .style("opacity", 0);
    }

    function createCornerTooltip(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, marginLeft: number, marginTop: number, chartWidth: number) {
        return svg.append("g")
            .attr("class", "corner-tooltip")
            .attr("transform", `translate(${marginLeft}, ${marginTop + 20})`);
    }

    function updateCornerTooltip(data: DataPoint, groundTruthData: DataPoint[], predictionData: any, xScale: d3.ScaleTime<number, number>, chartWidth: number, marginLeft: number, marginTop: number, cornerTooltip: d3.Selection<SVGGElement, unknown, null, undefined>) {
        cornerTooltip.selectAll("*").remove();

        const padding = 10;
        const lineHeight = 20;
        let currentY = padding;
        let maxWidth = 0;

        // Background rectangle (we'll set its size after calculating content)
        const background = cornerTooltip.append("rect")
            .attr("fill", "rgba(40,5,5,0.8)")
            .attr("rx", 5)
            .attr("ry", 5);

        // Add admissions data
        const admissionsText = cornerTooltip.append("text")
            .attr("x", padding)
            .attr("y", currentY)
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .text(`Admissions: ${data.admissions !== null && data.admissions !== -1 ? data.admissions : "N/A"}`);

        maxWidth = Math.max(maxWidth, admissionsText.node().getComputedTextLength());
        currentY += lineHeight;

        // Find prediction data for the current date
        const currentPredictions = findPredictionsForDate(predictionData, data.date);

        if (currentPredictions) {
            Object.entries(currentPredictions).forEach(([modelName, modelData]: [string, any]) => {
                // Color rectangle for the model
                cornerTooltip.append("rect")
                    .attr("x", padding)
                    .attr("y", currentY - 10)
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", modelColorMap[modelName]);

                const modelText = cornerTooltip.append("text")
                    .attr("x", padding + 15)
                    .attr("y", currentY)
                    .attr("fill", "white")
                    .attr("font-weight", "bold")
                    .text(modelName);

                maxWidth = Math.max(maxWidth, modelText.node().getComputedTextLength() + 15);
                currentY += lineHeight;

                const medianText = cornerTooltip.append("text")
                    .attr("x", padding + 15)
                    .attr("y", currentY)
                    .attr("fill", "white")
                    .text(`Median: ${modelData.confidence500.toFixed(2)}`);

                maxWidth = Math.max(maxWidth, medianText.node().getComputedTextLength() + 15);
                currentY += lineHeight;

                confidenceInterval.forEach((interval) => {
                    const lowKey = `confidence${interval === "50" ? "250" : interval === "90" ? "050" : "025"}`;
                    const highKey = `confidence${interval === "50" ? "750" : interval === "90" ? "950" : "975"}`;

                    const ciText = cornerTooltip.append("text")
                        .attr("x", padding + 15)
                        .attr("y", currentY)
                        .attr("fill", "white")
                        .text(`${interval}% CI: [${modelData[lowKey].toFixed(2)}, ${modelData[highKey].toFixed(2)}]`);

                    maxWidth = Math.max(maxWidth, ciText.node().getComputedTextLength() + 15);
                    currentY += lineHeight;
                });

                currentY += lineHeight / 2; // Add extra space between models
            });
        }

        // Set background rectangle size and position
        background
            .attr("width", maxWidth + padding * 2)
            .attr("height", currentY + padding);

        // Position the tooltip
        const xPosition = xScale(data.date);
        const isLeftSide = xPosition < chartWidth / 2;
        const tooltipX = isLeftSide ? chartWidth - maxWidth - padding * 2 : 0;
        const tooltipY = marginTop;

        cornerTooltip
            .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
            .style("opacity", 1);
    }

    /*
        function updatePredictionTooltip(data: any, xScale: d3.ScaleTime<number, number>, yScale: d3.ScaleLinear<number, number>, chartWidth: number, marginLeft: number, marginTop: number, tooltip: d3.Selection<SVGGElement, unknown, null, undefined>) {
            const x = xScale(new Date(Object.values(data)[0].targetEndDate));
            const y = yScale(Object.values(data)[0].confidence500);

            tooltip.style("opacity", 1);
            tooltip.attr("transform", `translate(${x}, ${y})`);

            tooltip.selectAll("*").remove();

            let currentY = 0;
            const lineHeight = 20;
            const tooltipWidth = 300;
            const tooltipPadding = 10;
            const lineGap = 10;

            // Calculate the total height of the tooltip based on the number of models and confidence intervals
            const totalLines = Object.keys(data).reduce((acc, modelName) => acc + confidenceInterval.length + 1, 0);
            const tooltipHeight = totalLines * lineHeight + (Object.keys(data).length - 1) * lineGap + tooltipPadding * 2;

            // Create a rectangular background for the tooltip
            tooltip.append("rect")
                .attr("x", -tooltipWidth / 2)
                .attr("y", -tooltipPadding)
                .attr("width", tooltipWidth)
                .attr("height", tooltipHeight + tooltipPadding * 2)
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("rx", 5)
                .attr("ry", 5);

            Object.entries(data).forEach(([modelName, modelData]: [string, any], index) => {
                tooltip.append("text")
                    .attr("x", -tooltipWidth / 2 + tooltipPadding)
                    .attr("y", currentY + 5)
                    .attr("font-size", "12px")
                    .attr("font-weight", "bold")
                    .text(`${modelName}`);
                currentY += lineHeight;

                tooltip.append("text")
                    .attr("x", -tooltipWidth / 2 + tooltipPadding * 2)
                    .attr("y", currentY)
                    .attr("font-size", "12px")
                    .text(`${modelData.confidence500.toFixed(2)}`);
                currentY += lineHeight;

                confidenceInterval.forEach((interval) => {
                    const lowKey = `confidence${interval === "50" ? "250" : interval === "90" ? "050" : "025"}`;
                    const highKey = `confidence${interval === "50" ? "750" : interval === "90" ? "950" : "975"}`;

                    tooltip.append("text")
                        .attr("x", -tooltipWidth / 2 + tooltipPadding * 3)
                        .attr("y", currentY)
                        .attr("font-size", "12px")
                        .text(`${interval}% CI: [${modelData[lowKey].toFixed(2)}, ${modelData[highKey].toFixed(2)}]`);
                    currentY += lineHeight;
                });

                if (index < Object.keys(data).length - 1) {
                    currentY += lineGap;
                }
            });

            const isLeftSide = x > chartWidth / 2;
            const tooltipX = isLeftSide ? x - tooltipWidth - 10 : x + 10;
            const tooltipY = y - tooltipHeight / 2;

            tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
        }
    */


    function findPredictionsForDate(predictionData: any, date: Date) {
        const predictions = {};
        Object.entries(predictionData).forEach(([modelName, modelPredictions]: [string, any]) => {
            const prediction = modelPredictions[0].data.find((p: any) => new Date(p.targetEndDate).getTime() === date.getTime());
            if (prediction) {
                predictions[modelName] = prediction;
            }
        });
        return Object.keys(predictions).length > 0 ? predictions : null;
    }

    function createEventOverlay(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number) {
        return svg.append("rect")
            .attr("class", "event-overlay")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .style("fill", "none")
            .style("pointer-events", "all");
    }

    function appendAxes(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, xAxis: Axis<NumberValue>, yAxis: Axis<NumberValue>, xScale: d3.ScaleTime<number, number, never>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number, dateStart: Date, dateEnd: Date) {
        // Append x-axis
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(${marginLeft}, ${chartHeight + marginTop})`)
            .call(xAxis);

        function wrap(text, width) {
            text.each(function () {
                var text = d3.select(this),
                    words = text.text().split(/\n+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.1, // ems
                    y = text.attr("y"),
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
        }

        // Style x-axis ticks
        xAxisGroup.selectAll(".tick text")
            .style("text-anchor", "middle")
            .attr("dy", "1em")
            .call(wrap, 25); // 30 is the maximum width for the text, adjust as needed

        // Add year labels if the date range is more than a year
        const timeDiff = dateEnd.getTime() - dateStart.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff > 365) {
            const years = d3.timeYear.range(dateStart, dateEnd);
            years.push(dateEnd); // Add the end date to ensure the last year is labeled

            xAxisGroup.selectAll(".year-label")
                .data(years)
                .enter()
                .append("text")
                .attr("class", "year-label")
                .attr("x", d => xScale(d))
                .attr("y", 30)
                .attr("text-anchor", "middle")
                .text(d => d.getFullYear());
        }

        // Append y-axis
        svg.append("g")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`)
            .call(yAxis)
            .call(g => g.select(".domain").remove()) // Remove the y-axis line
            .call(g => g.selectAll(".tick line")
                .attr("stroke-opacity", 0.5)
                .attr("stroke-dasharray", "2,2"));
    }

    function findNearestDataPoint(data: DataPoint[], targetDate: Date): DataPoint {
        return data.reduce((prev, curr) => {
            const prevDiff = Math.abs(prev.date.getTime() - targetDate.getTime());
            const currDiff = Math.abs(curr.date.getTime() - targetDate.getTime());
            return currDiff < prevDiff ? curr : prev;
        });
    }

    function renderMessage(svg: d3.Selection<null, unknown, null, undefined>, message: string, chartWidth: number, chartHeight: number, marginLeft: number, marginTop: number) {
        svg.selectAll(".message").remove();

        svg.append("text")
            .attr("class", "message")
            .attr("x", chartWidth / 2 + marginLeft)
            .attr("y", chartHeight / 2 + marginTop)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(message);
    }

    function createCombinedDataset(groundTruthData: DataPoint[], predictionData: any): DataPoint[] {
        let combinedData = [...groundTruthData];

        Object.values(predictionData).forEach((modelPredictions: any) => {
            modelPredictions[0].data.forEach((prediction: any) => {
                const existingPoint = combinedData.find(d => d.date.getTime() === new Date(prediction.targetEndDate).getTime());
                if (!existingPoint) {
                    combinedData.push({
                        date: new Date(prediction.targetEndDate),
                        admissions: null,
                        stateNum: groundTruthData[0].stateNum,
                        stateName: groundTruthData[0].stateName,
                        isPrediction: true
                    });
                }
            });
        });

        return combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    function renderChartComponents(svg: d3.Selection<BaseType, unknown, null, undefined>, filteredGroundTruthData: DataPoint[], processedPredictionData: any, xScale: d3.ScaleTime<number, number>, yScale: d3.ScaleLinear<number, number>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number, height: number, marginBottom: number) {
        const combinedData = createCombinedDataset(filteredGroundTruthData, processedPredictionData);

        const mouseFollowLine = createMouseFollowLine(svg, marginLeft, marginTop, height, marginBottom);
        const {
            group: verticalIndicatorGroup,
            line: verticalIndicator,
            tooltip: lineTooltip
        } = renderVerticalIndicator(svg, xScale, marginLeft, marginTop, height, marginBottom);
        const cornerTooltip = createCornerTooltip(svg, marginLeft, marginTop, chartWidth);
        const eventOverlay = createEventOverlay(svg, marginLeft, marginTop, chartWidth, chartHeight);

        let isDragging = false;

        function updateFollowLine(event: any) {
            const [mouseX] = d3.pointer(event);
            const date = xScale.invert(mouseX - marginLeft);
            const closestData = findNearestDataPoint(combinedData, date);

            const snappedX = xScale(closestData.date);
            mouseFollowLine
                .attr("transform", `translate(${snappedX + marginLeft}, 0)`)
                .style("opacity", 1);

            updateCornerTooltip(closestData, filteredGroundTruthData, processedPredictionData, xScale, chartWidth, marginLeft, marginTop, cornerTooltip);
        }

        function updateVerticalIndicatorPosition(event: any) {
            const [mouseX] = d3.pointer(event);
            const date = xScale.invert(mouseX - marginLeft);
            const closestData = findNearestDataPoint(combinedData, date);

            updateVerticalIndicator(closestData.date, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
        }

        function handleMouseMove(event: any) {
            updateFollowLine(event);
            if (isDragging) {
                updateVerticalIndicatorPosition(event);
            }
        }

        function handleClick(event: any) {
            const [mouseX] = d3.pointer(event);
            const date = xScale.invert(mouseX - marginLeft);
            const closestData = findNearestDataPoint(combinedData, date);

            setUserSelectedWeek(closestData.date);
            updateVerticalIndicator(closestData.date, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
        }

        function handleMouseDown(event: any) {
            isDragging = true;
            updateVerticalIndicatorPosition(event);
        }

        function handleMouseUp() {
            isDragging = false;
        }

        function handleMouseOut() {
            mouseFollowLine.style("opacity", 0);
            cornerTooltip.style("opacity", 0);
            if (isDragging) {
                isDragging = false;
            }
        }

        eventOverlay
            .on("mousemove", handleMouseMove)
            .on("mouseout", handleMouseOut)
            .on("click", handleClick)
            .on("mousedown", handleMouseDown)
            .on("mouseup", handleMouseUp);

        return {mouseFollowLine, verticalIndicatorGroup, lineTooltip, cornerTooltip};
    }

    function throttle(func: Function, limit: number) {
        let inThrottle: boolean;
        return function (this: any, ...args: any[]) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }


    useEffect(() => {
        console.log("DEBUG: ForecastChart useEffect executed.");


        if (svgRef.current && groundTruthData.length > 0) {
            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();

            const filteredGroundTruthData = filterGroundTruthData(groundTruthData, USStateNum, [dateStart, dateEnd]);

            if (!initialDataLoaded) {
                const latestDate = d3.max(filteredGroundTruthData, d => d.date) as Date;
                setUserSelectedWeek(latestDate);
                setInitialDataLoaded(true);
            }

            const allPlaceholders = filteredGroundTruthData.every(d => d.admissions === -1);

            if (allPlaceholders) {
                renderMessage(svg, "Not enough data loaded, please extend date range", chartWidth, chartHeight, marginLeft, marginTop);
            } else {
                // TODO: instead of dateEnd, use the latest date in both ground truth and prediction data
                if (userSelectedWeek < dateStart || userSelectedWeek > dateEnd) {
                    const closestDataPoint = findNearestDataPoint(filteredGroundTruthData, userSelectedWeek);
                    setUserSelectedWeek(closestDataPoint.date);
                }

                const processedPredictionData = processPredictionData(predictionsData, forecastModel, USStateNum, userSelectedWeek, numOfWeeksAhead, confidenceInterval, displayMode);

                const {
                    xScale, yScale, xAxis, yAxis
                } = createScalesAndAxes(filteredGroundTruthData, processedPredictionData, chartWidth, chartHeight, yAxisScale);

                renderGroundTruthData(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop);
                renderPredictionData(svg, processedPredictionData, xScale, yScale, marginLeft, marginTop, confidenceInterval, false);
                appendAxes(svg, xAxis, yAxis, xScale, marginLeft, marginTop, chartWidth, chartHeight, dateStart, dateEnd);

                const {
                    mouseFollowLine, verticalIndicatorGroup, lineTooltip, cornerTooltip
                } = renderChartComponents(svg, filteredGroundTruthData, processedPredictionData, xScale, yScale, marginLeft, marginTop, chartWidth, chartHeight, height, marginBottom);


                updateVerticalIndicator(userSelectedWeek || filteredGroundTruthData[0].date, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
            }
        }
    }, [groundTruthData, predictionsData, USStateNum, forecastModel, numOfWeeksAhead, dateStart, dateEnd, yAxisScale, confidenceInterval, displayMode, userSelectedWeek]);


// Return the SVG object using reference
    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Forecast Chart</h2>
                <InfoButton title="Forecast Chart Information" content={chartInfo}/>
            </div>
            <svg ref={svgRef} width={width} height={height}></svg>
        </div>
    );
};

export default ForecastChart;
