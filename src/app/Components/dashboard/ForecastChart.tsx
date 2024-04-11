// components/ForecastChart.tsx
"use client"

import React, {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {Axis, NumberValue, ScaleLinear, ScaleTime} from "d3";

import {DataPoint, ModelPrediction} from "../../Interfaces/forecast-interfaces";


type LineChartProps = {
    selectedUSStateNum: string,
    selectedForecastModel: string[],
    weeksAhead: number,
    selectedDates: string,
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
                                                 selectedDates,
                                                 yAxisScale,
                                                 confidenceInterval,
                                                 displayMode
                                             }) => {
        // reference to svg object
        const svgRef = useRef(null);

        // Set up size and margins
        const width = 928;
        const height = 500;

        const marginTop = 20;
        const marginBottom = 20;
        const marginLeft = 20;
        const marginRight = 20;

        const chartWidth = width - marginLeft - marginRight;
        const chartHeight = height - marginTop - marginBottom;

        const [userSelectedWeek, setUserSelectedWeek] = useState(new Date());

        // Function to filter ground truth data by selected state and dates
        // TODO: after changing dates to a range, need to update this function so it only shows data that falls within that range
        function filterGroundTruthData(data: DataPoint[], state: string, dateRangeBegin: Date, dateRangeEnd: Date) {
            var filteredGroundTruthDataByState = data.filter((d) => d.stateNum === state);

            // Filter data by extracting those entries that fall within the selected date range
            // filteredGroundTruthDataByState = filteredGroundTruthDataByState.filter((d) => d.date >= dateRangeBegin && d.date <= dateRangeEnd);

            console.log("Chart: Respective Selected State's Ground Truth Data, that falls within date range:", filteredGroundTruthDataByState);

            return filteredGroundTruthDataByState;
        }

        // TODO: Function to extract needed predictions data
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
                // "90":  TODO: ask what to do here since we do not have 5th nor 95th percentile data column
                // "95": calculate using confidence025 and confidence975
                var filteredPredictionsByConfidenceInterval = filteredPredictionsByTargetEndDate.map((model) => {
                    if (confidenceInterval === "None") {
                        return model.map((d) => ({
                            ...d,
                            confidence_low: null,
                            confidence_high: null
                        }));
                    } else if (confidenceInterval === "50") {
                        return model.map((d) => ({
                            ...d,
                            confidence_low: d.confidence250,
                            confidence_high: d.confidence750
                        }));
                    } else if (confidenceInterval === "90") {
                        return model.map((d) => ({
                            ...d,
                            confidence_low: d.confidence050,
                            confidence_high: d.confidence950
                        }))
                    } else if (confidenceInterval === "95") {
                        return model.map((d) => ({
                            ...d,
                            confidence_low: d.confidence025,
                            confidence_high: d.confidence975
                        }));
                    }
                });

                console.log("Chart: Filtered Predictions Data by Confidence Interval:", filteredPredictionsByConfidenceInterval);

                return filteredPredictionsByConfidenceInterval;
            } else if (displayMode === "byHorizon") {
                //TODO: instead of rendering all models, calculate the confidence interval that should overlay on top of the userSelectedWeek
                return [];
            }


        }


        function createScalesAndAxes(filteredGroundTruthData: DataPoint[], chartWidth: number, chartHeight: number, yAxisScale: string) {
            const xScale = d3.scaleTime()
                .domain(d3.extent(filteredGroundTruthData, d => d.date) as [Date, Date])
                .range([0, chartWidth]);

            // NOTE: Find if there is a semiLog scale in d3 or pseudoLog scale and which works better
            const yScale = yAxisScale === "linear" ? d3.scaleLinear().domain([0, d3.max(filteredGroundTruthData, d => d.admissions) as number]).range([chartHeight, 0]) : d3.scaleLog().domain([1, d3.max(filteredGroundTruthData, d => d.admissions) as number]).range([chartHeight, 0]);

            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale).tickFormat(d3.format("d"));

            return {xScale, yScale, xAxis, yAxis};
        }

        function renderGroundTruthData(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, filteredGroundTruthData: DataPoint[], xScale: ScaleTime<number, number, never>, yScale: ScaleLinear<number, number, never>, marginLeft: number, marginTop: number) {
            const line = d3.line<DataPoint>()
                .x(d => xScale(d.date))
                .y(d => yScale(d.admissions));

            svg.append("path")
                .datum(filteredGroundTruthData)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", line)
                .attr("transform", `translate(${marginLeft}, ${marginTop})`);
        }

