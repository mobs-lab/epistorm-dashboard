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
    const marginTop = 60;
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


        // Initialize yScale with a default linear scale
        let yScale: ScaleLogarithmic<number, number, never> | ScaleLinear<number, number, never>;

        const maxGroundTruthValue = d3.max(ground.filter(d => d.admissions !== -1), d => d.admissions) as number;
        let maxPredictionValue = maxGroundTruthValue;

        if (predictions && Object.keys(predictions).length > 0) {
            maxPredictionValue = d3.max(Object.values(predictions).flat().map((d: any) => d.data.map((p: any) => p.confidence_high || p.confidence500)).flat()) as number;
        }

        if (maxPredictionValue === undefined) {
            maxPredictionValue = maxGroundTruthValue;
        }
        const maxValue = Math.max(maxGroundTruthValue, maxPredictionValue);

        if (yAxisScale === "linear") {
            yScale = d3.scaleLinear()
                .domain([0, maxValue])
                .range([chartHeight, 0]);
        } else if (yAxisScale === "log") {
            yScale = d3.scaleSymlog()
                .domain([0, maxValue])
                .range([chartHeight, 0])
                .constant(1);

            yScale.ticks = function () {
                const ticks = [0, 1, 3, 5, 10, 30, 50, 100, 300, 500, 1000, 3000, 5000, 10000, 30000, 40000, 50000];
                return ticks.filter((tick) => tick <= maxValue);
            };
        }

        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format("d"))
            .ticks(yAxisScale === "log" ? Math.min(3, yScale.ticks().length) : undefined);

        return {xScale, yScale, xAxis, yAxis};
    }

    function renderGroundTruthData(svg: Selection<BaseType, unknown, HTMLElement, any>, surveillanceData: (DataPoint | {
        date: any; stateNum: string; stateName: string; admissions: null
    })[], xScale: ScaleTime<number, number, never>, yScale: ScaleLogarithmic<number, number, never> | ScaleLinear<number, number, never>, marginLeft: number, marginTop: number) {
        // Remove existing ground truth data paths and circles
        svg.selectAll(".ground-truth-path, .ground-truth-dot").remove();

        const line = d3.line<DataPoint>()
            .defined(d => d.admissions !== -1) // Skip placeholder values for the line
            .x(d => xScale(d.date))
            .y(d => yScale(d.admissions));

        svg.append("path")
            .datum(surveillanceData)
            .attr("fill", "none")
            .attr("stroke", (d) => d.admissions === -1 ? "transparent" : "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line)
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);

        // Add circles for ground truth data points with non-null admissions
        svg.selectAll(".ground-truth-dot")
            .data(surveillanceData)
            .enter()
            .append("circle")
            .attr("class", "ground-truth-dot")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => d.admissions !== -1 ? yScale(d.admissions) : null)
            .attr("r", d => d.admissions !== -1 ? 3 : 0)
            .attr("fill", "steelblue")
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


    function renderVerticalIndicator(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, xScale: ScaleTime<number, number, never>, marginLeft: number, marginTop: number, height: number, marginBottom: number) {
        const verticalIndicator = svg.append("line")
            .attr("class", "vertical-indicator")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("y1", marginTop)
            .attr("y2", height - marginBottom);

        return verticalIndicator;
    }

    function updateVerticalIndicator(date: Date, xScale: ScaleTime<number, number, never>, marginLeft: number, verticalIndicator: d3.Selection<SVGLineElement, unknown, HTMLElement, any>) {
        const xPosition = xScale(date) + marginLeft;
        verticalIndicator
            .attr("transform", `translate(${xPosition}, 0)`)
            .attr("opacity", 1);
    }


    function renderChartComponents(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, filteredGroundTruthData: DataPoint[], xScale: ScaleTime<number, number, never>, yScale: ScaleLinear<number, number, never>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number, verticalIndicator: d3.Selection<SVGLineElement, unknown, HTMLElement, any>) {
        /*const futurePortionRect = svg.append("rect")
            .attr("class", "future-portion-rect")
            .attr("fill", "rgba(30, 50, 50, 0.5)")
            .attr("x", xScale(filteredGroundTruthData[0].date) + marginLeft)
            .attr("y", marginTop)
            .attr("width", 0)
            .attr("height", chartHeight);

        function updateFuturePortionRect(date: Date) {
            const xPosition = xScale(date);
            futurePortionRect.attr("x", xPosition)
                .attr("width", chartWidth - xPosition);
        }*/

        // Append a line for the tooltip
        const tooltipLine = svg.append("line")
            .attr("class", "tooltip-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0)
            .attr("y1", marginTop)
            .attr("y2", height - marginBottom);

        // Append a text for the tooltip
        const tooltipText = svg.append("text")
            .attr("class", "tooltip-text")
            .attr("fill", "black")
            .attr("font-size", 12)
            .attr("opacity", 0);

        // Function to update the tooltip line and its associated text
        function updateTooltip(date: Date, admissions: number) {
            const xPosition = xScale(date) + marginLeft;
            const tooltipWidth = 10; // Adjust this value based on your tooltip's width

            // Calculate the middle date of the visible date range
            const minDate = xScale.domain()[0];
            const maxDate = xScale.domain()[1];
            const middleDate = new Date((minDate.getTime() + maxDate.getTime()) / 2);

            // Check if the selected date is before or equal to the middle date
            if (date <= middleDate) {
                // Position the tooltip on the right side of the visual indicator
                tooltipLine
                    .attr("transform", `translate(${xPosition}, 0)`)
                    .attr("opacity", 1);
                tooltipText
                    .attr("transform", `translate(${xPosition + 10}, ${height - marginBottom - 10})`)
                    .attr("text-anchor", "start")
                    .text(`Date: ${date.toLocaleDateString()}, Admissions: ${admissions !== -1 ? admissions : "N/A"}`)
                    .attr("opacity", 1);
            } else {
                // Position the tooltip on the left side of the visual indicator
                tooltipLine
                    .attr("transform", `translate(${xPosition}, 0)`)
                    .attr("opacity", 1);
                tooltipText
                    .attr("transform", `translate(${xPosition - tooltipWidth - 10}, ${height - marginBottom - 10})`)
                    .attr("text-anchor", "end")
                    .text(`Date: ${date.toLocaleDateString()}, Admissions: ${admissions !== -1 ? admissions : "N/A"}`)
                    .attr("opacity", 1);
            }
        }

        function handleDrag(event: any) {
            const mouseX = d3.pointer(event, this)[0];
            const date = xScale.invert(mouseX);

            let closestData;
            if (date <= dateStart || date >= dateEnd) {
                // If date is outside the range, find the nearest ground truth data point
                closestData = findNearestDataPoint(filteredGroundTruthData, date);
            } else {
                // If date is within the range, find the nearest data point
                closestData = findNearestDataPoint(filteredGroundTruthData, date);
            }

            updateVerticalIndicator(closestData.date, xScale, marginLeft, verticalIndicator);
            setUserSelectedWeek(closestData.date);
        }


        // Unified event overlay for handling mouse events
        const eventOverlay = svg.append("rect")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);

        // Function to handle the end of dragging or clicking
        function onDragEnd(event: any) {
            const mouseX = d3.pointer(event, this)[0];
            const date = xScale.invert(mouseX);

            let closestData;
            if (date <= dateStart || date >= dateEnd) {
                // If date is outside the range, find the nearest ground truth data point
                closestData = findNearestDataPoint(filteredGroundTruthData, date);
            } else {
                // If date is within the range, find the nearest data point
                closestData = findNearestDataPoint(filteredGroundTruthData, date);
            }

            // Call onMouseMove to update the tooltip
            onMouseMove.call(this, event);

            updateVerticalIndicator(closestData.date, xScale, marginLeft, verticalIndicator);
            setUserSelectedWeek(closestData.date);
        }


        // Function to handle mouse movement
        function onMouseMove(event: any) {
            if (!event.active) {  // This checks if the drag event is not active
                const mouseX = d3.pointer(event, this)[0];
                const date = xScale.invert(mouseX);
                const closestData = findNearestDataPoint(filteredGroundTruthData, date);
                updateTooltip(closestData.date, closestData.admissions);
            }
        }

        verticalIndicator
            .call(d3.drag().on("drag", handleDrag))
            .on("click", handleDrag);
        eventOverlay
            .on("mousemove", onMouseMove)
            .on("click", onDragEnd)
            .call(d3.drag().on("end", onDragEnd));


        // Helper function to find the nearest data point
        function findNearestDataPoint(data: DataPoint[], targetDate: Date): DataPoint {
            return data.reduce((prev, curr) => (Math.abs(curr.date - targetDate) < Math.abs(prev.date - targetDate)) ? curr : prev);
        }

    }


    function appendAxes(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, xAxis: Axis<NumberValue>, yAxis: Axis<NumberValue>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number) {
        svg.append("g")
            .attr("transform", `translate(${marginLeft}, ${height - marginBottom})`)
            .call(xAxis);

        svg.append("g")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`)
            .call(yAxis);
    }

    function findNearestDataPoint(data: DataPoint[], targetDate: Date): DataPoint {
        return data.reduce((prev, curr) => (Math.abs(curr.date - targetDate) < Math.abs(prev.date - targetDate)) ? curr : prev);
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

    useEffect(() => {
        console.log("DEBUG: ForecastChart useEffect executed.");


        if (svgRef.current && groundTruthData.length > 0) {

            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();

            const filteredGroundTruthData = filterGroundTruthData(groundTruthData, USStateNum, [dateStart, dateEnd]);

            const allPlaceholders = filteredGroundTruthData.every(d => d.admissions === -1);

            if (allPlaceholders) {
                // Render the message
                renderMessage(svg, "Not enough data loaded, please extend date range", chartWidth, chartHeight, marginLeft, marginTop);
            } else {


                if (userSelectedWeek < dateStart || userSelectedWeek > dateEnd) {
                    // Find the nearest available ground truth data point
                    const closestDataPoint = findNearestDataPoint(filteredGroundTruthData, userSelectedWeek);
                    setUserSelectedWeek(closestDataPoint.date);
                }

                // NOTE: If ground truth data contains only 1 entry and that entry is placeholder data (admission is -1), we give renderPredictionData a special flag

                const processedPredictionData = processPredictionData(predictionsData, forecastModel, USStateNum, userSelectedWeek, numOfWeeksAhead, confidenceInterval, displayMode);

                var {
                    xScale, yScale, xAxis, yAxis
                } = createScalesAndAxes(filteredGroundTruthData, processedPredictionData, chartWidth, chartHeight, yAxisScale);

                renderGroundTruthData(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop);
                renderPredictionData(svg, processedPredictionData, xScale, yScale, marginLeft, marginTop, confidenceInterval);
                appendAxes(svg, xAxis, yAxis, marginLeft, marginTop, chartWidth, chartHeight);

                const verticalIndicator = renderVerticalIndicator(svg, xScale, marginLeft, marginTop, height, marginBottom);

                if (!initialDataLoaded) {
                    // Find the latest date from the surveillance data (ground truth + placeholder)
                    const latestDate = d3.max(filteredGroundTruthData, d => d.date) as Date;
                    setUserSelectedWeek(latestDate);
                    setInitialDataLoaded(true);
                }

                updateVerticalIndicator(userSelectedWeek || filteredGroundTruthData[0].date, xScale, marginLeft, verticalIndicator);
                renderChartComponents(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop, chartWidth, chartHeight, verticalIndicator);
            }
        }
    }, [groundTruthData, predictionsData, USStateNum, forecastModel, numOfWeeksAhead, dateStart, dateEnd, yAxisScale, confidenceInterval, displayMode, userSelectedWeek]);


// Return the SVG object using reference
    return (<svg ref={svgRef} width={width} height={height}></svg>);
};

export default LineChart;
