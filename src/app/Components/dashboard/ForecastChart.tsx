// components/ForecastChart.tsx
'use client';

import React, {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {Axis, BaseType, NumberValue, ScaleLinear, ScaleLogarithmic, ScaleTime} from "d3";
import {useAppSelector} from '../../store/hooks';
import {modelColorMap} from '../../Interfaces/modelColors';
import {DataPoint, ModelPrediction, PredictionDataPoint} from "../../Interfaces/forecast-interfaces";


const LineChart: React.FC = () => {
    // reference to svg object
    const svgRef = useRef(null);

    // Get the ground and prediction data from store
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const predictionsData = useAppSelector((state) => state.predictions.data);
    // Get all settings variables from Redux
    const {
        USStateNum, forecastModel, numOfWeeksAhead, dateStart, dateEnd, yAxisScale, confidenceInterval, displayMode,
    } = useAppSelector((state) => state.filter);


    // Set up size and margins
    const width = 928;
    const height = 500;
    const marginTop = 10;
    const marginBottom = 50;
    const marginLeft = 50;
    const marginRight = 50;
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;

    //
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [userSelectedWeek, setUserSelectedWeek] = useState(new Date());

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
        /*// Find the maximum date from the ground truth data
        const maxGroundTruthDate = d3.max(ground, d => d.date) as Date;

        // Calculate the end date for the prediction data
        const predictionEndDate = new Date(userSelectedWeek);
        predictionEndDate.setDate(predictionEndDate.getDate() + numOfWeeksAhead * 7);

        // Determine the maximum date between the ground truth data and prediction data
        const maxDate = d3.max([maxGroundTruthDate, predictionEndDate]) as Date;*/

        const maxGroundTruthDate = d3.max(ground, d => d.date) as Date;

        const maxPredictionDate = Object.values(predictions)
            .flatMap((modelData: any) => modelData[0]?.data || [])
            .reduce((maxDate: Date, dataPoint: PredictionDataPoint) => {
                const targetEndDate = new Date(dataPoint.targetEndDate);
                return targetEndDate > maxDate ? targetEndDate : maxDate;
            }, new Date(0));

        const maxDate = d3.max([maxGroundTruthDate, maxPredictionDate]) as Date;

        const xScale = d3.scaleTime()
            .domain([d3.min(ground, d => d.date) as Date, maxDate])
            .range([0, chartWidth]);

        console.log("DEBUG: maxDate", maxDate); //TODO: After testing I found that this produces the correct max Date which is the latest from prediction data (may 25th, 2024) but still the mouse hovering over these prediction data points is not working: the dashed line and corner tooltip are not updating


        // Custom tick format for x-axis
        /*const xAxisTickFormat = (date: Date) => {
            const month = date.toLocaleString('default', {month: 'long'});
            const day = date.getDate();
            return `${month}\n${day}`;
        };*/


        // Initialize yScale with a default linear scale
        // Update yScale
        let yScale: ScaleLogarithmic<number, number, never> | ScaleLinear<number, number, never>;
        const maxGroundTruthValue = d3.max(ground.filter(d => d.admissions !== -1), d => d.admissions) as number;
        let maxPredictionValue = 0;

        if (predictions && Object.keys(predictions).length > 0) {
            const predictionValues = Object.values(predictions)
                .flatMap((modelData: any) => modelData[0]?.data || [])
                .map((p: any) => p.confidence_high || p.confidence500);

            maxPredictionValue = predictionValues.length > 0 ? d3.max(predictionValues) : 0;
        }

        const maxValue = Math.max(maxGroundTruthValue, maxPredictionValue);

        console.log("DEBUG: maxGroundTruthValue", maxGroundTruthValue);
        console.log("DEBUG: maxPredictionValue", maxPredictionValue);
        console.log("DEBUG: maxValue", maxValue);


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
        // Update xAxis based on date range
        const timeDiff = dateEnd.getTime() - dateStart.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        /*// Create a custom x-axis with month labels on the top row and day labels on the bottom row
        const xAxis = d3.axisBottom(xScale)
            .tickFormat((d, i) => {
                const monthFormat = d3.timeFormat("%b"); // Format for month abbreviation
                const dayFormat = d3.timeFormat("%d"); // Format for day of the month
                const monthLabel = monthFormat(d);
                const dayLabel = dayFormat(d);

                // Check if the current tick corresponds to a ground truth data point
                const hasDataPoint = ground.some(dataPoint => dataPoint.date.toDateString() === d.toDateString());

                if (hasDataPoint) {
                    return `${monthLabel}\n${dayLabel}`; // Show both month and day labels
                } else {
                    return monthLabel; // Show only the month label
                }
            });*/

        let xAxis;
        if (daysDiff > 334) {
            xAxis = d3.axisBottom(xScale)
                .ticks(d3.timeMonth.every(1))
                .tickFormat((d: Date) => {
                    const format = d3.timeFormat("%b %Y");
                    return format(d);
                });
        } else if (daysDiff > 90) {
            xAxis = d3.axisBottom(xScale)
                .ticks(d3.timeDay.filter(d => d.getDate() === 1 || d.getDate() === 15))
                .tickFormat((d: Date) => {
                    const format = d3.timeFormat("%b %d");
                    return format(d);
                });
        } else if (daysDiff > 30) {
            xAxis = d3.axisBottom(xScale)
                .ticks(d3.timeDay.filter(d => d.getDay() === 6))
                .tickFormat((d: Date) => {
                    const format = d3.timeFormat("%b %d");
                    return format(d);
                });
        } else {
            xAxis = d3.axisBottom(xScale)
                .ticks(d3.timeDay.every(1))
                .tickFormat((d: Date) => {
                    const format = d3.timeFormat("%b %d");
                    return format(d);
                });
        }

        /*const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format("d"))
            .ticks(yAxisScale === "log" ? Math.min(3, yScale.ticks().length) : undefined);*/

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
            .attr("stroke", "steelblue")
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
            .attr("fill", d => d.admissions !== -1 ? "steelblue" : "transparent")
            .attr("stroke", d => d.admissions !== -1 ? "none" : "steelblue")
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
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("y1", marginTop)
            .attr("y2", height - marginBottom);

        const tooltip = group.append("text")
            .attr("class", "line-tooltip")
            .attr("fill", "black")
            .attr("font-size", 12)
            .attr("text-anchor", "end")
            .attr("y", marginTop + 5);

        return {group, line, tooltip};
    }

    function updateVerticalIndicator(date: Date, xScale: d3.ScaleTime<number, number>, marginLeft: number, chartWidth: number, group: d3.Selection<SVGGElement, unknown, null, undefined>, tooltip: d3.Selection<SVGTextElement, unknown, null, undefined>) {
        const xPosition = xScale(date);
        const epiweek = getEpiweek(date);
        const isLeftSide = xPosition < chartWidth / 5; // Check if in the leftmost 1/5

        group.attr("transform", `translate(${xPosition + marginLeft}, 0)`);

        tooltip
            .attr("x", isLeftSide ? 5 : -5)  // Adjust x based on position
            .attr("text-anchor", isLeftSide ? "start" : "end")  // Adjust text-anchor based on position
            .text(`${date.toLocaleDateString()} (Week ${epiweek})`);
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
        const xPosition = xScale(data.date);
        const isLeftSide = xPosition > chartWidth / 2;
        const textAnchor = isLeftSide ? "start" : "end";
        const x = isLeftSide ? marginLeft + 60 : chartWidth - 10; // Increased left margin
        const yOffset = isLeftSide ? marginTop + 40 : marginTop + 20; // Increased top margin for left side

        cornerTooltip.attr("transform", `translate(${x}, ${yOffset})`);
        cornerTooltip.selectAll("*").remove();

        let currentY = 0;
        const lineHeight = 20;

        // Add admissions data
        cornerTooltip.append("text")
            .attr("y", currentY)
            .attr("text-anchor", textAnchor)
            .attr("font-weight", "bold")
            .text(`Admissions: ${data.admissions !== null ? data.admissions : "N/A"}`);

        currentY += lineHeight;


        // Find prediction data for the current date
        const currentPredictions = findPredictionsForDate(predictionData, data.date);

        if (currentPredictions) {
            Object.entries(currentPredictions).forEach(([modelName, modelData]: [string, any]) => {
                cornerTooltip.append("text")
                    .attr("y", currentY)
                    .attr("text-anchor", textAnchor)
                    .text(`${modelName}: ${modelData.confidence500.toFixed(2)}`);
                currentY += lineHeight;

                if (confidenceInterval.length > 0) {
                    cornerTooltip.append("text")
                        .attr("y", currentY)
                        .attr("text-anchor", textAnchor)
                        .text(`CI: [${modelData.confidence_low.toFixed(2)}, ${modelData.confidence_high.toFixed(2)}]`);
                    currentY += lineHeight;
                }
            });
        }

        cornerTooltip.style("opacity", 1);
    }

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

    function renderChartComponents(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, filteredGroundTruthData: DataPoint[], processedPredictionData: any, xScale: d3.ScaleTime<number, number>, yScale: d3.ScaleLinear<number, number>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number, height: number, marginBottom: number) {

        // Combined ground truth and prediction data for all dates
        const combinedData = createCombinedDataset(filteredGroundTruthData, processedPredictionData);

        const mouseFollowLine = createMouseFollowLine(svg, marginLeft, marginTop, height, marginBottom);
        const {
            group: verticalIndicatorGroup, line: verticalIndicator, tooltip: lineTooltip
        } = renderVerticalIndicator(svg, xScale, marginLeft, marginTop, height, marginBottom);
        const cornerTooltip = createCornerTooltip(svg, marginLeft, marginTop, chartWidth);

        const eventOverlay = createEventOverlay(svg, marginLeft, marginTop, chartWidth, chartHeight);

        function handleMouseMove(event: any) {
            const [mouseX] = d3.pointer(event);
            const date = xScale.invert(mouseX - marginLeft);
            const closestData = findNearestDataPoint(combinedData, date);

            const snappedX = xScale(closestData.date);
            mouseFollowLine
                .attr("transform", `translate(${snappedX + marginLeft}, 0)`)
                .style("opacity", 1);

            updateCornerTooltip(closestData, filteredGroundTruthData, processedPredictionData, xScale, chartWidth, marginLeft, marginTop, cornerTooltip);
        }

        function handleClick(event: any) {
            const [mouseX] = d3.pointer(event);
            const date = xScale.invert(mouseX - marginLeft);
            const closestData = findNearestDataPoint(combinedData, date);

            if (closestData.date.getTime() !== userSelectedWeek.getTime()) {
                setUserSelectedWeek(closestData.date);
                updateVerticalIndicator(closestData.date, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
            }
        }


        function handleMouseOut() {
            mouseFollowLine.style("opacity", 0);
            cornerTooltip.style("opacity", 0);
        }

        eventOverlay
            .on("mousemove", handleMouseMove)
            .on("mouseout", handleMouseOut)
            .on("click", handleClick);

        return {mouseFollowLine, verticalIndicatorGroup, lineTooltip, cornerTooltip};
    }


    function appendAxes(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, xAxis: Axis<NumberValue>, yAxis: Axis<NumberValue>, xScale: d3.ScaleTime<number, number, never>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number, dateStart: Date, dateEnd: Date) {
        // Append x-axis
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(${marginLeft}, ${chartHeight + marginTop})`)
            .call(xAxis);

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


    useEffect(() => {
        console.log("DEBUG: ForecastChart useEffect executed.");

        if (svgRef.current && groundTruthData.length > 0) {
            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();

            const filteredGroundTruthData = filterGroundTruthData(groundTruthData, USStateNum, [dateStart, dateEnd]);

            const allPlaceholders = filteredGroundTruthData.every(d => d.admissions === -1);

            if (allPlaceholders) {
                renderMessage(svg, "Not enough data loaded, please extend date range", chartWidth, chartHeight, marginLeft, marginTop);
            } else {
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

                if (!initialDataLoaded) {
                    const latestDate = d3.max(filteredGroundTruthData, d => d.date) as Date;
                    setUserSelectedWeek(latestDate);
                    setInitialDataLoaded(true);
                }

                updateVerticalIndicator(userSelectedWeek || filteredGroundTruthData[0].date, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
            }
        }
    }, [groundTruthData, predictionsData, USStateNum, forecastModel, numOfWeeksAhead, dateStart, dateEnd, yAxisScale, confidenceInterval, displayMode, userSelectedWeek]);


// Return the SVG object using reference
    return (<svg ref={svgRef} width={width} height={height}></svg>);
};

export default LineChart;
