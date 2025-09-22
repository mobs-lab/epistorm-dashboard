// src/app/components/forecasts-components/ForecastChart.tsx
"use client";

import * as d3 from "d3";
import { Axis, NumberValue } from "d3";
import React, { useCallback, useEffect, useRef } from "react";

import { modelColorMap } from "@/types/common";
import { SurveillanceSingleWeekDataPoint } from "@/types/domains/forecasting";
import { useChartMargins } from "@/utils/chart-margin-utils";
import { isUTCDateEqual } from "@/utils/date";
import { useResponsiveSVG } from "@/utils/responsiveSVG";

import { updateUserSelectedWeek } from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectExtendedGroundTruthInRange,
  selectGroundTruthInRange,
  selectHistoricalDataForWeek,
  selectLocationData,
  selectPredictionsForMultipleModels,
} from "@/store/selectors";

interface ConfidenceIntervalData {
  interval: string;
  data: any[];
}
type PredictionDataForRender = { [modelName: string]: ConfidenceIntervalData[] };

const ForecastChart: React.FC = () => {
  const dispatch = useAppDispatch();
  const svgRef = useRef<SVGSVGElement>(null);
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const margins = useChartMargins(dimensions.width, dimensions.height, "default");

  // Get all settings variables from Redux
  const {
    userSelectedWeek,
    USStateNum,
    selectedForecastModels: forecastModel,
    numOfWeeksAhead,
    dateStart,
    dateEnd,
    yAxisScale,
    confidenceInterval,
    historicalDataMode,
  } = useAppSelector((state) => state.forecastSettings);

  // Get data using new selectors
  const locationData = useAppSelector(selectLocationData);
  const groundTruthData = useAppSelector((state) => selectGroundTruthInRange(state, dateStart, dateEnd, USStateNum));
  const extendedGroundTruthData = useAppSelector((state) =>
    selectExtendedGroundTruthInRange(state, dateStart, dateEnd, numOfWeeksAhead, USStateNum)
  );
  const allModelPredictions = useAppSelector((state) =>
    selectPredictionsForMultipleModels(state, forecastModel, USStateNum, userSelectedWeek, numOfWeeksAhead)
  );

  // Get historical ground truth data
  const historicalGroundTruthData = useAppSelector((state) => selectHistoricalDataForWeek(state, userSelectedWeek, USStateNum));

  // Convert new prediction data structure to the format expected by rendering functions
  const convertPredictionsToRenderFormat = useCallback(
    (predictions: any) => {
      const result: PredictionDataForRender = {};

      Object.entries(predictions).forEach(([modelName, modelPredictions]: [string, any]) => {
        if (!modelPredictions || Object.keys(modelPredictions).length === 0) {
          result[modelName] = [];
          return;
        }

        // Convert the new structure to the old format for compatibility
        const convertedData = Object.entries(modelPredictions).map(([targetDateISO, pred]: [string, any]) => ({
          referenceDate: userSelectedWeek,
          targetEndDate: new Date(targetDateISO),
          stateNum: USStateNum,
          confidence025: pred.q05,
          confidence050: pred.q05,
          confidence250: pred.q25,
          confidence500: pred.median,
          confidence750: pred.q75,
          confidence950: pred.q95,
          confidence975: pred.q95,
          confidence_low: 0, // Will be set below
          confidence_high: 0, // Will be set below
        }));

        // Create confidence interval data
        const confidenceIntervalData = [];

        if (confidenceInterval.includes("50")) {
          confidenceIntervalData.push({
            interval: "50",
            data: convertedData.map((d) => ({ ...d, confidence_low: d.confidence250, confidence_high: d.confidence750 })),
          });
        }

        if (confidenceInterval.includes("90")) {
          confidenceIntervalData.push({
            interval: "90",
            data: convertedData.map((d) => ({ ...d, confidence_low: d.confidence050, confidence_high: d.confidence950 })),
          });
        }

        if (confidenceInterval.includes("95")) {
          confidenceIntervalData.push({
            interval: "95",
            data: convertedData.map((d) => ({ ...d, confidence_low: d.confidence025, confidence_high: d.confidence975 })),
          });
        }

        if (confidenceIntervalData.length === 0) {
          confidenceIntervalData.push({
            interval: "",
            data: convertedData,
          });
        }

        result[modelName] = confidenceIntervalData;
      });

      return result;
    },
    [userSelectedWeek, USStateNum, confidenceInterval]
  );

  const createScalesAndAxes = useCallback(
    (ground: SurveillanceSingleWeekDataPoint[], predictions: any, chartWidth: number, chartHeight: number, yAxisScale: string) => {
      // Find the maximum date in the ground truth data, but within the `dateStart` and `dateEnd` range, to avoid showing horizon-ahead data
      // const maxGroundTruthDate = d3.max(ground, (d) => d.date) as Date;
      const maxGroundTruthDate = d3.max(ground, (d) => d.date) as Date;

      // Find the maximum date in the prediction data
      let maxPredictionDate = new Date(0);
      if (predictions && Object.keys(predictions).length > 0) {
        Object.values(predictions).forEach((modelData: any) => {
          modelData.forEach((intervalData: any) => {
            intervalData.data.forEach((dataPoint: any) => {
              const targetEndDate = new Date(dataPoint.targetEndDate);
              if (targetEndDate > maxPredictionDate) {
                maxPredictionDate = targetEndDate;
              }
            });
          });
        });
      }

      // Use the maximum date from both sources
      const maxDate = d3.max([maxGroundTruthDate, maxPredictionDate]) as Date;

      const xScale = d3.scaleUtc().domain([dateStart, maxDate]).range([0, chartWidth]);

      // Generate ticks for all Saturdays within the date range
      const allSaturdayTracker = d3.timeDay.range(dateStart, maxDate).filter((d) => d.getDay() === 6);

      // Determine ideal tick count based on chart width
      const getIdealTickCount = (width: number, totalTicks: number) => {
        if (width < 500) {
          // Short width mode: 6-12 ticks
          return Math.min(Math.max(6, Math.min(totalTicks, 12)), 12);
        } else {
          // Normal width mode: 8-18 ticks
          return Math.min(Math.max(8, Math.min(totalTicks, 18)), 18);
        }
      };

      const idealTickCount = getIdealTickCount(chartWidth, allSaturdayTracker.length);

      // Select evenly spaced Saturdays if we have too many
      let selectedTicks = allSaturdayTracker;
      if (allSaturdayTracker.length > idealTickCount) {
        const tickInterval = Math.max(1, Math.floor(allSaturdayTracker.length / idealTickCount));
        selectedTicks = allSaturdayTracker.filter((_, i) => i % tickInterval === 0);

        // Always ensure the first and last ticks are included
        if (!isUTCDateEqual(selectedTicks[0], allSaturdayTracker[0])) {
          selectedTicks.unshift(allSaturdayTracker[0]);
        }
      }

      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(selectedTicks)
        .tickFormat((date, i) => {
          const dateObj = date instanceof Date ? date : new Date(date as number);
          const year = d3.timeFormat("%Y")(dateObj);
          const month = d3.timeFormat("%b")(dateObj);
          const day = d3.timeFormat("%d")(dateObj);

          // First tick always gets full treatment
          if (i === 0) {
            return `${year}\n${month}\n${day}`;
          }

          const prevDate = selectedTicks[i - 1];
          // Ensure both date and prevDate are Date objects (d3 may pass number timestamps)
          const prevDateObj = prevDate instanceof Date ? prevDate : new Date(prevDate as number);
          const isNewYear = dateObj.getUTCFullYear() > prevDateObj.getUTCFullYear();
          const isNewMonth = dateObj.getUTCMonth() !== prevDateObj.getUTCMonth();

          if (chartWidth < 500) {
            // Compact mode for narrow charts
            if (isNewYear) {
              return `${year}\n${month}`;
            } else if (isNewMonth) {
              return month;
            }
            return ""; // Hide other labels to reduce clutter
          } else {
            // Full mode for wider charts
            if (isNewYear) {
              return `${year}\n${month}\n${day}`;
            } else if (isNewMonth) {
              return `${month}\n${day}`;
            }
            return day;
          }
        });

      xAxis.tickSize(14); // Increase tick size to accommodate multi-line labels

      // Initialize yScale with a default linear scale
      // Update yScale
      let yScale: d3.ScaleSymLog<number, number> | d3.ScaleLinear<number, number>;

      const maxGroundTruthValue = d3.max(
        ground.filter((d) => d.admissions !== -1),
        (d) => d.admissions
      ) as number;

      let maxPredictionValue = 0;
      if (predictions && Object.keys(predictions).length > 0) {
        Object.values(predictions).forEach((modelData: any) => {
          modelData.forEach((intervalData: any) => {
            intervalData.data.forEach((dataPoint: any) => {
              const highValue = dataPoint.confidence_high || dataPoint.confidence950 || dataPoint.confidence750;
              if (highValue > maxPredictionValue) {
                maxPredictionValue = highValue;
              }
            });
          });
        });
      }

      let maxValue = Math.max(maxGroundTruthValue || 0, maxPredictionValue);

      let minValue = d3.min(
        ground.filter((d) => d.admissions !== -1),
        (d) => d.admissions
      ) as number;

      if (maxValue === minValue) {
        maxValue = maxValue + 1;
        minValue = Math.max(0, minValue - 1);
      }

      const isLogScale = yAxisScale === "log";

      if (yAxisScale === "linear") {
        yScale = d3
          .scaleLinear()
          .domain([0, maxValue * 1.1])
          .range([chartHeight, 0]);
      } else {
        const constant = minValue > 0 ? minValue / 2 : 1;
        yScale = d3
          .scaleSymlog()
          .domain([0, maxValue * 1.2])
          .constant(constant)
          .range([chartHeight, 0]);
      }

      const ticks = generateYAxisTicks(minValue, maxValue, isLogScale);

      const yAxis = d3
        .axisLeft(yScale)
        .tickValues(ticks)
        .tickFormat((d) => {
          const val = d.valueOf();
          if (val === 0) return "0";
          if (val >= 10000) return d3.format(".2~s")(val);
          if (val >= 1000) return d3.format(".2~s")(val);
          if (val >= 100) return d3.format(".0f")(val);
          if (val >= 10) return d3.format(".0f")(val);
          if (val >= 1) return d3.format(".0f")(val);
          return d3.format(".1f")(val);
        });

      yAxis.tickSize(-chartWidth);

      return { xScale, yScale, xAxis, yAxis };
    },
    [dateStart]
  );

  function generateYAxisTicks(minValue: number, maxValue: number, isLogScale: boolean): number[] {
    const desiredTickCount = 8;

    if (isLogScale) {
      // Keep the existing logarithmic scale logic
      const minExp = minValue <= 0 ? 0 : Math.floor(Math.log10(minValue));
      const maxExp = Math.ceil(Math.log10(maxValue));
      let ticks: number[] = [];

      for (let exp = minExp; exp <= maxExp; exp++) {
        const base = Math.pow(10, exp);
        ticks.push(base);
        if (exp < maxExp - 1 || (exp === maxExp - 1 && maxValue / base > 5)) {
          ticks.push(2.5 * base);
          ticks.push(5 * base);
        }
      }
      ticks = ticks.filter((tick) => tick >= minValue && tick <= maxValue);
      // if (ticks.length > desiredTickCount) {
      //     const step = Math.ceil(ticks.length / desiredTickCount);
      //     ticks = ticks.filter((_, index) => index % step === 0);
      // }
      return ticks;
    } else {
      // Improved linear scale logic
      const range = maxValue - minValue;
      const roughStep = range / (desiredTickCount - 1);

      // Find the nearest nice step value
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
      let step = magnitude;
      if (roughStep / magnitude >= 5) step *= 5;
      else if (roughStep / magnitude >= 2) step *= 2;

      // Calculate the start and end values
      const start = Math.floor(minValue / step) * step;
      const end = Math.ceil(maxValue / step) * step;

      let ticks: number[] = [];
      for (let tick = start; tick <= end; tick += step) {
        ticks.push(Number(tick.toFixed(2)));
      }

      // If we have too many ticks, reduce them
      if (ticks.length > desiredTickCount) {
        const stride = Math.ceil(ticks.length / desiredTickCount);
        ticks = ticks.filter((_, index) => index % stride === 0);
      }

      // If we still don't have enough ticks, add intermediate values
      while (ticks.length < desiredTickCount) {
        const newTicks = [];
        for (let i = 0; i < ticks.length - 1; i++) {
          newTicks.push(ticks[i]);
          const middleValue = (ticks[i] + ticks[i + 1]) / 2;
          newTicks.push(Number(middleValue.toFixed(2)));
        }
        newTicks.push(ticks[ticks.length - 1]);
        ticks = newTicks;
      }

      // If we have too many ticks after adding intermediate values, reduce them again
      if (ticks.length > desiredTickCount) {
        const stride = Math.ceil(ticks.length / desiredTickCount);
        ticks = ticks.filter((_, index) => index % stride === 0);
      }

      return ticks;
    }
  }

  function renderGroundTruthData(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    surveillanceData: SurveillanceSingleWeekDataPoint[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLogarithmic<number, number> | d3.ScaleLinear<number, number>,
    marginLeft: number,
    marginTop: number
  ) {
    // Remove existing ground truth data-slices paths and circles
    svg.selectAll(".ground-truth-path, .ground-truth-dot").remove();

    const line = d3
      .line<SurveillanceSingleWeekDataPoint>()
      .defined((d) => d.admissions !== -1 || d.admissions === null) // Include placeholder points
      .x((d) => xScale(d.date))
      .y((d) => (d.admissions !== -1 ? yScale(d.admissions) : yScale.range()[0])); // Use bottom of chart for placeholders

    svg
      .append("path")
      .datum(surveillanceData)
      .attr("class", "ground-truth-path")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("d", line)
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // Add circles for ground truth data-slices points (including placeholders)
    svg
      .selectAll(".ground-truth-dot")
      .data(surveillanceData)
      .enter()
      .append("circle")
      .attr("class", "ground-truth-dot")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => (d.admissions !== -1 ? yScale(d.admissions) : yScale.range()[0]))
      .attr("r", 3)
      .attr("fill", (d) => (d.admissions !== -1 ? "white" : "transparent"))
      .attr("stroke", (d) => (d.admissions !== -1 ? "white" : "transparent"))
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);
  }

  const renderHistoricalData = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      historicalData: SurveillanceSingleWeekDataPoint[],
      xScale: d3.ScaleTime<number, number>,
      yScale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>,
      marginLeft: number,
      marginTop: number
    ) => {
      if (!historicalData || historicalData.length === 0) {
        console.debug("DEBUG: No historical data available for the selected week.");
        return;
      }

      /*Ensure the historical data-slices to be drawn is cutoff before dateStart*/
      const historicalDataToDraw = historicalData.filter((d) => d.date >= dateStart);

      const historicalLine = d3
        .line<SurveillanceSingleWeekDataPoint>()
        .defined((d) => d.admissions !== -1 && !isNaN(d.admissions))
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.admissions));

      svg
        .append("path")
        .datum(historicalDataToDraw.filter((d) => d.admissions !== -1 && !isNaN(d.admissions) && d.stateNum === USStateNum))
        .attr("class", "historical-ground-truth-path")
        .attr("fill", "none")
        .attr("stroke", "#FFA500") // Orange color for historical data-slices
        .attr("stroke-width", 3)
        .attr("d", historicalLine)
        .attr("transform", `translate(${marginLeft}, ${marginTop})`);

      svg
        .selectAll(".historical-ground-truth-dot")
        .data(historicalDataToDraw.filter((d) => d.admissions !== -1 && !isNaN(d.admissions) && d.stateNum === USStateNum))
        .enter()
        .append("circle")
        .attr("class", "historical-ground-truth-dot")
        .attr("cx", (d) => xScale(d.date))
        .attr("cy", (d) => yScale(d.admissions))
        .attr("r", 6) // Slightly larger than current ground truth dots
        .attr("fill", "#FFA500")
        .attr("transform", `translate(${marginLeft}, ${marginTop})`);
    },
    [dateStart, USStateNum]
  );

  function renderPredictionData(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    predictionData: PredictionDataForRender,
    xScale: d3.ScaleTime<number, number, never>,
    yScale: d3.ScaleLinear<number, number, never>,
    marginLeft: number,
    marginTop: number,
    confidenceInterval: string[],
    isGroundTruthDataPlaceHolderOnly: boolean
  ) {
    // Remove existing prediction data-slices paths and circles
    svg.selectAll(".prediction-path, .prediction-dot, .confidence-area").remove();

    // Check if predictionData is not empty
    if (Object.keys(predictionData).length > 0) {
      // Get an array of values from the predictionData object
      const predictionDataArray = Object.values(predictionData);

      predictionDataArray.forEach((predictions, index) => {
        if (predictions[0]?.data) {
          const modelName = Object.keys(predictionData)[index];
          const modelColor = modelColorMap[modelName] || `hsl(${index * 60}, 100%, 50%)`;

          // Render prediction data-slices points
          const line = d3
            .line<any>()
            .x((d) => xScale(new Date(d.targetEndDate)))
            .y((d) => yScale(d.confidence500));

          if (isGroundTruthDataPlaceHolderOnly) {
            // If there is only a placeholder data-slices point, render the prediction data-slices as its own branch
            svg
              .append("path")
              .datum(predictions[0].data)
              .attr("class", "prediction-path")
              .attr("fill", "none")
              .attr("stroke", modelColor)
              .attr("stroke-width", 1.5)
              .attr("d", line)
              .attr("transform", `translate(${marginLeft}, ${marginTop})`);
          } else {
            // Render prediction data-slices points as usual
            svg
              .append("path")
              .datum(predictions[0].data)
              .attr("class", "prediction-path")
              .attr("fill", "none")
              .attr("stroke", modelColor)
              .attr("stroke-width", 1.5)
              .attr("d", line)
              .attr("transform", `translate(${marginLeft}, ${marginTop})`);

            // Add circles for prediction data-slices points
            svg
              .selectAll(`.prediction-dot-${index}`)
              .data(predictions[0].data)
              .enter()
              .append("circle")
              .attr("class", `prediction-dot prediction-dot-${index}`)
              .attr("cx", (d: any) => xScale(new Date(d.targetEndDate)))
              .attr("cy", (d: any) => yScale(d.confidence500))
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

          predictions.forEach((confidenceIntervalData: ConfidenceIntervalData) => {
            const area = d3
              .area<any>()
              .x((d) => xScale(new Date(d.targetEndDate)))
              .y0((d) => yScale(d.confidence_low))
              .y1((d) => yScale(d.confidence_high));

            const opacity =
              confidenceIntervalData.interval === "50"
                ? 0.4
                : confidenceIntervalData.interval === "90"
                  ? 0.2
                  : confidenceIntervalData.interval === "95"
                    ? 0.1
                    : 1;

            const color = d3.color(modelColor);
            if (!color) return;
            color.opacity = opacity;

            svg
              .append("path")
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

  function createVerticalIndicator(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleTime<number, number>,
    marginLeft: number,
    marginTop: number,
    height: number,
    marginBottom: number
  ) {
    const group = svg.append("g").attr("class", "vertical-indicator-group");

    const line = group
      .append("line")
      .attr("class", "vertical-indicator")
      .attr("stroke", "gray")
      .attr("stroke-width", 0.8)
      .attr("y1", marginTop)
      .attr("y2", height - marginBottom);

    const tooltip = group
      .append("text")
      .attr("class", "line-tooltip")
      .attr("fill", "white")
      .attr("font-size", 12)
      .attr("text-anchor", "end")
      .style("font-family", "var(--font-dm-sans)")
      .attr("y", marginTop + 5);

    /* Change the accompaning tooltip text to DM Sans*/

    return { group, line, tooltip };
  }

  const updateVerticalIndicator = useCallback(
    (
      date: Date,
      xScale: d3.ScaleTime<number, number>,
      marginLeft: number,
      chartWidth: number,
      group: d3.Selection<SVGGElement, unknown, null, undefined>,
      tooltip: d3.Selection<SVGTextElement, unknown, null, undefined>
    ) => {
      const xPosition = xScale(date);
      const epiweek = getEpiweek(date);
      const isLeftSide = xPosition < chartWidth / 5;

      group.attr("transform", `translate(${xPosition + marginLeft}, 0)`);

      group.select("line").attr("stroke", "lightgray").attr("stroke-width", 2);

      tooltip
        .attr("x", isLeftSide ? 5 : -5)
        .attr("text-anchor", isLeftSide ? "start" : "end")
        // .text(`${date.toLocaleDateString()} (Week ${epiweek})`)
        .text(`${date.toUTCString().slice(0, 16)} (Week ${epiweek})`)
        .attr("fill", "white")
        .style("font-family", "var(--font-dm-sans), sans-serif");
    },
    []
  );

  function getEpiweek(date: Date): number {
    const startOfYear = new Date(date.getUTCFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  function createMouseFollowLine(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    marginLeft: number,
    marginTop: number,
    height: number,
    marginBottom: number
  ) {
    return svg
      .append("line")
      .attr("class", "mouse-follow-line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .attr("y1", marginTop)
      .attr("y2", height - marginBottom)
      .style("opacity", 0);
  }

  function createCornerTooltip(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, marginLeft: number, marginTop: number) {
    return svg
      .append("g")
      .attr("class", "corner-tooltip")
      .attr("transform", `translate(${marginLeft + 40}, ${marginTop})`)
      .style("opacity", 0)
      .attr("pointer-events", "none");
  }

  const updateCornerTooltip = useCallback(
    (
      data: SurveillanceSingleWeekDataPoint,
      predictionData: any,
      historicalGroundTruthData: SurveillanceSingleWeekDataPoint[],
      xScale: d3.ScaleTime<number, number>,
      chartWidth: number,
      marginLeft: number,
      marginTop: number,
      cornerTooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
      isHistoricalDataMode: boolean
    ) => {
      // Clear existing content
      cornerTooltip.selectAll("*").remove();

      // Layout constants
      const layout = {
        padding: 10,
        lineHeight: 20,
        sectionGap: 10,
        modelColorBoxSize: 12,
        colGap: 30,
        fontFamily: "var(--font-dm-sans), sans-serif",
        fontSize: "13px",
        fontColor: "white",
        bgColor: "#333943",
        // Define column widths for the prediction table
        medianColWidth: 60,
        piColWidth: 110,
      };
      // --- 2. PREPARE DATA ---
      const currentPredictions = findPredictionsForDate(predictionData, data.date);
      const ciOptions: { label: string; low: string; high: string }[] = [];
      if (confidenceInterval.includes("50")) ciOptions.push({ label: "50% PI", low: "confidence250", high: "confidence750" });
      if (confidenceInterval.includes("90")) ciOptions.push({ label: "90% PI", low: "confidence050", high: "confidence950" });
      if (confidenceInterval.includes("95")) ciOptions.push({ label: "95% PI", low: "confidence025", high: "confidence975" });

      let maxWidth = 0;
      let currentY = layout.padding + 8;

      // --- 3. BUILD TOOLTIP CONTENT (in a container group) ---
      // This container will hold all text and shapes. We'll measure this group.
      const contentGroup = cornerTooltip.append("g");

      // Helper function to add a line of text and update dimensions
      const addTextLine = (label: string, value: string, yPos: number) => {
        const text = contentGroup
          .append("text")
          .attr("x", layout.padding)
          .attr("y", yPos)
          .attr("fill", layout.fontColor)
          .style("font-family", layout.fontFamily)
          .attr("font-size", layout.fontSize);

        text.append("tspan").text(label);
        text.append("tspan").text(value).attr("font-weight", "bold");

        // Update the maximum width needed for the tooltip
        const node = text.node();
        if (node) {
          maxWidth = Math.max(maxWidth, node.getComputedTextLength());
        }
        return yPos + layout.lineHeight;
      };

      // A. Add Date and Admissions Info
      currentY = addTextLine("Date: ", data.date.toUTCString().slice(5, 16), currentY);
      currentY = addTextLine("Admissions: ", formatNumber(data.admissions, true), currentY);

      // B. Add Historical Admissions Info (if toggled)
      if (isHistoricalDataMode && historicalGroundTruthData) {
        const historicalValue =
          historicalGroundTruthData.find((entry) => isUTCDateEqual(entry.date, data.date) && entry.stateNum === data.stateNum)
            ?.admissions || NaN;
        currentY = addTextLine("Historical: ", formatNumber(historicalValue, true), currentY);
      }

      // C. Add Prediction Data (if available)
      if (currentPredictions) {
        currentY += layout.sectionGap; // Add space before the prediction section

        // Calculate the total width of the prediction table
        const tableWidth = layout.medianColWidth + ciOptions.length * (layout.piColWidth + layout.colGap);
        maxWidth = Math.max(maxWidth, tableWidth);

        Object.entries(currentPredictions).forEach(([modelName, modelData]: [string, any]) => {
          // Model Name and Color Box
          const modelGroup = contentGroup.append("g").attr("transform", `translate(${layout.padding}, ${currentY})`);

          modelGroup
            .append("rect")
            .attr("width", layout.modelColorBoxSize)
            .attr("height", layout.modelColorBoxSize)
            .attr("y", -layout.modelColorBoxSize / 1.5) // Center align with text
            .attr("fill", modelColorMap[modelName]);

          modelGroup
            .append("text")
            .attr("x", layout.modelColorBoxSize + 6)
            .attr("fill", layout.fontColor)
            .attr("font-weight", "bold")
            .style("font-family", layout.fontFamily)
            .attr("font-size", layout.fontSize)
            .text(modelName);

          currentY += layout.lineHeight;

          // Prediction Table (Headers and Values)
          const tableGroup = contentGroup.append("g").attr("transform", `translate(${layout.padding}, ${currentY})`);

          // Headers
          tableGroup
            .append("text")
            .text("Median")
            .attr("x", 0)
            .attr("fill", layout.fontColor)
            .style("font-family", layout.fontFamily)
            .attr("font-size", layout.fontSize);
          ciOptions.forEach((ci, i) => {
            tableGroup
              .append("text")
              .text(ci.label)
              .attr("x", layout.medianColWidth + layout.colGap + i * (layout.piColWidth + layout.colGap))
              .attr("fill", layout.fontColor)
              .style("font-family", layout.fontFamily)
              .attr("font-size", layout.fontSize);
          });

          currentY += layout.lineHeight;

          // Values
          const valueRow = contentGroup.append("g").attr("transform", `translate(${layout.padding}, ${currentY})`);

          valueRow
            .append("text")
            .text(formatNumber(modelData.confidence500))
            .attr("x", 0)
            .attr("fill", layout.fontColor)
            .style("font-family", layout.fontFamily)
            .attr("font-size", layout.fontSize)
            .attr("font-weight", "bold");

          ciOptions.forEach((ci, i) => {
            const ciText = `[${formatNumber(modelData[ci.low])}, ${formatNumber(modelData[ci.high])}]`;
            valueRow
              .append("text")
              .text(ciText)
              .attr("x", layout.medianColWidth + layout.colGap + i * (layout.piColWidth + layout.colGap))
              .attr("fill", layout.fontColor)
              .style("font-family", layout.fontFamily)
              .attr("font-size", layout.fontSize);
          });

          currentY += layout.lineHeight;
        });
      }

      // --- 4. DRAW BACKGROUND AND POSITION THE TOOLTIP ---
      const EXTRAPADDING = 20;
      const finalWidth = maxWidth + layout.padding * 2 + EXTRAPADDING;
      const finalHeight = currentY + layout.padding - layout.lineHeight / 2;

      // Add the background rectangle now that we have the final dimensions
      contentGroup
        .insert("rect", ":first-child") // Insert behind all content
        .attr("width", finalWidth)
        .attr("height", finalHeight)
        .attr("fill", layout.bgColor)
        .attr("rx", 8)
        .attr("ry", 8);

      // Decide whether to show the tooltip on the left or right
      const cursorX = xScale(data.date);
      const showOnLeftSide = cursorX > chartWidth * 0.5;

      // Calculate the final X position for the entire tooltip group.
      // This is the key to correct alignment. The internal layout is always LTR.
      const tooltipX = showOnLeftSide
        ? marginLeft + 20 // Show on the left side
        : chartWidth + marginLeft - finalWidth; // Show on the right side

      // Apply the final position and make it visible
      cornerTooltip.attr("transform", `translate(${tooltipX}, ${marginTop})`).style("opacity", 1);
    },
    [confidenceInterval]
  );

  function formatNumber(value: number, isAdmission: boolean = false): string {
    if (Number.isNaN(value)) {
      return "N/A";
    }

    if (isAdmission) {
      if (value == -1) {
        return "N/A";
      }
      // Surveillance data-slices should be integer; just in case
      return Math.round(value).toString();
    }

    // For other numbers (predictions and confidence intervals)
    if (Number.isInteger(value)) {
      // If whole number, return as is
      return value.toString();
    }

    // For decimal numbers, use toFixed(2) but trim unnecessary zeros
    const fixed = value.toFixed(2);
    // Remove trailing zeros after decimal point, and remove decimal point if no decimals
    return fixed.replace(/\.?0+$/, "");
  }

  function findPredictionsForDate(predictionData: any, date: Date) {
    const foundPredictions: { [key: string]: any } = {};
    Object.entries(predictionData).forEach(([modelName, modelPredictions]: [string, any]) => {
      const prediction = modelPredictions[0].data.find((p: any) => isUTCDateEqual(new Date(p.targetEndDate), date));
      if (prediction) {
        foundPredictions[modelName] = prediction;
      }
    });
    return Object.keys(foundPredictions).length > 0 ? foundPredictions : null;
  }

  function createEventOverlay(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    marginLeft: number,
    marginTop: number,
    chartWidth: number,
    chartHeight: number
  ) {
    return svg
      .append("rect")
      .attr("class", "event-overlay")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .style("fill", "none")
      .style("pointer-events", "all");
  }

  function appendAxes(
    svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
    xAxis: Axis<NumberValue>,
    yAxis: Axis<NumberValue>,
    xScale: d3.ScaleTime<number, number, never>,
    marginLeft: number,
    marginTop: number,
    chartWidth: number,
    chartHeight: number,
    dateStart: Date,
    dateEnd: Date
  ) {
    // Append x-axis
    const xAxisGroup = svg
      .append("g")
      .attr("transform", `translate(${marginLeft}, ${chartHeight + marginTop})`)
      .style("font-family", "var(--font-dm-sans)")
      .call(xAxis);

    function wrap(text: d3.Selection<d3.BaseType, unknown, SVGGElement, any>, width: number) {
      text.each(function (this: d3.BaseType) {
        var text = d3.select(this),
          words = text.text().split(/\n+/).reverse(),
          word,
          line: string[] = [],
          lineNumber = 0,
          lineHeight = 1.0, // ems
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text
            .text(null)
            .append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", dy + "em");
        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          const node = tspan.node();
          if (node && node.getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text
              .append("tspan")
              .attr("x", 0)
              .attr("y", y)
              .attr("dy", ++lineNumber * lineHeight + dy + "em")
              .text(word);
          }
        }
      });
    }

    // Style x-axis ticks
    xAxisGroup.selectAll(".tick text").style("text-anchor", "middle").attr("dy", "1em").style("font-size", "13px").call(wrap, 32); // 32 is the minimum width to accommodate year number at 1080p 100% zoom view environment

    // Add year labels if the date range is more than a year
    const timeDiff = dateEnd.getTime() - dateStart.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff > 365) {
      const years = d3.timeYear.range(dateStart, dateEnd);
      years.push(dateEnd); // Add the end date to ensure the last year is labeled

      xAxisGroup
        .selectAll(".year-label")
        .data(years)
        .enter()
        .append("text")
        .attr("class", "year-label")
        .attr("x", (d) => xScale(d))
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .text((d) => d.getFullYear());
    }

    // Append y-axis
    const yAxisGroup = svg
      .append("g")
      .attr("transform", `translate(${marginLeft}, ${marginTop})`)
      .style("font-family", "var(--font-dm-sans)")

      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").attr("stroke-opacity", 0.5).attr("stroke-dasharray", "2,2"));

    // Style y-axis ticks
    yAxisGroup
      .selectAll(".tick text")
      //Make the font size always as big as possible
      .style("font-size", "18px");
  }

  function findNearestDataPoint(data: SurveillanceSingleWeekDataPoint[], targetDate: Date): SurveillanceSingleWeekDataPoint {
    return data.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.date.getTime() - targetDate.getTime());
      const currDiff = Math.abs(curr.date.getTime() - targetDate.getTime());
      return currDiff < prevDiff ? curr : prev;
    });
  }

  function renderMessage(
    svg: d3.Selection<null, unknown, null, undefined>,
    message: string,
    chartWidth: number,
    chartHeight: number,
    marginLeft: number,
    marginTop: number
  ) {
    svg.selectAll(".message").remove();

    svg
      .append("text")
      .attr("class", "message")
      .style("font-family", "var(--font-dm-sans)")
      .attr("x", chartWidth / 2 + marginLeft)
      .attr("y", chartHeight / 2 + marginTop)
      .attr("text-anchor", "middle")
      .attr("font-size", "22px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(message);
  }

  function createCombinedDataset(
    groundTruthData: SurveillanceSingleWeekDataPoint[],
    predictionData: any
  ): SurveillanceSingleWeekDataPoint[] {
    // First deconstruct the whole of ground truth data-slices into a new array
    let combinedData = [...groundTruthData];

    // Then iterate over each model's predictions
    Object.values(predictionData).forEach((modelPredictions: any) => {
      // For each prediction, check if a data-slices point already exists for that
      modelPredictions[0].data.forEach((prediction: any) => {
        // const existingPoint = combinedData.find((d) => d.date.getTime() === new Date(prediction.targetEndDate).getTime());
        const existingPoint = combinedData.find((d) => isUTCDateEqual(d.date, new Date(prediction.targetEndDate)));
        if (!existingPoint) {
          combinedData.push({
            date: new Date(prediction.targetEndDate),
            admissions: -1,
            stateNum: groundTruthData[0].stateNum,
            stateName: groundTruthData[0].stateName,
            weeklyRate: 0,
          });
        }
      });
    });

    return combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /* Bubble the `userSelectedWeek` to Redux so sibling Nowcast components can also use this information in filtering*/
  const bubbleUserSelectedWeek = useCallback(
    (date: Date) => {
      const utcDate = new Date(date.toISOString());
      console.debug("ForecastChart bubbleUserSelectedWeek: Dispatching standardized UTC date:", utcDate.toISOString());
      dispatch(updateUserSelectedWeek(new Date(date.toISOString()))); // Ensure UTC
    },
    [dispatch]
  );

  const renderChartComponents = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      filteredGroundTruthData: SurveillanceSingleWeekDataPoint[],
      extendedGroundTruthDataForTooltip: SurveillanceSingleWeekDataPoint[],
      processedPredictionData: any,
      historicalGroundTruthData: SurveillanceSingleWeekDataPoint[],
      xScale: d3.ScaleTime<number, number>,
      marginLeft: number,
      marginTop: number,
      chartWidth: number,
      chartHeight: number,
      height: number,
      marginBottom: number
    ) => {
      const combinedData = createCombinedDataset(extendedGroundTruthDataForTooltip, processedPredictionData);

      const mouseFollowLine = createMouseFollowLine(svg, marginLeft, marginTop, height, marginBottom);
      const {
        group: verticalIndicatorGroup,
        line: verticalIndicator,
        tooltip: lineTooltip,
      } = createVerticalIndicator(svg, xScale, marginLeft, marginTop, height, marginBottom);
      const cornerTooltip = createCornerTooltip(svg, marginLeft, marginTop);
      const eventOverlay = createEventOverlay(svg, marginLeft, marginTop, chartWidth, chartHeight);

      let isDragging = false;

      function updateFollowLine(event: any) {
        const [mouseX] = d3.pointer(event);
        const date = xScale.invert(mouseX - marginLeft);
        const closestData = findNearestDataPoint(combinedData, date);

        const snappedX = xScale(closestData.date);
        mouseFollowLine.attr("transform", `translate(${snappedX + marginLeft}, 0)`).style("opacity", 1);

        updateCornerTooltip(
          closestData,
          processedPredictionData,
          historicalGroundTruthData,
          xScale,
          chartWidth,
          marginLeft,
          marginTop,
          cornerTooltip,
          historicalDataMode
        );
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

        console.debug("ForecastChart handleClick: Raw inverted date from chart:", date.toISOString());
        console.debug("ForecastChart handleClick: Snapped to closest data point date:", closestData.date.toISOString());

        bubbleUserSelectedWeek(closestData.date);
        updateVerticalIndicator(closestData.date, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
        updateCornerTooltip(
          closestData,
          processedPredictionData,
          historicalGroundTruthData,
          xScale,
          chartWidth,
          marginLeft,
          marginTop,
          cornerTooltip,
          historicalDataMode
        );
      }

      function handleMouseDown(event: any) {
        const [mouseX] = d3.pointer(event);
        const date = xScale.invert(mouseX - marginLeft);
        const closestData = findNearestDataPoint(combinedData, date);

        isDragging = true;
        updateVerticalIndicatorPosition(event);
        updateCornerTooltip(
          closestData,
          processedPredictionData,
          historicalGroundTruthData,
          xScale,
          chartWidth,
          marginLeft,
          marginTop,
          cornerTooltip,
          historicalDataMode
        );
      }

      function handleMouseUp() {
        isDragging = false;
      }

      function handleMouseOut() {
        mouseFollowLine.style("opacity", 0);
        // cornerTooltip.style("opacity", 0);
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

      return {
        mouseFollowLine,
        verticalIndicatorGroup,
        lineTooltip,
        cornerTooltip,
      };
    },
    [bubbleUserSelectedWeek, historicalDataMode, updateCornerTooltip, updateVerticalIndicator]
  );

  /* Main useEffect() */
  useEffect(() => {
    if (svgRef.current && groundTruthData.length > 0 && locationData.length > 0) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const chartWidth = dimensions.width - margins.left - margins.right;
      const chartHeight = dimensions.height - margins.top - margins.bottom;
      let marginLeft = margins.left;
      let marginTop = margins.top;
      let marginBottom = margins.bottom;

      const allPlaceholders = groundTruthData.every((d) => d.admissions === -1);

      if (allPlaceholders) {
        renderMessage(svg as any, "Not enough data, please extend date range.", chartWidth, chartHeight, marginLeft, marginTop);
        return;
      }

      // Ensure `userSelectedWeek` is always within the current selected date range, snapping it inside if necessary
      let adjustedUserSelectedWeek = new Date(userSelectedWeek);
      // Snap to left/right bound depending to which direction it was originally out-of-bound
      if (adjustedUserSelectedWeek < dateStart) {
        adjustedUserSelectedWeek = new Date(groundTruthData[groundTruthData.length - 1].date);
        dispatch(updateUserSelectedWeek(adjustedUserSelectedWeek));
      } else if (adjustedUserSelectedWeek > dateEnd) {
        adjustedUserSelectedWeek = new Date(groundTruthData[0].date);
        dispatch(updateUserSelectedWeek(adjustedUserSelectedWeek));
      }

      // Process prediction data
      const processedPredictionData = convertPredictionsToRenderFormat(allModelPredictions);

      const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
        groundTruthData,
        processedPredictionData,
        chartWidth,
        chartHeight,
        yAxisScale
      );

      // Render historical data if the mode is enabled
      if (historicalDataMode) {
        renderHistoricalData(svg, historicalGroundTruthData, xScale, yScale, marginLeft, marginTop);
      }

      renderGroundTruthData(svg, groundTruthData, xScale, yScale, marginLeft, marginTop);
      renderPredictionData(svg, processedPredictionData, xScale, yScale, marginLeft, marginTop, confidenceInterval, false);
      appendAxes(svg as any, xAxis, yAxis, xScale, marginLeft, marginTop, chartWidth, chartHeight, dateStart, dateEnd);

      const { mouseFollowLine, verticalIndicatorGroup, lineTooltip, cornerTooltip } = renderChartComponents(
        svg,
        groundTruthData,
        extendedGroundTruthData,
        processedPredictionData,
        historicalGroundTruthData,
        xScale,
        marginLeft,
        marginTop,
        chartWidth,
        chartHeight,
        dimensions.height,
        marginBottom
      );

      updateVerticalIndicator(adjustedUserSelectedWeek, xScale, marginLeft, chartWidth, verticalIndicatorGroup, lineTooltip);
    }
  }, [
    dimensions,
    isResizing,
    margins,
    groundTruthData,
    extendedGroundTruthData,
    allModelPredictions,
    USStateNum,
    forecastModel,
    numOfWeeksAhead,
    dateStart,
    dateEnd,
    yAxisScale,
    confidenceInterval,
    userSelectedWeek,
    locationData,
    dispatch,
    createScalesAndAxes,
    historicalDataMode,
    renderChartComponents,
    historicalGroundTruthData,
    updateVerticalIndicator,
    convertPredictionsToRenderFormat,
    renderHistoricalData,
  ]);

  // Return the SVG object using reference
  return (
    <div ref={containerRef} className='flex w-full h-full'>
      <svg
        ref={svgRef}
        width={"100%"}
        height={"100%"}
        className='w-full h-full'
        preserveAspectRatio='xMidYMid meet'
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}></svg>
    </div>
  );
};

export default ForecastChart;
