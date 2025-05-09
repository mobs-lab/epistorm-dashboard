import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { addWeeks, subWeeks, format } from "date-fns";

import { useAppSelector } from "@/store/hooks";

import { DataPoint, isUTCDateEqual, ModelPrediction } from "@/interfaces/forecast-interfaces";
import { useResponsiveSVG } from "@/interfaces/responsiveSVG";
import { modelColorMap } from "@/interfaces/epistorm-constants";

interface ScoreDataPoint {
  referenceDate: Date;
  score: number;
  horizon: number;
}

interface ProcessedScoreDataPoint {
  targetDate: Date;
  referenceDate: Date;
  score: number;
}

const SingleModelScoreLineChart: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const chartRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);

  // Get the ground and prediction data from store
  const groundTruthData = useAppSelector((state) => state.groundTruth.data);
  const predictionsData = useAppSelector((state) => state.predictions.data);

  // Get data and settings from Redux
  const evaluationsScoreData = useAppSelector((state) => state.evaluationsSingleModelScoreData.data);
  const {
    evaluationsSingleModelViewModel,
    evaluationsSingleModelViewSelectedStateCode,
    evaluationsSingleModelViewDateStart,
    evaluationSingleModelViewDateEnd,
    evaluationSingleModelViewScoresOption,
    evaluationSingleModelViewHorizon,
  } = useAppSelector((state) => state.evaluationsSingleModelSettings);

  /**
   * Finds the actual data range to render, ensuring we have both valid
   * surveillance data and prediction data at the start, and valid surveillance data at the end
   */
  function findActualDataRange(
    groundTruthData: DataPoint[],
    predictionsData: ModelPrediction[],
    modelName: string,
    state: string,
    dateRange: [Date, Date],
    horizon: number
  ): [Date, Date] {
    /* First calcualte using horizon number, a buffer for how many weeks ahead we should seek for end date within the final range */

    /* console.log(
      "end date calculated considering horizon: ",
      endDateWithHorizon
    ); */

    // Filter ground truth data-slices for valid entries (with valid admissions, including placeholders)
    const validGroundTruth = groundTruthData.filter(
      (d) => d.stateNum === state && d.admissions >= -1 && d.date >= dateRange[0] && d.date <= dateRange[1]
    );

    // Get the model's prediction data-slices
    const modelPrediction = predictionsData.find((model) => model.modelName === modelName);
    // Check each date for valid predictions, only dates with predictions are included
    const validPredictions =
      modelPrediction?.predictionData.filter(
        (d) => d.stateNum === state && d.referenceDate >= dateRange[0] && d.referenceDate <= dateRange[1]
      ) || [];

    // Find the earliest and latest dates with actual data-slices, only those that both have valid admission value & has predictions made on that day
    const startDates = [
      validGroundTruth.length > 0 ? validGroundTruth[0].date : dateRange[1],
      validPredictions.length > 0 ? validPredictions[0].referenceDate : dateRange[1],
    ];

    // const endDates = [endDateWithHorizon];

    const endDates = [
      validGroundTruth.length > 0 ? validGroundTruth[validGroundTruth.length - 1].date : dateRange[0],
      validPredictions.length > 0 ? addWeeks(validPredictions[validPredictions.length - 1].referenceDate, horizon) : dateRange[0],
    ];

    // Use max and min to cut the ones missing prediction/admission, and we end up with range with actual concrete data-slices values
    return [new Date(Math.max(...startDates.map((d) => d.getTime()))), new Date(Math.min(...endDates.map((d) => d.getTime())))];
  }

  /**
   * Generate Saturday dates within a date range
   */
  function generateSaturdayDates(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);

    // Move to the first Saturday if not already on one
    while (currentDate.getDay() !== 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate all Saturdays until end date
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return dates;
  }

  /**
   * Process score data to match with chart x-axis values (Saturdays)
   * Maps score data using a calculation of referenceDate + horizon weeks
   */
  function processScoreData(
    scoreDataCollection: any[],
    modelName: string,
    state: string,
    scoreOption: string,
    horizon: number,
    saturdayDates: Date[]
  ): ProcessedScoreDataPoint[] {
    // Find relevant score data for selected model and metric
    const scoreData =
      scoreDataCollection
        .find((d) => d.modelName === modelName && d.scoreMetric === scoreOption)
        ?.scoreData.filter((d) => d.location === state && d.horizon === horizon) || [];

    if (scoreData.length === 0) {
      return [];
    }

    // Create a map for quick lookup of score data by reference date (ISO string)
    const scoreDataMap = new Map<string, ScoreDataPoint>();
    scoreData.forEach((d) => {
      scoreDataMap.set(d.referenceDate.toISOString(), {
        referenceDate: d.referenceDate,
        score: d.score,
        horizon: d.horizon,
        // targetEndDate: addWeeks(d.referenceDate, d.horizon)
      });
    });

    // For each Saturday, find the corresponding score data
    const processedData: ProcessedScoreDataPoint[] = [];

    saturdayDates.forEach((targetDate) => {
      // Calculate the reference date for this target date
      const referenceDate = subWeeks(targetDate, horizon);
      const referenceDateKey = referenceDate.toISOString();

      // Find score data for this reference date
      const matchingScore = scoreDataMap.get(referenceDateKey);

      if (matchingScore) {
        processedData.push({
          targetDate,
          referenceDate: matchingScore.referenceDate,
          score: matchingScore.score,
        });
      }
    });

    return processedData;
  }

  function createInteractiveElements(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    margin: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ) {
    // Mouse follow line
    const mouseFollowLine = svg
      .append("line")
      .attr("class", "mouse-follow-line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .attr("y1", margin.top)
      .attr("y2", chartHeight + margin.top)
      .style("opacity", 0);

    // Vertical indicator group
    const indicatorGroup = svg.append("g").attr("class", "vertical-indicator-group").style("opacity", 0);

    indicatorGroup
      .append("line")
      .attr("class", "vertical-indicator")
      .attr("stroke", "lightgray")
      .attr("stroke-width", 2)
      .attr("y1", margin.top)
      .attr("y2", chartHeight + margin.top);

    const dateLabel = indicatorGroup
      .append("text")
      .attr("class", "date-label")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .style("font-family", "var(--font-dm-sans)")
      .attr("y", margin.top + 20);

    // Corner tooltip
    const cornerTooltip = svg.append("g").attr("class", "corner-tooltip").style("opacity", 0);

    // Event capture area
    const eventOverlay = svg
      .append("rect")
      .attr("class", "event-overlay")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    return {
      mouseFollowLine,
      indicatorGroup,
      dateLabel,
      cornerTooltip,
      eventOverlay,
    };
  }

  function updateCornerTooltip(
    tooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: ProcessedScoreDataPoint,
    isRightSide: boolean,
    chartWidth: number,
    scoreOption: string
  ) {
    tooltip.selectAll("*").remove();

    const padding = 12;
    const background = tooltip.append("rect").attr("fill", "#333943").attr("rx", 8).attr("ry", 8);

    const dateText = tooltip
      .append("text")
      .attr("x", padding)
      .attr("y", padding + 12)
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .style("font-family", "var(--font-dm-sans)")
      .style("font-size", "15px")
      .style("line-height", "22.5px")
      .text(`Date: ${data.targetDate.toUTCString().slice(5, 16)}`);

    const refDateText = tooltip
      .append("text")
      .attr("x", padding)
      .attr("y", padding + 36)
      .attr("fill", "white")
      .style("font-family", "var(--font-dm-sans)")
      .style("font-size", "13px")
      .style("line-height", "22.5px")
      .text(`Forecast Submission Date: ${data.referenceDate.toUTCString().slice(5, 16)}`);

    const scoreText = tooltip
      .append("text")
      .attr("x", padding)
      .attr("y", padding + 60)
      .attr("fill", "white")
      .style("font-family", "var(--font-dm-sans)")
      .style("font-size", "13px")
      .style("line-height", "22.5px")
      .text(`${scoreOption}: ${scoreOption === "MAPE" ? `${data.score.toFixed(1)}%` : data.score.toFixed(3)}`);

    const textWidth = Math.max(
      dateText.node()!.getComputedTextLength(),
      refDateText.node()!.getComputedTextLength(),
      scoreText.node()!.getComputedTextLength()
    );

    background.attr("width", textWidth + padding * 2).attr("height", 84);

    const tooltipX = isRightSide ? chartWidth - textWidth + padding * 3 : padding * 5;

    tooltip.attr("transform", `translate(${tooltipX}, 10)`).style("opacity", 1);
  }

  function findClosestDataPoint(
    mouseX: number,
    xScale: d3.ScaleBand<string>,
    margin: any,
    filteredData: ProcessedScoreDataPoint[]
  ): ProcessedScoreDataPoint | null {
    if (filteredData.length === 0) return null;

    // Adjust mouseX to account for margin
    const adjustedX = mouseX - margin.left;

    // Get all the dates in our scale
    const dates = xScale.domain().map((dateStr) => new Date(dateStr));

    // Find the closest date based on x position
    const bandWidth = xScale.bandwidth();
    const step = xScale.step();
    const index = Math.floor(adjustedX / step);

    // Ensure we're within bounds
    if (index < 0) return filteredData[0];
    if (index >= dates.length) return filteredData[filteredData.length - 1];

    // Find the actual data point closest to this date
    const targetDate = dates[index];
    return filteredData.find((d) => d.targetDate.getTime() === targetDate.getTime()) || null;
  }

  function createScalesAndAxes(
    saturdayDates: Date[],
    processedData: ProcessedScoreDataPoint[],
    chartWidth: number,
    chartHeight: number,
    scoreOption: string
  ) {
    // Create band scale for x-axis
    const xScale = d3
      .scaleBand()
      .domain(saturdayDates.map((d) => d.toISOString()))
      .range([0, chartWidth])
      .padding(0.08);

    // Calculate y-scale domain
    const scores = processedData.map((d) => d.score);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 1;
    const yDomain = [0, maxScore * 1.02];

    const yScale = d3.scaleLinear().domain(yDomain).range([chartHeight, 0]).nice();

    // Create axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(saturdayDates.map((d) => d.toISOString()))
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
        const isFirst = date.getTime() === saturdayDates[0].getTime();

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

    const yAxis = d3.axisLeft(yScale).tickFormat((d: number) => {
      if (scoreOption === "MAPE") {
        return d >= 10 ? `${d.toFixed(0)}%` : `${d.toFixed(1)}%`;
      }
      return d.toFixed(1);
    });

    return { xScale, yScale, xAxis, yAxis };
  }

  function updateVisuals(
    event: any,
    {
      mouseFollowLine,
      indicatorGroup,
      dateLabel,
      cornerTooltip,
      xScale,
      margin,
      chartWidth,
      processedData,
      isDragging,
      scoreOption,
    }: {
      mouseFollowLine: d3.Selection<SVGLineElement, unknown, null, undefined>;
      indicatorGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
      dateLabel: d3.Selection<SVGTextElement, unknown, null, undefined>;
      cornerTooltip: d3.Selection<SVGGElement, unknown, null, undefined>;
      xScale: d3.ScaleBand<string>;
      margin: { top: number; right: number; bottom: number; left: number };
      chartWidth: number;
      processedData: ProcessedScoreDataPoint[];
      isDragging: boolean;
      scoreOption: string;
    }
  ) {
    const [mouseX] = d3.pointer(event);
    const dataPoint = findClosestDataPoint(mouseX, xScale, margin, processedData);

    if (!dataPoint) return;

    // Calculate position using the band scale
    const xPos = (xScale(dataPoint.targetDate.toISOString()) || 0) + xScale.bandwidth() / 2 + margin.left;
    const isRightSide = mouseX < chartWidth / 2;

    mouseFollowLine.attr("transform", `translate(${xPos}, 0)`).style("opacity", 1);

    if (isDragging) {
      indicatorGroup.attr("transform", `translate(${xPos}, 0)`).style("opacity", 1);

      dateLabel
        .attr("x", isRightSide ? 5 : -5)
        .attr("text-anchor", isRightSide ? "start" : "end")
        .text(dataPoint.targetDate.toUTCString().slice(5, 16));
    }

    updateCornerTooltip(cornerTooltip, dataPoint, isRightSide, chartWidth, scoreOption);
  }

  function renderVisualElements(
    chart: d3.Selection<SVGGElement, unknown, null, undefined>,
    processedData: ProcessedScoreDataPoint[],
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    modelName: string,
    scoreOption: string
  ) {
    // Draw reference line at y = 1 for WIS_ratio
    if (scoreOption === "WIS/Baseline") {
      chart
        .append("line")
        .attr("x1", 0)
        .attr("x2", xScale.range()[1])
        .attr("y1", yScale(1))
        .attr("y2", yScale(1))
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "1,0")
        .attr("opacity", 0.8);
    }

    // Create container for all visual elements
    const visualContainer = chart.append("g").attr("class", "visual-container");

    // Create specific groups for different visual elements
    const linesGroup = visualContainer.append("g").attr("class", "lines");
    const pointsGroup = visualContainer.append("g").attr("class", "points");

    // Modified line generator
    const line = d3
      .line<ProcessedScoreDataPoint>()
      .defined((d) => !isNaN(d.score))
      .x((d) => (xScale(d.targetDate.toISOString()) || 0) + xScale.bandwidth() / 2)
      .y((d) => yScale(d.score));

    // Draw line
    linesGroup
      .append("path")
      .datum(processedData)
      .attr("fill", "none")
      .attr("stroke", modelColorMap[modelName])
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw points
    pointsGroup
      .selectAll("circle")
      .data(processedData)
      .enter()
      .append("circle")
      .attr("cx", (d) => (xScale(d.targetDate.toISOString()) || 0) + xScale.bandwidth() / 2)
      .attr("cy", (d) => yScale(d.score))
      .attr("r", 4)
      .attr("fill", modelColorMap[modelName]);
  }

  /**
   * Helper function to wrap x-axis labels for better readability
   */
  function wrapAxisLabels(text: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>, width: number) {
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

  function renderChart() {
    if (!chartRef.current || !dimensions.width || !dimensions.height) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    // Setup dimensions
    const width = dimensions.width;
    const height = dimensions.height;
    const margin = {
      top: Math.max(height * 0.018, 20),
      right: Math.max(width * 0.005, 5),
      bottom: Math.max(height * 0.215, 20),
      left: Math.max(width * 0.005, 50),
    };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Get data range and prepare data
    const [actualStart, actualEnd] = findActualDataRange(
      groundTruthData,
      predictionsData,
      evaluationsSingleModelViewModel,
      evaluationsSingleModelViewSelectedStateCode,
      [evaluationsSingleModelViewDateStart, evaluationSingleModelViewDateEnd],
      evaluationSingleModelViewHorizon
    );

    // Generate all Saturdays within the actual date range
    const saturdayDates = generateSaturdayDates(actualStart, actualEnd);

    // Process score data to match with x-axis dates
    const processedData = processScoreData(
      evaluationsScoreData,
      evaluationsSingleModelViewModel,
      evaluationsSingleModelViewSelectedStateCode,
      evaluationSingleModelViewScoresOption,
      evaluationSingleModelViewHorizon,
      saturdayDates
    );

    // Handle when no data is present
    if (processedData.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-family", "var(--font-dm-sans)")
        .text("No score data available for selected criteria");
      return;
    }

    // Create scales and axes
    const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
      saturdayDates,
      processedData,
      chartWidth,
      chartHeight,
      evaluationSingleModelViewScoresOption
    );

    // Create main chart group
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Render visual elements
    renderVisualElements(chart, processedData, xScale, yScale, evaluationsSingleModelViewModel, evaluationSingleModelViewScoresOption);

    // Add axes with styling
    chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .style("font-family", "var(--font-dm-sans)")
      .call(xAxis)
      .selectAll(".tick text")
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .call(wrapAxisLabels, 20);

    chart
      .append("g")
      .style("font-family", "var(--font-dm-sans)")
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").attr("stroke-opacity", 0.5).attr("stroke-dasharray", "2,2").attr("x2", chartWidth))
      .style("font-size", "18px");

    // Add interactivity
    const interactiveElements = createInteractiveElements(svg, margin, chartWidth, chartHeight);
    const { mouseFollowLine, indicatorGroup, dateLabel, cornerTooltip, eventOverlay } = interactiveElements;

    // Add interaction handlers
    let isDragging = isDraggingRef.current;

    eventOverlay
      .on("mousemove", (event) => {
        const params = {
          mouseFollowLine,
          indicatorGroup,
          dateLabel,
          cornerTooltip,
          xScale,
          margin,
          chartWidth,
          processedData,
          isDragging,
          scoreOption: evaluationSingleModelViewScoresOption,
        };
        updateVisuals(event, params);
      })
      .on("mouseout", () => {
        mouseFollowLine.style("opacity", 0);
        isDragging = false;
      })
      .on("mousedown", (event) => {
        isDraggingRef.current = true;
        isDragging = true;
        const params = {
          mouseFollowLine,
          indicatorGroup,
          dateLabel,
          cornerTooltip,
          xScale,
          margin,
          chartWidth,
          processedData,
          isDragging,
          scoreOption: evaluationSingleModelViewScoresOption,
        };
        updateVisuals(event, params);
        indicatorGroup.style("opacity", 1);
      })
      .on("mouseup", () => {
        isDragging = false;
      })
      .on("mouseleave", () => {
        isDragging = false;
      });

    // Ensure tooltip is always on top
    cornerTooltip.raise();
  }

  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0) {
      renderChart();
    }
  }, [
    dimensions,
    isResizing,
    evaluationsSingleModelViewModel,
    evaluationsSingleModelViewSelectedStateCode,
    evaluationsSingleModelViewDateStart,
    evaluationSingleModelViewDateEnd,
    evaluationSingleModelViewScoresOption,
    evaluationSingleModelViewHorizon,
    evaluationsScoreData,
  ]);

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={chartRef}
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

export default SingleModelScoreLineChart;
