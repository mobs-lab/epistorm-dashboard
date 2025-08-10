"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { addWeeks } from "date-fns";

import { modelColorMap } from "@/types/common";
import { DataPoint, ModelPrediction, PredictionDataPoint } from "@/types/domains/forecasting";
import { isUTCDateEqual } from "@/utils/date";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useResponsiveSVG } from "@/utils/responsiveSVG";
import { filter } from "lodash";

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

  // Get the ground and prediction data-slices from store
  const groundTruthData = useAppSelector((state) => state.groundTruth.data);
  // console.debug("DEBUG: SingleModelHorizonPlot.tsx: groundTruthData", groundTruthData);

  const predictionsData = useAppSelector((state) => state.predictions.data);

  const {
    evaluationsSingleModelViewSelectedStateCode,
    evaluationsSingleModelViewDateStart,
    evaluationSingleModelViewDateEnd,
    evaluationsSingleModelViewModel,
    evaluationSingleModelViewHorizon,
  } = useAppSelector((state) => state.evaluationsSingleModelSettings);

  // Function to filter ground truth data-slices by selected state and dates
  function filterGroundTruthData(
    data: DataPoint[],
    state: string,
    dateRange: [Date, Date]
  ): DataPoint[] {
    let filteredData = data.filter((d) => d.stateNum === state);

    // console.debug("DEBUG: SingleModelHorizonPlot.tsx: filterGroundTruthData: filteredData (using state)", filteredData);

    // Filter data-slices by date range
    filteredData = filteredData.filter(
      (d) => d.date >= dateRange[0] && d.date <= dateRange[1]
    );

    return filteredData;
  }

  // Process prediction data for visualization
  function processVisualizationData(
    predictions: ModelPrediction[],
    modelName: string,
    state: string,
    horizon: number,
    dateRange: [Date, Date]
  ) {
    const modelPrediction = predictions.find(
      (model) => model.modelName === modelName
    );
    if (!modelPrediction) return [];

    // Filter predictions for selected state and date range
    const stateData = modelPrediction.predictionData.filter(
      (d) =>
        d.stateNum === state &&
        d.referenceDate >= dateRange[0] &&
        d.referenceDate <= dateRange[1]
    );

    /* console.debug(
      "SingleModelHorizonPlot/processVisualizationData()/check stateData: ",
      stateData
    ); */

    // Group by target end date to ensure the horizons are correctly mapped
    const groupedData = d3.group(stateData, (d) =>
      d.targetEndDate.toISOString()
    );

    // Process each group
    return Array.from(groupedData, ([date, group]) => {
      // console.debug("groupedData and each date:", [date, group]);
      const targetWeekData = group.filter((d) => {
        // Calculate expected target date for this horizon
        const expectedTargetDate = new Date(d.referenceDate);
        expectedTargetDate.setDate(expectedTargetDate.getDate() + horizon * 7);

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
        const timeDiff = Math.abs(
          targetEndUTC.getTime() - expectedTargetDate.getTime()
        );

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
        quantile95: prediction.confidence950,
      };
    }).filter((d) => d !== null);
  }

  function createScalesAndAxes(
    groundTruthData: DataPoint[],
    visualData: any[],
    chartWidth: number,
    chartHeight: number,
    saturdayTicks: Date[]
  ) {
    // Create band scale for x-axis
    const xScale = d3
      .scaleBand()
      .domain(groundTruthData.map((d) => d.date.toISOString()))
      .range([0, chartWidth])
      .padding(0.08);

    // Create x-axis with same formatting as ForecastChart
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(saturdayTicks.map((d) => d.toISOString()))
      .tickFormat((d: string) => {
        const date = new Date(d);
        const year = d3.timeFormat("%Y")(date);
        const month = d3.timeFormat("%b")(date);
        const day = d3.timeFormat("%d")(date);

        // First date in a new year - show year+month+date
        const isFirstInYear = date.getMonth() === 0 && date.getDate() <= 7;

        // Check if date is within first 7 days of month
        const isNearMonthBoundary = date.getDate() <= 7;

        // Check if this is first tick
        const isFirst = date.getTime() === saturdayTicks[0].getTime();

        if (chartWidth < 500) {
          // For narrow charts, only show month labels
          if (isFirst || isNearMonthBoundary) {
            return isFirstInYear ? `${year}\n${month}` : month;
          }
          return "";
        } else {
          // For wider charts, show more detailed labels
          if (isFirstInYear) {
            return `${year}\n${month}\n${day}`; // Three separate lines
          } else if (isFirst || isNearMonthBoundary) {
            return `${month}\n${day}`;
          }
          return day;
        }
      });

    // Create y scale using all possible values
    const allValues = visualData.flatMap((d) => [
      d.quantile05,
      d.quantile25,
      d.median,
      d.quantile75,
      d.quantile95,
    ]);

    const allValuesFromSurveillanceData = groundTruthData.flatMap(
      (d) => d.admissions
    );

    const maxPredictionValue = d3.max(allValues);
    const maxSurveillanceValue = d3.max(allValuesFromSurveillanceData) || 1;

    const maxValue =
      maxPredictionValue > maxSurveillanceValue
        ? maxPredictionValue
        : maxSurveillanceValue;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([chartHeight, 0]);

    // Create y-axis with same formatting as ForecastChart
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => {
      const val = d.valueOf();
      if (val >= 10000) return d3.format(".2s")(val);
      if (val >= 1000) return d3.format(".2s")(val);
      if (val >= 100) return d3.format(".0f")(val);
      return d3.format(".0f")(val);
    });

    return { xScale, yScale, xAxis, yAxis };
  }

  function findActualDataRange(
    groundTruthData: DataPoint[],
    predictionsData: ModelPrediction[],
    modelName: string,
    state: string,
    dateRange: [Date, Date],
    horizon: number
  ): [Date, Date] {
    /* First calcualte using horizon number, a buffer for how many weeks ahead we should seek for end date within the final range */

    // Filter ground truth data-slices for valid entries (with valid admissions, including placeholders)
    const validGroundTruth = groundTruthData.filter(
      (d) =>
        d.stateNum === state &&
        d.admissions >= -1 &&
        d.date >= dateRange[0] &&
        d.date <= dateRange[1]
    );

    // Get the model's prediction data-slices
    const modelPrediction = predictionsData.find(
      (model) => model.modelName === modelName
    );
    // Check each date for valid predictions, only dates with predictions are included
    const validPredictions =
      modelPrediction?.predictionData.filter(
        (d) =>
          d.stateNum === state &&
          d.referenceDate >= dateRange[0] &&
          d.targetEndDate <= dateRange[1]
      ) || [];

    // Find the earliest and latest dates with actual data-slices, only those that both have valid admission value & has predictions made on that day
    const startDates = [
      validGroundTruth.length > 0
        ? validGroundTruth[0].date
        : dateRange[1],
      validPredictions.length > 0
        ? validPredictions[0].referenceDate
        : dateRange[1],
    ];

    // const endDates = [dateRange[1]];

    const endDates = [
      validGroundTruth.length > 0
        ? validGroundTruth[validGroundTruth.length - 1].date
        : dateRange[0],
      validPredictions.length > 0
        ? addWeeks(
            validPredictions[validPredictions.length - 1].referenceDate,
            horizon
          )
        : dateRange[0],
    ];

    // Use max and min to cut the ones missing prediction/admission, and we end up with range with actual concrete data-slices values
    return [
      new Date(Math.max(...startDates.map((d) => d.getTime()))),
      new Date(Math.min(...endDates.map((d) => d.getTime()))),
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
      top: Math.max(height * 0.02, 20),
      right: Math.max(width * 0.005, 5),
      bottom: Math.max(height * 0.18, 30),
      left: Math.max(width * 0.005, 50),
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Get data-slices range and filter data-slices
    const [actualStart, actualEnd] = findActualDataRange(
      groundTruthData,
      predictionsData,
      evaluationsSingleModelViewModel,
      evaluationsSingleModelViewSelectedStateCode,
      [evaluationsSingleModelViewDateStart, evaluationSingleModelViewDateEnd],
      evaluationSingleModelViewHorizon
    );

    const filteredGroundTruth = filterGroundTruthData(
      groundTruthData,
      evaluationsSingleModelViewSelectedStateCode,
      [actualStart, actualEnd]
    );

    filteredGroundTruth.sort((a, b) => a.date.getTime() - b.date.getTime());

    const visualizationData = processVisualizationData(
      predictionsData,
      evaluationsSingleModelViewModel,
      evaluationsSingleModelViewSelectedStateCode,
      evaluationSingleModelViewHorizon,
      [actualStart, actualEnd]
    );

    if (visualizationData.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-family", "var(--font-dm-sans)")
        .text("No data available for selected criteria");
      return;
    }

    const saturdayTicks = filteredGroundTruth
      .filter((d) => d.date.getDay() === 6)
      .map((d) => d.date)
      .sort((a, b) => a.getTime() - b.getTime());

    // Create scales and chart group
    const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
      filteredGroundTruth,
      visualizationData,
      chartWidth,
      chartHeight,
      saturdayTicks
    );

    /* Helper function to wrap x-axis label*/
    function wrap(text, width) {
      text.each(function () {
        const text = d3.select(this);
        const lines = text.text().split(/\n+/);
        const x = text.attr("x") || 0;
        const y = text.attr("y") || 0;
        const dy = parseFloat(text.attr("dy") || 0);

        // Clear existing content
        text.text(null);

        // Calculate appropriate line heights based on number of lines
        // More lines need more spacing to avoid overlap
        const lineHeight = lines.length > 2 ? 1.8 : 1.6;

        // Create a tspan for each line with progressively increasing offsets
        lines.forEach((line, i) => {
          // For 3-line labels, increase vertical spacing between lines 2 and 3
          const currentDy =
            i === 0 ? dy : i === 2 ? lineHeight * 1.6 : lineHeight;

          text
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", (i === 0 ? dy : currentDy) + "em")
            .text(line);
        });
      });
    }

    // Create main chart group
    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .style("font-family", "var(--font-dm-sans)")
      .call(xAxis);

    // Apply the wrap function to all x-axis label elements
    xAxisGroup
      .selectAll(".tick text")
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .call(wrap, 20);

    const yAxisGroup = chart
      .append("g")
      .style("font-family", "var(--font-dm-sans)")
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke-opacity", 0.5)
          .attr("stroke-dasharray", "2,2")
          .attr("x2", chartWidth)
      )
      .style("font-size", "18px");

    // Create container for all visual elements
    const visualContainer = chart.append("g").attr("class", "visual-container");

    // Create specific groups for different visual elements
    const boxesGroup = visualContainer.append("g").attr("class", "boxes");
    const linesGroup = visualContainer.append("g").attr("class", "lines");
    const pointsGroup = visualContainer.append("g").attr("class", "points");

    // Create hover areas group
    const hoverGroup = visualContainer
      .append("g")
      .attr("class", "hover-areas")
      .style("pointer-events", "all");

    // Create tooltip group (will be raised to top)
    const tooltipGroup = chart
      .append("g")
      .attr("class", "horizon-tooltip")
      .style("opacity", 0)
      .style("pointer-events", "none");

    // Create a combined data structure that includes both ground truth and prediction data
    const combinedDataMap = new Map();

    // Add ground truth data to map
    filteredGroundTruth.forEach((gt) => {
      const dateKey = gt.date.toISOString();
      combinedDataMap.set(dateKey, {
        date: gt.date,
        groundTruthValue: gt.admissions >= 0 ? gt.admissions : undefined,
        // Initialize prediction values as undefined
        median: undefined,
        quantile05: undefined,
        quantile25: undefined,
        quantile75: undefined,
        quantile95: undefined,
      });
    });

    // Add visualization data to the map, merging with existing ground truth entries
    visualizationData.forEach((pd) => {
      const dateKey = pd.date.toISOString();
      const existing = combinedDataMap.get(dateKey) || { date: pd.date };

      combinedDataMap.set(dateKey, {
        ...existing,
        median: pd.median,
        quantile05: pd.quantile05,
        quantile25: pd.quantile25,
        quantile75: pd.quantile75,
        quantile95: pd.quantile95,
      });
    });

    // Convert map to array for rendering, sorted by date
    const combinedData = Array.from(combinedDataMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Render ground truth points independently to ensure all are displayed
    // Regardless of whether prediction data's date domain is the same
    filteredGroundTruth.forEach((groundTruthPoint) => {
      if (groundTruthPoint.admissions < 0) return; // Skip placeholders

      const x = xScale(groundTruthPoint.date.toISOString());
      if (x === undefined) return;

      pointsGroup
        .append("circle")
        .attr("cx", x + xScale.bandwidth() / 2)
        .attr("cy", yScale(groundTruthPoint.admissions))
        .attr("r", 4)
        .attr("fill", "white")
        .attr("stroke", modelColorMap[evaluationsSingleModelViewModel])
        .attr("stroke-width", 1);
    });

    // Render only prediction data elements for dates with predictions
    visualizationData.forEach((pd) => {
      const x = xScale(pd.date.toISOString());
      if (x === undefined) return;

      // 90% interval box
      boxesGroup
        .append("rect")
        .attr("x", x)
        .attr("y", yScale(pd.quantile95))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale(pd.quantile05) - yScale(pd.quantile95))
        .attr("fill", modelColorMap[evaluationsSingleModelViewModel])
        .attr("opacity", 0.3);

      // 50% interval box
      boxesGroup
        .append("rect")
        .attr("x", x)
        .attr("y", yScale(pd.quantile75))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale(pd.quantile25) - yScale(pd.quantile75))
        .attr("fill", modelColorMap[evaluationsSingleModelViewModel])
        .attr("opacity", 0.6);

      // Median line
      linesGroup
        .append("line")
        .attr("x1", x)
        .attr("x2", x + xScale.bandwidth())
        .attr("y1", yScale(pd.median))
        .attr("y2", yScale(pd.median))
        .attr("stroke", modelColorMap[evaluationsSingleModelViewModel])
        .attr("stroke-width", 2);
    });

    // Create hover areas for all dates in the combined dataset
    combinedData.forEach((d) => {
      const x = xScale(d.date.toISOString());
      if (x === undefined) return;

      // Add hover area for this date
      hoverGroup
        .append("rect")
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
          d3.select(this).attr("fill", "white").attr("opacity", 0.1);

          // Update tooltip
          tooltipGroup.selectAll("*").remove();

          const padding = 12;
          let currentY = padding;
          const lineHeight = 24;

          const background = tooltipGroup
            .append("rect")
            .attr("fill", "#333943")
            .attr("rx", 8)
            .attr("ry", 8);

          // Tooltip content - adapt based on available data
          const items = [];
          items.push([`Date: ${d.date.toUTCString().slice(5, 16)}`, true]);

          // Add prediction data to tooltip if available
          if (d.median !== undefined) {
            items.push([`Median: ${d.median.toFixed(1)}`, false]);
            items.push([
              `90% PI: [${d.quantile05.toFixed(1)}, ${d.quantile95.toFixed(1)}]`,
              false,
            ]);
            items.push([
              `50% PI: [${d.quantile25.toFixed(1)}, ${d.quantile75.toFixed(1)}]`,
              false,
            ]);
          } else {
            items.push(["No prediction data for this date", false]);
          }

          // Add ground truth data to tooltip if available
          if (d.groundTruthValue !== undefined) {
            items.push([`Actual: ${d.groundTruthValue.toFixed(1)}`, false]);
          }

          const textElements = items.map(([text, isHeader]) => {
            const element = tooltipGroup
              .append("text")
              .attr("x", padding)
              .attr("y", currentY + 16)
              .attr("fill", "white")
              .style("font-family", "var(--font-dm-sans)")
              .style("font-size", isHeader ? "15px" : "13px")
              .style("font-weight", isHeader ? "bold" : "normal")
              .text(text as string);

            currentY += lineHeight;
            return element;
          });

          // Calculate tooltip dimensions and position
          const maxWidth = Math.max(
            ...textElements.map((el) => el.node()!.getComputedTextLength())
          );
          const [mouseX] = d3.pointer(event);
          const isRightSide = mouseX < chartWidth / 2;

          background
            .attr("width", maxWidth + padding * 2)
            .attr("height", currentY + padding);

          const tooltipX = isRightSide
            ? chartWidth - maxWidth - padding * 2 - 10
            : 10;

          tooltipGroup
            .attr("transform", `translate(${tooltipX}, 10)`)
            .style("opacity", 1);
        })
        .on("mouseout", function (event) {
          event.stopPropagation();

          // Remove highlight
          d3.select(this).attr("fill", "transparent");

          // Hide tooltip
          // tooltipGroup.style("opacity", 0);
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
    predictionsData,
  ]);

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={svgRef}
        width='100%'
        height='100%'
        className='w-full h-full'
        style={{
          fontFamily: "var(--font-dm-sans)",
          opacity: isResizing ? 0.5 : 1,
          transition: "opacity 0.2s ease",
        }}
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
        preserveAspectRatio='xMidYMid meet'
      />
    </div>
  );
};

export default SingleModelHorizonPlot;
