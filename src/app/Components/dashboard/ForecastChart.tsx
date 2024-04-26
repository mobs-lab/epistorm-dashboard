// components/ForecastChart.tsx
"use client"

import React, {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {Axis, NumberValue, ScaleLinear, ScaleLogarithmic, ScaleTime} from "d3";

import {DataPoint, ModelPrediction} from "../../Interfaces/forecast-interfaces";


type LineChartProps = {
    selectedUSStateNum: string,
    selectedForecastModel: string[],
    weeksAhead: number,
    selectedDateRange: [Date, Date],
    yAxisScale: string,
    confidenceInterval: string,
    displayMode: string,
    groundTruthData: DataPoint[],
    predictionsData: ModelPrediction[],
};

const LineChart: React.FC<LineChartProps> = ({
                                                 groundTruthData,
                                                 predictionsData,
                                                 selectedUSStateNum,
                                                 selectedForecastModel,
                                                 weeksAhead,
                                                 selectedDateRange,
                                                 yAxisScale,
                                                 confidenceInterval,
                                                 displayMode
                                             }) => {
    // reference to svg object
    const svgRef = useRef(null);

    // Set up size and margins
    const width = 928;
    const height = 500;

    const marginTop = 60;
    const marginBottom = 50;
    const marginLeft = 50;
    const marginRight = 50;

    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;

    const [userSelectedWeek, setUserSelectedWeek] = useState(new Date());

    // Function to filter ground truth data by selected state and dates
    function filterGroundTruthData(data: DataPoint[], state: string, dateRange: [Date, Date]) {
        var filteredGroundTruthDataByState = data.filter((d) => d.stateNum === state);

        // Filter data by extracting those entries that fall within the selected date range
        filteredGroundTruthDataByState = filteredGroundTruthDataByState.filter((d) => d.date >= dateRange[0] && d.date <= dateRange[1]);

        console.log("Chart: Respective Selected State's Ground Truth Data, that falls within date range:", filteredGroundTruthDataByState);

        return filteredGroundTruthDataByState;
    }

    function processPredictionData(allPredictions: ModelPrediction[], selectedModels: string[], state: string, selectedWeek: any, weeksAhead: number, confidenceInterval: string, displayMode: string) {

        // First filter out the selected models from all predictions
        var models = allPredictions.filter((model) => selectedModels.includes(model.modelName));
        console.log("Chart: Selected Models' Predictions Data:", models);

        // Then filter out the selected state's data from the selected models
        var matchingState = models.map((model) => model.predictionData.filter((d) => d.stateNum === state));
        console.log("Chart: Selected State's Predictions Data:", matchingState);

        // now use userSelectedWeek and weeksAhead to determine what prediction data to extract from matchingState:
        // 1. Find the referenceDate that matches userSelectedWeek
        // 2. Find data entries with targetEndDate that is up to weeksAhead from the referenceDate (need to do date calculation here); this means that matching data entries might not be just one, but multiple.
        // 3. Calculate the confidence interval of all matching data entries based on confidenceInterval and filter into final version of data to be rendered.

        if (displayMode === "byDate") {
            // First extract the entries with referenceDate that matches userSelectedWeek, but referenceDate is in string format
            var filteredPredictionsByReferenceDate = matchingState.map((model) => model.filter((d) => d.referenceDate === selectedWeek.toISOString().split('T')[0]));

            console.log("Chart: Prediction Data of the selected week:", filteredPredictionsByReferenceDate);

            // Then extract the entries with targetEndDate that is up to weeksAhead from the referenceDate
            var filteredPredictionsByTargetEndDate = filteredPredictionsByReferenceDate.map((model) => model.filter((d) => {
                var referenceDate = new Date(d.referenceDate);
                var targetEndDate = new Date(d.targetEndDate);
                var targetWeek = new Date(selectedWeek);
                targetWeek.setDate(targetWeek.getDate() + weeksAhead * 7);
                return targetEndDate >= referenceDate && targetEndDate <= targetWeek;
            }));
            console.log("Chart: Filtered Predictions Data up to weeksAhead:", filteredPredictionsByTargetEndDate);

            // Now filter the data further using confidenceInterval:
            // None: leave the data as is
            // "50": calculate using confidence250 and confidence750
            // "90": calculate using confidence050 and confidence950
            // "95": calculate using confidence025 and confidence975
            var filteredPredictionsByConfidenceInterval = filteredPredictionsByTargetEndDate.map((model) => {
                if (confidenceInterval === "0") {
                    return model.map((d) => ({
                        ...d, confidence_low: 0, confidence_high: 0
                    }));
                } else if (confidenceInterval === "50") {
                    return model.map((d) => ({
                        ...d, confidence_low: d.confidence250, confidence_high: d.confidence750
                    }));
                } else if (confidenceInterval === "90") {
                    return model.map((d) => ({
                        ...d, confidence_low: d.confidence050, confidence_high: d.confidence950
                    }))
                } else if (confidenceInterval === "95") {
                    return model.map((d) => ({
                        ...d, confidence_low: d.confidence025, confidence_high: d.confidence975
                    }));
                }
            });

            console.log("Chart: Filtered Predictions Data by Confidence Interval:", filteredPredictionsByConfidenceInterval);

            return filteredPredictionsByConfidenceInterval;
        } else if (displayMode === "byHorizon") {
            //TODO: S2: instead of rendering all models, calculate the confidence interval that should overlay on top of the userSelectedWeek
            return [];
        }
    }


    function createScalesAndAxes(filteredGroundTruthData: DataPoint[], chartWidth: number, chartHeight: number, yAxisScale: string) {
        const xScale = d3.scaleTime()
            .domain(d3.extent(filteredGroundTruthData, d => d.date) as [Date, Date])
            .range([0, chartWidth]);

        let yScale;
        if (yAxisScale === "linear") {
            yScale = d3.scaleLinear()
                .domain([0, d3.max(filteredGroundTruthData, d => d.admissions) as number])
                .range([chartHeight, 0]);
        } else if (yAxisScale === "log") {
            const nonZeroData = filteredGroundTruthData.filter(d => d.admissions > 0);
            const minValue = d3.min(nonZeroData, d => d.admissions) as number;
            const maxValue = d3.max(nonZeroData, d => d.admissions) as number;
            yScale = d3.scaleLog()
                .domain([minValue, maxValue])
                .range([chartHeight, 0])
                .nice();
        }

        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format("d"))
            .ticks(yAxisScale === "log" ? Math.min(3, yScale.ticks().length) : undefined);

        return {xScale, yScale, xAxis, yAxis};
    }

    function renderGroundTruthData(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, filteredGroundTruthData: DataPoint[], xScale: ScaleTime<number, number, never>, yScale: ScaleLogarithmic<number, number, never> | ScaleLinear<number, number, never>, marginLeft: number, marginTop: number) {
        const line = d3.line<DataPoint>()
            .defined(d => d.admissions > 0)
            .x(d => xScale(d.date))
            .y(d => yScale(d.admissions));

        svg.append("path")
            .datum(filteredGroundTruthData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line)
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);

        // Add circles for ground truth data points
        svg.selectAll(".ground-truth-dot")
            .data(filteredGroundTruthData.filter(d => d.admissions > 0))
            .enter()
            .append("circle")
            .attr("class", "ground-truth-dot")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.admissions))
            .attr("r", 3)
            .attr("fill", "steelblue")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);
    }

    function renderPredictionData(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, processedPredictionData: any[][], xScale: ScaleTime<number, number, never>, yScale: ScaleLinear<number, number, never>, marginLeft: number, marginTop: number, confidenceInterval: string) {
        // First, remove any existing prediction data paths and circles
        svg.selectAll(".prediction-path, .prediction-dot").remove();

        processedPredictionData.forEach((predictions, index) => {
            const line = d3.line<any>()
                .x(d => xScale(new Date(d.targetEndDate)))
                .y(d => yScale(d.confidence500));

            const area = d3.area<any>()
                .x(d => xScale(new Date(d.targetEndDate)))
                .y0(d => yScale(d.confidence_low))
                .y1(d => yScale(d.confidence_high));

            svg.append("path")
                .datum(predictions)
                .attr("class", "prediction-path")
                .attr("fill", "none")
                .attr("stroke", `hsl(${index * 60}, 100%, 50%)`)
                .attr("stroke-width", 1.5)
                .attr("d", line)
                .attr("transform", `translate(${marginLeft}, ${marginTop})`);

            if (confidenceInterval !== "None") {
                svg.append("path")
                    .datum(predictions)
                    .attr("class", "prediction-path")
                    .attr("fill", `hsla(${index * 60}, 100%, 50%, 0.2)`)
                    .attr("d", area)
                    .attr("transform", `translate(${marginLeft}, ${marginTop})`)
                    .attr("pointer-events", "none");
            }

            // Add circles for prediction data points
            svg.selectAll(`.prediction-dot-${index}`)
                .data(predictions)
                .enter()
                .append("circle")
                .attr("class", "prediction-dot")
                .attr("cx", d => xScale(new Date(d.targetEndDate)))
                .attr("cy", d => yScale(d.confidence500))
                .attr("r", 3)
                .attr("fill", `hsl(${index * 60}, 100%, 50%)`)
                .attr("transform", `translate(${marginLeft}, ${marginTop})`);
        });
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
            tooltipLine
                .attr("transform", `translate(${xPosition}, 0)`)
                .attr("opacity", 1);
            // Assuming you have a tooltip text element to update
            tooltipText
                .attr("transform", `translate(${xPosition + 10}, ${marginTop + 20})`)
                .text(`Date: ${date.toLocaleDateString()}, Admissions: ${admissions}`)
                .attr("opacity", 1);
        }

        function handleDrag(event: any) {
            const mouseX = d3.pointer(event, this)[0];
            const date = xScale.invert(mouseX);
            const closestData = findNearestDataPoint(filteredGroundTruthData, date);

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
            const closestData = findNearestDataPoint(filteredGroundTruthData, date);

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
            return data.reduce((prev, curr) => Math.abs(curr.date - targetDate) < Math.abs(prev.date - targetDate) ? curr : prev);
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


    useEffect(() => {
        if (svgRef.current && groundTruthData.length > 0) {
            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();

            const filteredGroundTruthData = filterGroundTruthData(groundTruthData, selectedUSStateNum, selectedDateRange);
            const processedPredictionData = processPredictionData(predictionsData, selectedForecastModel, selectedUSStateNum, userSelectedWeek, weeksAhead, confidenceInterval, displayMode);
            var {
                xScale, yScale, xAxis, yAxis
            } = createScalesAndAxes(filteredGroundTruthData, chartWidth, chartHeight, yAxisScale);

            renderGroundTruthData(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop);
            renderPredictionData(svg, processedPredictionData, xScale, yScale, marginLeft, marginTop, confidenceInterval);
            appendAxes(svg, xAxis, yAxis, marginLeft, marginTop, chartWidth, chartHeight);

            const verticalIndicator = renderVerticalIndicator(svg, xScale, marginLeft, marginTop, height, marginBottom);
            updateVerticalIndicator(userSelectedWeek, xScale, marginLeft, verticalIndicator); // Set initial position

            renderChartComponents(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop, chartWidth, chartHeight, verticalIndicator);
        }
    }, [groundTruthData, selectedUSStateNum, selectedForecastModel, weeksAhead, selectedDateRange, yAxisScale, confidenceInterval, displayMode]);

    useEffect(() => {
        if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const filteredGroundTruthData = filterGroundTruthData(groundTruthData, selectedUSStateNum, selectedDateRange);
            const {
                xScale,
                yScale,
                xAxis,
                yAxis
            } = createScalesAndAxes(filteredGroundTruthData, chartWidth, chartHeight, yAxisScale);
            const verticalIndicator = svg.select(".vertical-indicator");
            if (!verticalIndicator.empty()) {
                updateVerticalIndicator(userSelectedWeek, xScale, marginLeft, verticalIndicator);
            }
            const newPredictionData = processPredictionData(predictionsData, selectedForecastModel, selectedUSStateNum, userSelectedWeek, weeksAhead, confidenceInterval, displayMode);
            renderPredictionData(svg, newPredictionData, xScale, yScale, marginLeft, marginTop, confidenceInterval);

        }
    }, [userSelectedWeek]);

    /*useEffect(() => {
        if (svgRef.current && groundTruthData.length > 0) {
            const svg = d3.select(svgRef.current);

            // Clear previous chart elements
            svg.selectAll("*").remove();ß

            // Filter and prepare ground truth data
            const filteredGroundTruthData = filterGroundTruthData(groundTruthData, selectedUSStateNum, selectedDateRange);

            // Process prediction data
            const processedPredictionData = processPredictionData(predictionsData, selectedForecastModel, selectedUSStateNum, userSelectedWeek, weeksAhead, confidenceInterval, displayMode);

            // Create scales and axes
            const {
                xScale, yScale, xAxis, yAxis
            } = createScalesAndAxes(filteredGroundTruthData, chartWidth, chartHeight, yAxisScale);

            // Render ground truth data line and points
            renderGroundTruthData(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop);

            // Render prediction data lines and confidence intervals
            renderPredictionData(svg, processedPredictionData, xScale, yScale, marginLeft, marginTop, confidenceInterval);

            const verticalIndicator = renderVerticalIndicator(svg, xScale, marginLeft, marginTop, height, marginBottom);

            // Set the initial position of the vertical indicator
            if (filteredGroundTruthData.length > 0) {
                const initialDate = filteredGroundTruthData[0].date;
                updateVerticalIndicator(initialDate, xScale, marginLeft, verticalIndicator);
                setUserSelectedWeek(initialDate);
            }

            // Append axes to the chart
            appendAxes(svg, xAxis, yAxis, marginLeft, marginTop, chartWidth, chartHeight);

            renderChartComponents(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop, chartWidth, chartHeight, verticalIndicator);
        }
    }, [groundTruthData, selectedUSStateNum, selectedForecastModel, weeksAhead, selectedDateRange, yAxisScale, confidenceInterval, displayMode, userSelectedWeek]);*/

// Return the SVG object using reference
    return (<svg ref={svgRef} width={width} height={height}></svg>);
};

export default LineChart;
