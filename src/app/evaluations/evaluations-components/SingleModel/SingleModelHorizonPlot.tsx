"use client";

import { useAppSelector } from "@/store/hooks";
import { selectIsCoreDataLoaded, selectSingleModelTimeSeriesData } from "@/store/selectors/singleModelSelectors";
import { modelColorMap } from "@/types/common";
import { normalizeToUTCMidDay } from "@/utils/date";
import { useResponsiveSVG } from "@/utils/responsiveSVG";
import * as d3 from "d3";
import React, { useCallback, useEffect, useRef } from "react";

const SingleModelHorizonPlot: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const svgRef = useRef<SVGSVGElement>(null);

  // New selector for using new Core App Data
  const timeSeriesData = useAppSelector(selectSingleModelTimeSeriesData);
  const isCoreDataLoaded = useAppSelector(selectIsCoreDataLoaded);

  const { evaluationsSingleModelViewSelectedStateCode, evaluationsSingleModelViewModel, evaluationSingleModelViewHorizon } = useAppSelector(
    (state) => state.evaluationsSingleModelSettings
  );

  function generateSaturdayDatesUTC(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];

    // Normalize start and end dates to UTC midday
    let currentDate = normalizeToUTCMidDay(startDate);
    const normalizedEndDate = normalizeToUTCMidDay(endDate);

    // Move to the first Saturday if not already on one (using UTC day)
    while (currentDate.getUTCDay() !== 6) {
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Generate all Saturdays until end date
    while (currentDate <= normalizedEndDate) {
      dates.push(new Date(currentDate));
      currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return dates;
  }

  function createScalesAndAxes(
    allSaturdays: Date[], // Changed parameter to use all Saturdays
    groundTruthData: any[],
    visualData: any[],
    chartWidth: number,
    chartHeight: number
  ) {
    // Create band scale for x-axis using ALL Saturdays (same as line chart)
    const xScale = d3
      .scaleBand()
      .domain(allSaturdays.map((d) => d.toISOString()))
      .range([0, chartWidth])
      .padding(0.08);

    // Create x-axis with same formatting as line chart
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(allSaturdays.map((d) => d.toISOString()))
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
        const isFirst = date.getTime() === allSaturdays[0].getTime();

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

    const allValues = visualData.flatMap((d) => [d.quantile05, d.quantile25, d.median, d.quantile75, d.quantile95]);

    const allValuesFromSurveillanceData = groundTruthData.flatMap((d) => d.admissions);

    const maxPredictionValue = d3.max(allValues);
    const maxSurveillanceValue = d3.max(allValuesFromSurveillanceData) || 1;

    const maxValue = maxPredictionValue > maxSurveillanceValue ? maxPredictionValue : maxSurveillanceValue;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([chartHeight, 0]);

    const yAxis = d3.axisLeft(yScale).tickFormat((d) => {
      const val = d.valueOf();
      if (val >= 10000) return d3.format(".2s")(val);
      if (val >= 1000) return d3.format(".2s")(val);
      if (val >= 100) return d3.format(".0f")(val);
      return d3.format(".0f")(val);
    });

    return { xScale, yScale, xAxis, yAxis };
  }

  const renderBoxPlot = useCallback(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) return;
    if (!isCoreDataLoaded || !timeSeriesData) {
      // Show loading or no data message
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      svg
        .append("text")
        .attr("x", dimensions.width / 2)
        .attr("y", dimensions.height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-family", "var(--font-dm-sans)")
        .text(isCoreDataLoaded ? "No data available for selected criteria" : "Loading data...");
      return;
    }

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

    // Process the combined data from the selector
    const { data: combinedData, metadata } = timeSeriesData;

    const { displayStartDate, displayEndDate } = metadata;

    const allSaturdays = generateSaturdayDatesUTC(displayStartDate, displayEndDate);

    // Separate ground truth and predictions
    const groundTruthPoints = combinedData
      .filter((d) => d.groundTruth && d.groundTruth.admissions >= 0)
      .map((d) => ({
        date: normalizeToUTCMidDay(d.referenceDate),
        admissions: d.groundTruth.admissions,
        weeklyRate: d.groundTruth.weeklyRate,
      }));

    const predictionPoints = combinedData
      .filter((d) => d.prediction)
      .map((d) => ({
        date: normalizeToUTCMidDay(d.referenceDate),
        targetDate: normalizeToUTCMidDay(d.prediction.targetDate),
        median: d.prediction.median,
        quantile05: d.prediction.q05,
        quantile25: d.prediction.q25,
        quantile75: d.prediction.q75,
        quantile95: d.prediction.q95,
      }));

    if (groundTruthPoints.length === 0 && predictionPoints.length === 0) {
      svg
        .append("text")
        .attr("x", dimensions.width / 2)
        .attr("y", dimensions.height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-family", "var(--font-dm-sans)")
        .text("No data available for selected criteria");
      return;
    }

    // Create scales and chart group
    const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
      allSaturdays, // Use generated Saturdays instead of filtered ground truth
      groundTruthPoints,
      predictionPoints,
      chartWidth,
      chartHeight
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
          const currentDy = i === 0 ? dy : i === 2 ? lineHeight * 1.6 : lineHeight;

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
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .style("font-family", "var(--font-dm-sans)")
      .call(xAxis);

    // Apply the wrap function to all x-axis label elements
    xAxisGroup.selectAll(".tick text").style("text-anchor", "middle").style("font-size", "13px").call(wrap, 20);

    const yAxisGroup = chart
      .append("g")
      .style("font-family", "var(--font-dm-sans)")
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").attr("stroke-opacity", 0.5).attr("stroke-dasharray", "2,2").attr("x2", chartWidth))
      .style("font-size", "18px");

    // Create container for all visual elements
    const visualContainer = chart.append("g").attr("class", "visual-container");

    // Create specific groups for different visual elements
    const boxesGroup = visualContainer.append("g").attr("class", "boxes");
    const linesGroup = visualContainer.append("g").attr("class", "lines");
    const pointsGroup = visualContainer.append("g").attr("class", "points");

    // Create hover areas group
    const hoverGroup = visualContainer.append("g").attr("class", "hover-areas").style("pointer-events", "all");

    // Create tooltip group (will be raised to top)
    const tooltipGroup = chart.append("g").attr("class", "horizon-tooltip").style("opacity", 0).style("pointer-events", "none");

    // Create a combined data structure that includes both ground truth and prediction data
    const combinedDataMap = new Map();

    // Add ground truth data to map
    groundTruthPoints.forEach((gt) => {
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
    predictionPoints.forEach((pd) => {
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
    const combinedDataSet = Array.from(combinedDataMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Render ground truth points independently to ensure all are displayed
    // Regardless of whether prediction data's date domain is the same
    groundTruthPoints.forEach((groundTruthPoint) => {
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
    predictionPoints.forEach((pd) => {
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
    combinedDataSet.forEach((d) => {
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

          const background = tooltipGroup.append("rect").attr("fill", "#333943").attr("rx", 8).attr("ry", 8);

          // Tooltip content - adapt based on available data
          const items = [];
          items.push([`Date: ${d.date.toUTCString().slice(5, 16)}`, true]);

          // Add prediction data to tooltip if available
          if (d.median !== undefined) {
            items.push([`Median: ${d.median.toFixed(1)}`, false]);
            items.push([`90% PI: [${d.quantile05.toFixed(1)}, ${d.quantile95.toFixed(1)}]`, false]);
            items.push([`50% PI: [${d.quantile25.toFixed(1)}, ${d.quantile75.toFixed(1)}]`, false]);
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
          const maxWidth = Math.max(...textElements.map((el) => el.node()!.getComputedTextLength()));
          const [mouseX] = d3.pointer(event);
          const isRightSide = mouseX < chartWidth / 2;

          background.attr("width", maxWidth + padding * 2).attr("height", currentY + padding);

          const tooltipX = isRightSide ? chartWidth - maxWidth - padding * 2 - 10 : 10;

          tooltipGroup.attr("transform", `translate(${tooltipX}, 10)`).style("opacity", 1);
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
  }, [dimensions, timeSeriesData, isCoreDataLoaded, evaluationsSingleModelViewModel]);

  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0) {
      renderBoxPlot();
    }
  }, [isResizing, evaluationsSingleModelViewSelectedStateCode, evaluationSingleModelViewHorizon, renderBoxPlot, dimensions]);

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={svgRef}
        width='100%'
        height='100%'
        className='w-full h-full'
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
        preserveAspectRatio='xMidYMid meet'
      />
    </div>
  );
};

export default SingleModelHorizonPlot;
