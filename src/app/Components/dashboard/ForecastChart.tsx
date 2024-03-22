// components/ForecastChart.tsx
"use client"

import React, {useRef, useEffect} from "react";
import * as d3 from "d3";

interface DataPoint {
    date: Date;
    stateNum: string;
    stateName: string;
    admissions: number;
}

interface PredictionDataPoint {
    referenceDate: string;
    targetEndDate: string;
    stateNum: string;
    confidence025: number;
    confidence250: number;
    confidence500: number;
    confidence750: number;
    confidence975: number;
}

interface LocationData {
    stateNum: string;
    state: string;
    stateName: string;
}

type LineChartProps = {
    selectedUSState: string,
    selectedForecastModel: string[],
    selectedDates: string,
    yAxisScale: string,
    confidenceInterval: string,
    displayMode: string,
    groundTruthData: DataPoint[],
    predictionsData: PredictionDataPoint[][],
};

const LineChart: React.FC<LineChartProps> = ({
                                                 groundTruthData,
                                                 predictionsData,
                                                 selectedUSState,
                                                 selectedForecastModel,
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

    // Build X-Axis, which is based on dates

    // Build Y-Axis, which is based on highest

    useEffect(() => {
        if (svgRef.current && groundTruthData.length > 0) {
            const svg = d3.select(svgRef.current);

            // Clear previous chart elements
            svg.selectAll("*").remove();

            const filteredDataByState = groundTruthData.filter((d) => d.stateNum === selectedUSState);
            console.log(filteredDataByState);

            // Create x-axis scale
            const xScale = d3.scaleTime()
                .domain(d3.extent(filteredDataByState, d => d.date) as [Date, Date])
                .range([0, chartWidth]);

            const yScale = d3.scaleLinear().domain([0, d3.max(filteredDataByState, d => d.admissions) as number]).range([chartHeight, 0]);

            // Create x-axis
            const xAxis = d3.axisBottom(xScale);

            // Create y-axis
            const yAxis = d3.axisLeft(yScale).tickFormat(d3.format("d"));

            // Append x-axis to the chart
            svg.append("g")
                .attr("transform", `translate(${marginLeft}, ${height - marginBottom})`)
                .call(xAxis);

            // Append y-axis to the chart
            svg.append("g")
                .attr("transform", `translate(${marginLeft}, ${marginTop})`)
                .call(yAxis);

            // Line generator
            const line = d3.line<DataPoint>()
                .x(d => xScale(d.date))
                .y(d => yScale(d.admissions));

            // Append path to the chart
            svg.append("path")
                .datum(filteredDataByState)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", line)
                .attr("transform", `translate(${marginLeft}, ${marginTop})`);
        }
    }, [groundTruthData, selectedUSState]);

    // Return the SVG object using reference
    return (<svg ref={svgRef} width={width} height={height}></svg>);
};

// TODO Read the predictions data into a const

export default LineChart;