// TODO: Implement this function
        function renderPredictionData(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, processedPredictionData: any[][], xScale: ScaleTime<number, number, never>, yScale: ScaleLinear<number, number, never>, marginLeft: number, marginTop: number, confidenceInterval: string) {
            processedPredictionData.forEach((predictions, index) => {
                const line = d3.line<any>()
                    .x(d => xScale(new Date(d.targetEndDate)))
                    .y(d => yScale(d.confidence500)); // TODO: Ask if it is correct to use confidence 50 percentile as the plotted value for predictions

                const area = d3.area<any>()
                    .x(d => xScale(new Date(d.targetEndDate)))
                    .y0(d => yScale(d.confidence_low))
                    .y1(d => yScale(d.confidence_high));

                svg.append("path")
                    .datum(predictions)
                    .attr("fill", "none")
                    .attr("stroke", `hsl(${index * 60}, 100%, 50%)`) //TODO: Change the color to match model's color (needs implementation as well)
                    .attr("stroke-width", 1.5)
                    .attr("d", line)
                    .attr("transform", `translate(${marginLeft}, ${marginTop})`);

                if (confidenceInterval !== "None") {
                    svg.append("path")
                        .datum(predictions)
                        .attr("fill", `hsla(${index * 60}, 100%, 50%, 0.2)`)
                        .attr("d", area)
                        .attr("transform", `translate(${marginLeft}, ${marginTop})`);
                }
            });
        }

        function renderVerticalLineAndTooltips(svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, filteredGroundTruthData: DataPoint[], xScale: ScaleTime<number, number, never>, yScale: ScaleLinear<number, number, never>, marginLeft: number, marginTop: number, chartWidth: number, chartHeight: number) {
            const tooltipLine = svg.append("line")
                .attr("class", "tooltip-line")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("opacity", 0)
                .attr("y1", marginTop)
                .attr("y2", height - marginBottom)
                .attr("stroke-dasharray", "5,5"); // Add this line to make the line dotted

            const tooltip = svg.append("text")
                .attr("class", "tooltip")
                .attr("opacity", 0);

            const verticalLine = svg.append("line")
                .attr("class", "vertical-line")
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("y1", marginTop)
                .attr("y2", height - marginBottom);

            svg.append("rect")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("fill", "none")
                .attr("pointer-events", "all")
                .attr("transform", `translate(${marginLeft}, ${marginTop})`)
                .on("mouseover", () => {
                    tooltipLine.attr("opacity", 1);
                    tooltip.attr("opacity", 1);
                })
                .on("mouseout", () => {
                    tooltipLine.attr("opacity", 0);
                    tooltip.attr("opacity", 0);
                })
                .on("mousemove", (event) => {
                    const mouseX = d3.pointer(event)[0];
                    const date = xScale.invert(mouseX - marginLeft);
                    const closestData = filteredGroundTruthData.reduce((a, b) => Math.abs(a.date.getTime() - date.getTime()) < Math.abs(b.date.getTime() - date.getTime()) ? a : b);

                    tooltipLine.attr("transform", `translate(${xScale(closestData.date)}, 0)`);
                    tooltip.attr("transform", `translate(${xScale(closestData.date) + 10}, ${yScale(closestData.admissions)})`)
                        .text(`Date: ${closestData.date.toLocaleDateString()}, Admissions: ${closestData.admissions}`);
                })
                .on("click", (event) => {
                    const mouseX = d3.pointer(event)[0];
                    const date = xScale.invert(mouseX - marginLeft);
                    const closestData = filteredGroundTruthData.reduce((a, b) => Math.abs(a.date.getTime() - date.getTime()) < Math.abs(b.date.getTime() - date.getTime()) ? a : b);
                    console.log("User selected week:", closestData.date);
                    setUserSelectedWeek(closestData.date);
                    verticalLine.attr("transform", `translate(${xScale(closestData.date)}, 0)`);
                });
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

                // Clear previous chart elements
                svg.selectAll("*").remove();

                // Filter and prepare ground truth data
                const filteredGroundTruthData = filterGroundTruthData(groundTruthData, selectedUSStateNum, selectedDates);

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

                // Render draggable vertical line and tooltips
                renderVerticalLineAndTooltips(svg, filteredGroundTruthData, xScale, yScale, marginLeft, marginTop, chartWidth, chartHeight);

                // Append axes to the chart
                appendAxes(svg, xAxis, yAxis, marginLeft, marginTop, chartWidth, chartHeight);

            }
        }, [groundTruthData, selectedUSStateNum, selectedForecastModel, weeksAhead, selectedDates, yAxisScale, confidenceInterval, displayMode, userSelectedWeek]);

// Return the SVG object using reference
        return (<svg ref={svgRef} width={width} height={height}></svg>);
    }
;

export default LineChart;
