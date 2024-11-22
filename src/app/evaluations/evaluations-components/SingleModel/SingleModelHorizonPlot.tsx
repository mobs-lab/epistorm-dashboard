'use client'

import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {subWeeks} from "date-fns";

import {modelColorMap} from "../../../Interfaces/modelColors";
import {
    DataPoint,
    isUTCDateEqual,
    ModelPrediction,
    PredictionDataPoint
} from "../../../Interfaces/forecast-interfaces";
import {useAppDispatch, useAppSelector} from "../../../store/hooks";

interface SingleModelHorizonPlotProps {
    viewBoxWidth: number;
    viewBoxHeight: number;
}


const SingleModelHorizonPlot = ({viewBoxWidth, viewBoxHeight}: SingleModelHorizonPlotProps) => {

    const boxPlotRef = useRef<SVGSVGElement>(null);

    // Get the ground and prediction data from store
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const predictionsData = useAppSelector((state) => state.predictions.data);

    // Get all settings variables from Redux
    const {
        USStateNum,
        dateStart,
        dateEnd,
        seasonOptions //TODO: Use EvaluationsSettingsSlice.seasonOptions instead WHEN it becomes available
    } = useAppSelector((state) => state.forecastSettings);

    const {
        evaluationSingleViewModel,
        evaluationHorizon,
        // evaluationSeasonOptions,
    } = useAppSelector((state) => state.evaluationsSettings);


    // Function to filter ground truth data by selected state and dates
    function filterGroundTruthData(data: DataPoint[], state: string, dateRange: [Date, Date]): DataPoint[] {
        let filteredData = data.filter((d) => d.stateNum === state);

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
                const targetWeek = new Date(d.referenceDate);
                targetWeek.setDate(targetWeek.getDate() + horizon * 7);
                const bufferMs = 2 * 60 * 60 * 1000;
                return d.targetEndDate.getTime() <= targetWeek.getTime() + bufferMs;
            });

            if (targetWeekData.length === 0) return null;

            return {
                date: new Date(date),
                median: d3.median(targetWeekData, d => d.confidence500),
                quantile05: d3.quantile(targetWeekData, 0.05, d => d.confidence500),
                quantile25: d3.quantile(targetWeekData, 0.25, d => d.confidence500),
                quantile75: d3.quantile(targetWeekData, 0.75, d => d.confidence500),
                quantile95: d3.quantile(targetWeekData, 0.95, d => d.confidence500)
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
            .map(d => d.date);

        // Create x-axis with same formatting as ForecastChart
        const xAxis = d3.axisBottom(xScale)
            .tickValues(saturdayTicks.map(d => d.toISOString()))
            .tickFormat((d: string) => {
                const date = new Date(d);
                const month = d3.timeFormat("%b")(date);
                const day = d3.timeFormat("%d")(date);
                const year = date.getUTCFullYear();
                const isFirst = date === saturdayTicks[0];
                const isNearYearChange = date.getMonth() === 0 && date.getDate() <= 10;

                return isFirst || isNearYearChange ?
                    `${year}\n${month}\n${day}` :
                    `${month}\n${day}`;
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

        return {xScale, yScale, xAxis, yAxis};
    }

    function renderBoxPlot(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        svg.selectAll("*").remove();

        // Calculate margins based on viewBox dimensions
        const margin = {
            top: viewBoxHeight * 0.05,
            right: viewBoxWidth * 0.04,
            bottom: viewBoxHeight * 0.05,
            left: viewBoxWidth * 0.04
        };

        const chartWidth = viewBoxWidth - margin.left - margin.right;
        const chartHeight = viewBoxHeight - margin.top - margin.bottom;

        // Filter and process data
        const filteredGroundTruth = filterGroundTruthData(
            groundTruthData,
            USStateNum,
            [dateStart, dateEnd]
        );

        const visualizationData = processVisualizationData(
            predictionsData,
            evaluationSingleViewModel,
            USStateNum,
            evaluationHorizon,
            [dateStart, dateEnd]
        );

        const {xScale, yScale, xAxis, yAxis} = createScalesAndAxes(
            filteredGroundTruth,
            visualizationData,
            chartWidth,
            chartHeight
        );

        const chart = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Render intervals and median points
        visualizationData.forEach(d => {
            const x = xScale(d.date.toISOString());
            if (!x) return;

            // 90% interval box
            chart.append("rect")
                .attr("x", x)
                .attr("y", yScale(d.quantile95))
                .attr("width", xScale.bandwidth())
                .attr("height", yScale(d.quantile05) - yScale(d.quantile95))
                .attr("fill", modelColorMap[evaluationSingleViewModel])
                .attr("opacity", 0.3);

            // 50% interval box
            chart.append("rect")
                .attr("x", x)
                .attr("y", yScale(d.quantile75))
                .attr("width", xScale.bandwidth())
                .attr("height", yScale(d.quantile25) - yScale(d.quantile75))
                .attr("fill", modelColorMap[evaluationSingleViewModel])
                .attr("opacity", 0.6);

            // Median point
            chart.append("circle")
                .attr("cx", x + xScale.bandwidth() / 2)
                .attr("cy", yScale(d.median))
                .attr("r", 4)
                .attr("fill", "white");
        });

        // Add axes with ForecastChart styling
        chart.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .style("font-family", "var(--font-dm-sans)")
            .call(xAxis);

        chart.append("g")
            .style("font-family", "var(--font-dm-sans)")
            .call(yAxis)
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke-opacity", 0.5)
                .attr("stroke-dasharray", "2,2")
                .attr("x2", chartWidth));

        /* */
    }

    /* NOTE:
        Horizon Plot should react to changes in these Redux slice variables:
    * - Time (Via Season change, no individual change):
    *   - dateStart: Date
    *   - dateEnd: Date
    * - forecast model but UNLIKE Forecast Page, here only a single model can be selected
    *   - evaluationsSingleViewModel: string
    * - evaluationHorizon: number
    * - USStateNum: string
    *  */
    useEffect(() => {
        if (boxPlotRef.current && groundTruthData.length > 0) {
            renderBoxPlot(d3.select(boxPlotRef.current));
        }
    }, [

        USStateNum,
        dateStart,
        dateEnd,
        evaluationSingleViewModel,
        evaluationHorizon,
        groundTruthData,
        predictionsData
    ]);
    return (
        <div className="w-full h-full">
            <svg
                ref={boxPlotRef}
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                fontStyle={`fontFamily: "var(--font-dm-sans)"`}
            />
        </div>
    );

}


export default SingleModelHorizonPlot;