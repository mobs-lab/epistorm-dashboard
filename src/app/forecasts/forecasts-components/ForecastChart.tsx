// src/app/Components/forecasts-components/ForecastChart.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Axis,
  BaseType,
  NumberValue,
  ScaleLinear,
  ScaleLogarithmic,
  ScaleTime,
} from "d3";
import { subWeeks } from "date-fns";

import {
  DataPoint,
  HistoricalDataEntry,
  isUTCDateEqual,
  ModelPrediction,
  PredictionDataPoint,
} from "../../Interfaces/forecast-interfaces";
import { useChartDimensions } from "../../Interfaces/forecast-chart-dimension-observer";
import {
  useChartMargins,
  calculateLabelSpace,
} from "../../Interfaces/chart-margin-utils";
import { modelColorMap } from "../../Interfaces/modelColors";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateUserSelectedWeek } from "../../store/forecast-settings-slice";
import debounce from "lodash/debounce";

const ForecastChart: React.FC = () => {
  // reference to svg object
  const svgRef = useRef(null);

  const [containerRef, { width, height, zoomLevel }] = useChartDimensions();
  const margins = useChartMargins(width, height, "default");

  // Get the ground and prediction data from store
  const groundTruthData = useAppSelector((state) => state.groundTruth.data);
  const predictionsData = useAppSelector((state) => state.predictions.data);

  // Historical Ground Truth Data (Preloaded by `forecasts/page.tsx`)
  const historicalGroundTruthData = useAppSelector(
    (state) => state.historicalGroundTruth.data
  );

  // Get all settings variables from Redux
  const {
    userSelectedWeek,
    USStateNum,
    forecastModel,
    numOfWeeksAhead,
    dateStart,
    dateEnd,
    yAxisScale,
    confidenceInterval,
    historicalDataMode,
  } = useAppSelector((state) => state.forecastSettings);

  const dispatch = useAppDispatch();

  // State Variables that only the component itself needs to keep track of selected week and whether it is loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Function to filter ground truth data by selected state and dates
  function filterGroundTruthData(
    data: DataPoint[],
    state: string,
    groundTruthDateRange: [Date, Date]
  ) {
    var filteredGroundTruthDataByState = data.filter(
      (d) => d.stateNum === state
    );

    // Filter data by extracting those entries that fall within the selected date range
    filteredGroundTruthDataByState = filteredGroundTruthDataByState.filter(
      (d) =>
        d.date >= groundTruthDateRange[0] && d.date <= groundTruthDateRange[1]
    );

    console.debug(
      "DEBUG: ForecastChart: Filtered Ground Truth Data:",
      filteredGroundTruthDataByState
    );

    return filteredGroundTruthDataByState;
  }

  function processPredictionData(
    allPredictions: ModelPrediction[],
    selectedModels: string[],
    state: string,
    selectedWeek: any,
    weeksAhead: number,
    confidenceIntervals: string[]
  ) {
    // Create an object to store the prediction data for each selected model
    let modelData: any = {};

    // First check which models are selected by user
    // Then filter the prediction data by state for each model
    selectedModels.forEach((modelName) => {
      const modelPrediction = allPredictions.find(
        (model) => model.modelName === modelName
      );

      if (modelPrediction) {
        modelData[modelName] = modelPrediction.predictionData.filter(
          (d) => d.stateNum === state
        );
      } else {
        modelData[modelName] = [];
      }
    });

    // Filter the prediction data by referenceDate and targetEndDate for each model
    let filteredModelData = {};
    Object.entries(modelData).forEach(([modelName, predictionData]) => {
      let filteredByReferenceDate = predictionData.filter((d) =>
        isUTCDateEqual(d.referenceDate, selectedWeek)
      );

      filteredModelData[modelName] = filteredByReferenceDate.filter((d) => {
        let targetWeek = new Date(selectedWeek.getTime());
        targetWeek.setDate(targetWeek.getDate() + weeksAhead * 7);

        // NOTE: Added a 2-hour buffer to account for DST transitions
        const bufferMs = 2 * 60 * 60 * 1000; // 4 hours in milliseconds

        // NOTE: Historical entries where targetEndDate earlier than referenceDate are ignored
        return (
          d.targetEndDate >= d.referenceDate &&
          d.targetEndDate.getTime() <= targetWeek.getTime() + bufferMs
        );
      });
    });

    // Create an object to store the confidence interval data for each model
    let confidenceIntervalData = {};

    // Iterate over each model's predictions
    Object.entries(filteredModelData).forEach(
      ([modelName, modelPredictions]) => {
        confidenceIntervalData[modelName] = [];

        // Check if any confidence intervals are selected
        if (confidenceIntervals.length > 0) {
          // Iterate over each confidence interval
          confidenceIntervals.forEach((interval) => {
            const confidenceIntervalPredictions = modelPredictions.map((d) => {
              let confidenceLow, confidenceHigh;
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
                targetEndDate: d.targetEndDate, // Convert targetEndDate to Date object
              };
            });
            confidenceIntervalData[modelName].push({
              interval: interval,
              data: confidenceIntervalPredictions,
            });
          });
        } else {
          // No confidence intervals selected, use the original prediction data
          confidenceIntervalData[modelName].push({
            interval: "",
            data: modelPredictions.map((d) => ({
              ...d,
              referenceDate: d.referenceDate,
              targetEndDate: d.targetEndDate,
            })),
          });
        }
      }
    );

    return confidenceIntervalData;
  }

  function createScalesAndAxes(
    ground: DataPoint[],
    predictions: {},
    chartWidth: number,
    chartHeight: number,
    yAxisScale: string
  ) {
    // Find the maximum date in the ground truth data
    const maxGroundTruthDate = d3.max(ground, (d) => d.date) as Date;

    // Find the maximum date in the prediction data
    const maxPredictionDate = Object.values(predictions)
      .flatMap((modelData: any) => modelData[0]?.data || [])
      .reduce((maxDate: Date, dataPoint: PredictionDataPoint) => {
        const targetEndDate = new Date(dataPoint.targetEndDate);
        return targetEndDate > maxDate ? targetEndDate : maxDate;
      }, new Date(0));

    const maxDate = d3.max([maxGroundTruthDate, maxPredictionDate]) as Date;
    console.debug(
      "DEBUG: ForecastChart: createScalesAndAxes(): maxDate: ",
      maxDate
    );

    const xScale = d3
      .scaleUtc()
      .domain([dateStart, maxDate])
      .range([0, chartWidth]);

    // Generate ticks for all Saturdays within the date range
    const allSaturdayTracker = d3.timeDay
      .range(dateStart, maxDate)
      .filter((d) => d.getDay() === 6);

    // console.debug("DEBUG: ForecastChart: createScalesAndAxes(): allSaturdayTracker: ", allSaturdayTracker);

    // Determine the ideal number of ticks
    const idealTickCount = Math.min(
      Math.max(10, allSaturdayTracker.length),
      20
    );

    // Select evenly spaced Saturdays
    const tickInterval = Math.max(
      1,
      Math.floor(allSaturdayTracker.length / idealTickCount)
    );
    const selectedTicks = allSaturdayTracker.filter(
      (_, i) => i % tickInterval === 0
    );

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(selectedTicks)
      .tickFormat((d: Date, i: number) => {
        const month = d3.timeFormat("%b")(d);
        const day = d3.timeFormat("%d")(d);
        const year = d.getUTCFullYear();

        /*TODO: Add year to the very first tick (earliest since dateStart)*/
        if (i === 0) {
          return `${year}\n${month}\n${day}`;
        }

        // Check if the date is near the beginning of the year
        const isNearYearChange = d.getMonth() === 0 && d.getDate() <= 10;

        return isNearYearChange
          ? `${year}\n${month}\n${day}`
          : `${month}\n${day}`;
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
    // console.debug("DEBUG: ForecastChart: createScalesAndAxes(): predictions: ", predictions);

    if (predictions && Object.keys(predictions).length > 0) {
      maxPredictionValue = Object.values(predictions).reduce(
        (max, modelData: PredictionDataPoint[]) => {
          const modelMax = modelData.reduce((modelMax, intervalData) => {
            const intervalMax = d3.max(
              intervalData.data,
              (p: PredictionDataPoint) => {
                // Use the highest confidence interval available
                if (p.confidence_high !== undefined) {
                  return p.confidence_high;
                } else if (p.confidence975 !== undefined) {
                  return p.confidence975;
                } else if (p.confidence950 !== undefined) {
                  return p.confidence950;
                } else {
                  return p.confidence750;
                }
              }
            );
            return Math.max(modelMax, intervalMax || 0);
          }, 0);
          return Math.max(max, modelMax);
        },
        0
      );
    }

    // console.debug("DEBUG: ForecastChart: createScalesAndAxes(): maxPredictionValue: ", maxPredictionValue);

    let maxValue = Math.max(maxGroundTruthValue, maxPredictionValue);
    // console.debug("DEBUG: ForecastChart: createScalesAndAxes(): maxValue: ", maxValue);

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

    /*console.debug("DEBUG: ForecastChart: createScalesAndAxes(): minValue: ", minValue);
            console.debug("DEBUG: ForecastChart: createScalesAndAxes(): maxValue: ", maxValue);*/
    const ticks = generateYAxisTicks(minValue, maxValue, isLogScale);

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(ticks)
      .tickFormat((d) => {
        d = d.valueOf();
        if (d === 0) return "0";
        if (d >= 10000) return d3.format(".2~s")(d);
        if (d >= 1000) return d3.format(".2~s")(d);
        if (d >= 100) return d3.format(".0f")(d);
        if (d >= 10) return d3.format(".0f")(d);
        if (d >= 1) return d3.format(".0f")(d);
        return d3.format(".1f")(d);
      });

    yAxis.tickSize(-chartWidth);

    return { xScale, yScale, xAxis, yAxis };
  }

  function generateYAxisTicks(
    minValue: number,
    maxValue: number,
    isLogScale: boolean
  ): number[] {
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
        // console.debug("DEBUG: ForecastChart.tsx: generateYAxisTicks(): ticks: ", ticks);
      }
      ticks = ticks.filter((tick) => tick >= minValue && tick <= maxValue);
      // if (ticks.length > desiredTickCount) {
      //     const step = Math.ceil(ticks.length / desiredTickCount);
      //     ticks = ticks.filter((_, index) => index % step === 0);
      // }
      console.debug(
        "DEBUG: ForecastChart.tsx: generateYAxisTicks(): ticks after filtering: ",
        ticks
      );
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
    svg: Selection<BaseType, unknown, HTMLElement, any>,
    surveillanceData: DataPoint[],
    xScale: ScaleTime<number, number, never>,
    yScale:
      | ScaleLogarithmic<number, number, never>
      | ScaleLinear<number, number, never>,
    marginLeft: number,
    marginTop: number
  ) {
    // Remove existing ground truth data paths and circles
    svg.selectAll(".ground-truth-path, .ground-truth-dot").remove();

    const line = d3
      .line<DataPoint>()
      .defined((d) => d.admissions !== -1 || d.admissions === null) // Include placeholder points
      .x((d) => xScale(d.date))
      .y((d) =>
        d.admissions !== -1 ? yScale(d.admissions) : yScale.range()[0]
      ); // Use bottom of chart for placeholders

    svg
      .append("path")
      .datum(surveillanceData)
      .attr("class", "ground-truth-path")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("d", line)
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // Add circles for ground truth data points (including placeholders)
    svg
      .selectAll(".ground-truth-dot")
      .data(surveillanceData)
      .enter()
      .append("circle")
      .attr("class", "ground-truth-dot")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) =>
        d.admissions !== -1 ? yScale(d.admissions) : yScale.range()[0]
      )
      .attr("r", 3)
      .attr("fill", (d) => (d.admissions !== -1 ? "white" : "transparent"))
      .attr("stroke", (d) => (d.admissions !== -1 ? "white" : "transparent"))
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);
  }

  function renderHistoricalData(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    historicalData: HistoricalDataEntry[],
    xScale: d3.ScaleTime<number, number>,
    yScale:
      | d3.ScaleLinear<number, number>
      | d3.ScaleLogarithmic<number, number>,
    marginLeft: number,
    marginTop: number
  ) {
    console.debug(
      "DEBUG: ForecastChart: Rendering historical data:",
      historicalData
    );
    console.debug(
      "DEBUG: ForecastChart: User selected week:",
      userSelectedWeek
    );

    // Find the historical data file that is 1 week before the user selected week,
    // While accounting for day light saving time transitions, using a 2-hour buffer, using isUTCDateEqual
    const matchingHistoricalData = historicalData.find((entry) =>
      isUTCDateEqual(entry.associatedDate, subWeeks(userSelectedWeek, 1))
    );

    // const matchingHistoricalData = historicalData.find((entry) => isUTCDateEqual(entry.associatedDate, userSelectedWeek));

    if (!matchingHistoricalData) {
      console.debug(
        "DEBUG: No matching historical data found for:",
        userSelectedWeek.toISOString()
      );
      return;
    }

    console.debug("DEBUG: Matching historical data:", matchingHistoricalData);

    /*Ensure the historical data to be drawn is cutoff before dateStart*/
    const historicalDataToDraw = matchingHistoricalData.historicalData.filter(
      (d) => d.date >= dateStart
    );

    const historicalLine = d3
      .line<DataPoint>()
      .defined((d) => d.admissions !== -1 && !isNaN(d.admissions))
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.admissions));

    svg
      .append("path")
      .datum(
        historicalDataToDraw.filter(
          (d) =>
            d.admissions !== -1 &&
            !isNaN(d.admissions) &&
            d.stateNum === USStateNum
        )
      )
      .attr("class", "historical-ground-truth-path")
      .attr("fill", "none")
      .attr("stroke", "#FFA500") // Orange color for historical data
      .attr("stroke-width", 3)
      .attr("d", historicalLine)
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    svg
      .selectAll(".historical-ground-truth-dot")
      .data(
        historicalDataToDraw.filter(
          (d) =>
            d.admissions !== -1 &&
            !isNaN(d.admissions) &&
            d.stateNum === USStateNum
        )
      )
      .enter()
      .append("circle")
      .attr("class", "historical-ground-truth-dot")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.admissions))
      .attr("r", 6) // Slightly larger than current ground truth dots
      .attr("fill", "#FFA500")
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);
  }

  function renderPredictionData(
    svg: d3.Selection<null, unknown, null, undefined>,
    predictionData: {},
    xScale: d3.ScaleTime<number, number, never>,
    yScale: d3.ScaleLinear<number, number, never>,
    marginLeft: number,
    marginTop: number,
    confidenceInterval: string[],
    isGroundTruthDataPlaceHolderOnly: boolean
  ) {
    // Remove existing prediction data paths and circles
    svg
      .selectAll(".prediction-path, .prediction-dot, .confidence-area")
      .remove();

    // Check if predictionData is not empty
    if (Object.keys(predictionData).length > 0) {
      // Get an array of values from the predictionData object
      const predictionDataArray = Object.values(predictionData);

      predictionDataArray.forEach((predictions, index) => {
        if (predictions[0]?.data) {
          const modelName = Object.keys(predictionData)[index];
          const modelColor =
            modelColorMap[modelName] || `hsl(${index * 60}, 100%, 50%)`;

          // Render prediction data points
          const line = d3
            .line<any>()
            .x((d) => xScale(new Date(d.targetEndDate)))
            .y((d) => yScale(d.confidence500));

          if (isGroundTruthDataPlaceHolderOnly) {
            // If there is only a placeholder data point, render the prediction data as its own branch
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
            // Render prediction data points as usual
            svg
              .append("path")
              .datum(predictions[0].data)
              .attr("class", "prediction-path")
              .attr("fill", "none")
              .attr("stroke", modelColor)
              .attr("stroke-width", 1.5)
              .attr("d", line)
              .attr("transform", `translate(${marginLeft}, ${marginTop})`);

            // Add circles for prediction data points
            svg
              .selectAll(`.prediction-dot-${index}`)
              .data(predictions[0].data)
              .enter()
              .append("circle")
              .attr("class", `prediction-dot prediction-dot-${index}`)
              .attr("cx", (d) => xScale(new Date(d.targetEndDate)))
              .attr("cy", (d) => yScale(d.confidence500))
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
          const modelColor =
            modelColorMap[modelName] || `hsl(${index * 60}, 100%, 50%)`;

          predictions.forEach((confidenceIntervalData) => {
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

  function renderVerticalIndicator(
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

  function updateVerticalIndicator(
    date: Date,
    xScale: d3.ScaleTime<number, number>,
    marginLeft: number,
    chartWidth: number,
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    tooltip: d3.Selection<SVGTextElement, unknown, null, undefined>
  ) {
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
  }

  function getEpiweek(date: Date): number {
    const startOfYear = new Date(date.getUTCFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
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

  function createCornerTooltip(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    marginLeft: number,
    marginTop: number
  ) {
    // console.debug('DEBUG: Initial tooltip position:', marginLeft + 20, marginTop + 20);
    return svg
      .append("g")
      .attr("class", "corner-tooltip")
      .attr("transform", `translate(${marginLeft + 40}, ${marginTop})`);
  }

  function formatNumber(value: number, isAdmission: boolean = false): string {
    if (Number.isNaN(value)) {
      return "N/A";
    }

    if (isAdmission) {
      // Surveillance data should be integer; just in case
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

  function updateCornerTooltip(
    data: DataPoint,
    groundTruthData: DataPoint[],
    predictionData: any,
    historicalGroundTruthData: HistoricalDataEntry[],
    xScale: d3.ScaleTime<number, number>,
    chartWidth: number,
    marginLeft: number,
    marginTop: number,
    cornerTooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
    isHistoricalDataMode: boolean
  ) {
    cornerTooltip.selectAll("*").remove();

    const padding = 12;
    const lineHeight = 22;
    let currentY = padding + 5;
    let maxWidth = 0;

    /* Position the tooltip box on the side where it won't block the predictions highlighted*/
    const xPosition = xScale(data.date);
    const shouldShowOnRightSide = xPosition < chartWidth * 0.48;

    // Background rectangle (we'll set its size after calculating content)
    const background = cornerTooltip
      .append("rect")
      .attr("fill", "#333943")
      .attr("rx", 8)
      .attr("ry", 8);

    // Add Date Information with non-bold label
    const dateGroup = cornerTooltip
      .append("text")
      .attr(
        "x",
        shouldShowOnRightSide ? maxWidth + padding * 2 - padding : padding
      )
      .attr("y", currentY)
      .attr("fill", "white")
      .style("font-family", "var(--font-dm-sans), sans-serif")
      .attr("font-size", "13px")
      .attr("text-anchor", shouldShowOnRightSide ? "end" : "start");

    dateGroup.append("tspan").text("Date: ").attr("font-weight", "normal");

    dateGroup
      .append("tspan")
      .text(`${data.date.toUTCString().slice(5, 16)}`)
      .attr("font-weight", "bold");

    // Add admissions data with non-bold label
    const admissionsGroup = cornerTooltip
      .append("text")
      .attr(
        "x",
        shouldShowOnRightSide ? maxWidth + padding * 2 - padding : padding
      )
      .attr("y", currentY + lineHeight)
      .attr("fill", "white")
      .style("font-family", "var(--font-dm-sans)")
      .attr("font-size", "13px")
      .attr("text-anchor", shouldShowOnRightSide ? "end" : "start");

    admissionsGroup
      .append("tspan")
      .text("Admissions: ")
      .attr("font-weight", "normal");

    admissionsGroup
      .append("tspan")
      .text(
        `${
          data.admissions !== null && data.admissions !== -1
            ? formatNumber(data.admissions, true)
            : "N/A"
        }`
      )
      .attr("font-weight", "bold");

    maxWidth = Math.max(maxWidth, dateGroup.node().getComputedTextLength());
    currentY += lineHeight + 2 * padding;

    /* TODO: when historical data mode is on, the tooltips should show historical admission values info as well */
    if (isHistoricalDataMode) {
      const historicalAdmissionValue = historicalGroundTruthData
        .find((file) =>
          isUTCDateEqual(file.associatedDate, subWeeks(userSelectedWeek, 1))
        )
        ?.historicalData.find(
          (entry) =>
            isUTCDateEqual(entry.date, data.date) &&
            entry.stateNum === data.stateNum
        )?.admissions;

      const historicalGroup = cornerTooltip
        .append("text")
        .attr(
          "x",
          shouldShowOnRightSide ? maxWidth + padding * 2 - padding : padding
        )
        .attr("y", currentY)
        .attr("fill", "white")
        .style("font-family", "var(--font-dm-sans)")
        .attr("font-size", "13px")
        .attr("text-anchor", shouldShowOnRightSide ? "end" : "start");

      historicalGroup
        .append("tspan")
        .text("Historical Admissions: ")
        .attr("font-weight", "normal");

      historicalGroup
        .append("tspan")
        .text(
          `${
            historicalAdmissionValue !== null ||
            !historicalAdmissionValue ||
            Number.isNaN(historicalAdmissionValue)
              ? formatNumber(historicalAdmissionValue, true)
              : "N/A"
          }`
        )
        .attr("font-weight", "bold");

      // Update maxWidth and currentY again
      maxWidth = Math.max(
        maxWidth,
        historicalGroup.node().getComputedTextLength()
      );
      currentY += 2 * padding; // Add padding after historical data
    } else {
      currentY += 2 * padding; // Keep original padding if no historical data
    }

    // Find prediction data for the current date
    const currentPredictions = findPredictionsForDate(
      predictionData,
      data.date
    );

    if (currentPredictions) {
      /*  */
      Object.entries(currentPredictions).forEach(
        ([modelName, modelData]: [string, any], index) => {
          // Model name group with color box
          const modelGroup = cornerTooltip
            .append("g")
            .attr("transform", `translate(${padding}, ${currentY - 14})`);

          // Color rectangle for the model
          modelGroup
            .append("rect")
            .attr("class", "corner-tooltip-model-color-box")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", modelColorMap[modelName]);

          // Model name text
          modelGroup
            .append("text")
            .attr("x", 18)
            .attr("y", 11)
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .style("font-family", "var(--font-dm-sans)")
            .attr("font-size", "13px")
            .text(modelName);

          currentY += lineHeight * 0.6;

          // Create header row for the table-like CI info display
          const headerGroup = cornerTooltip
            .append("g")
            .attr("transform", `translate(${padding + 18}, ${currentY})`);

          const columns = ["Median"];
          if (confidenceInterval.includes("50")) columns.push("50% CI");
          if (confidenceInterval.includes("90")) columns.push("90% CI");
          if (confidenceInterval.includes("95")) columns.push("95% CI");

          /* */
          const columnWidth = 120;

          // Add headers
          columns.forEach((col, i) => {
            headerGroup
              .append("text")
              .attr("x", i * columnWidth)
              .attr("y", 0)
              .attr("text-anchor", "start")
              .attr("fill", "white")
              .attr("font-size", "13px")
              .style("font-family", "var(--font-dm-sans)")
              .text(col);
          });

          currentY += lineHeight * 0.65;

          // Create values row
          const valuesGroup = cornerTooltip
            .append("g")
            .attr("transform", `translate(${padding + 18}, ${currentY})`);

          // Add median value
          valuesGroup
            .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .attr("fill", "white")
            .attr("font-size", "14px")
            .style("font-family", "var(--font-dm-sans)")
            .text(formatNumber(modelData.confidence500));

          // Add CI values
          let colIndex = 1;
          if (confidenceInterval.includes("50")) {
            valuesGroup
              .append("text")
              .attr("x", colIndex * columnWidth)
              .attr("y", 0)
              .attr("text-anchor", "start")
              .attr("fill", "white")
              .attr("font-size", "13px")
              .style("font-family", "var(--font-dm-sans)")
              .text(
                `[${formatNumber(modelData.confidence250)}, ${formatNumber(
                  modelData.confidence750
                )}]`
              );
            colIndex++;
          }

          if (confidenceInterval.includes("90")) {
            valuesGroup
              .append("text")
              .attr("x", colIndex * columnWidth)
              .attr("y", 0)
              .attr("text-anchor", "start")
              .attr("fill", "white")
              .attr("font-size", "13px")
              .style("font-family", "var(--font-dm-sans)")
              .text(
                `[${formatNumber(modelData.confidence050)}, ${formatNumber(
                  modelData.confidence950
                )}]`
              );
            colIndex++;
          }

          if (confidenceInterval.includes("95")) {
            valuesGroup
              .append("text")
              .attr("x", colIndex * columnWidth)
              .attr("y", 0)
              .attr("text-anchor", "start")
              .attr("fill", "white")
              .attr("font-size", "13px")
              .style("font-family", "var(--font-dm-sans)")
              .text(
                `[${formatNumber(modelData.confidence025)}, ${formatNumber(
                  modelData.confidence975
                )}]`
              );
          }

          // Update maxWidth based on the total width of all columns
          const contentWidth = columns.length * columnWidth + padding * 2;
          maxWidth = Math.max(maxWidth, contentWidth);
          currentY += lineHeight * 1.15; // Add space before next model
        }
      );
    }

    if (shouldShowOnRightSide) {
      dateGroup.attr("x", maxWidth + padding);
      admissionsGroup.attr("x", maxWidth + padding);
    }

    // Set background rectangle size and position
    background.attr("width", maxWidth + padding * 2).attr("height", currentY);

    // Position the tooltip
    const tooltipX = shouldShowOnRightSide
      ? chartWidth - maxWidth - padding * 2
      : marginLeft * 1.5;
    const tooltipY = marginTop;

    cornerTooltip
      .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
      .style("opacity", 1);
  }

  function findPredictionsForDate(predictionData: any, date: Date) {
    const foundPredictions = {};
    Object.entries(predictionData).forEach(
      ([modelName, modelPredictions]: [string, any]) => {
        // const prediction = modelPredictions[0].data.find((p: any) => new Date(p.targetEndDate).getTime() === date.getTime());
        const prediction = modelPredictions[0].data.find((p: any) =>
          isUTCDateEqual(new Date(p.targetEndDate), date)
        );
        if (prediction) {
          foundPredictions[modelName] = prediction;
        }
      }
    );
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

    function wrap(text, width) {
      text.each(function () {
        var text = d3.select(this),
          words = text.text().split(/\n+/).reverse(),
          word,
          line = [],
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
          if (tspan.node().getComputedTextLength() > width) {
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
    xAxisGroup
      .selectAll(".tick text")
      .style("text-anchor", "middle")
      .attr("dy", "1em")
      .style("font-size", "13px")
      .call(wrap, 32); // 32 is the minimum width to accommodate year number at 1080p 100% zoom view environment, adjust as needed

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
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke-opacity", 0.5)
          .attr("stroke-dasharray", "2,2")
      );

    // Style y-axis ticks
    yAxisGroup
      .selectAll(".tick text")
      //Make the font size always as big as possible
      .style("font-size", "18px");
  }

  function findNearestDataPoint(
    data: DataPoint[],
    targetDate: Date
  ): DataPoint {
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
    groundTruthData: DataPoint[],
    predictionData: any
  ): DataPoint[] {
    // First deconstruct the whole of ground truth data into a new array
    let combinedData = [...groundTruthData];

    // Then iterate over each model's predictions
    Object.values(predictionData).forEach((modelPredictions: any) => {
      // For each prediction, check if a data point already exists for that
      modelPredictions[0].data.forEach((prediction: any) => {
        // const existingPoint = combinedData.find((d) => d.date.getTime() === new Date(prediction.targetEndDate).getTime());
        const existingPoint = combinedData.find((d) =>
          isUTCDateEqual(d.date, new Date(prediction.targetEndDate))
        );
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

  function renderChartComponents(
    svg: d3.Selection<BaseType, unknown, null, undefined>,
    filteredGroundTruthData: DataPoint[],
    processedPredictionData: any,
    historicalGroundTruthData: HistoricalDataEntry[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    marginLeft: number,
    marginTop: number,
    chartWidth: number,
    chartHeight: number,
    height: number,
    marginBottom: number
  ) {
    const combinedData = createCombinedDataset(
      filteredGroundTruthData,
      processedPredictionData
    );

    const mouseFollowLine = createMouseFollowLine(
      svg,
      marginLeft,
      marginTop,
      height,
      marginBottom
    );
    const {
      group: verticalIndicatorGroup,
      line: verticalIndicator,
      tooltip: lineTooltip,
    } = renderVerticalIndicator(
      svg,
      xScale,
      marginLeft,
      marginTop,
      height,
      marginBottom
    );
    const cornerTooltip = createCornerTooltip(svg, marginLeft, marginTop);
    const eventOverlay = createEventOverlay(
      svg,
      marginLeft,
      marginTop,
      chartWidth,
      chartHeight
    );

    let isDragging = false;

    function updateFollowLine(event: any) {
      const [mouseX] = d3.pointer(event);
      const date = xScale.invert(mouseX - marginLeft);
      const closestData = findNearestDataPoint(combinedData, date);

      const snappedX = xScale(closestData.date);
      mouseFollowLine
        .attr("transform", `translate(${snappedX + marginLeft}, 0)`)
        .style("opacity", 1);

      updateCornerTooltip(
        closestData,
        filteredGroundTruthData,
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

      updateVerticalIndicator(
        closestData.date,
        xScale,
        marginLeft,
        chartWidth,
        verticalIndicatorGroup,
        lineTooltip
      );
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

      bubbleUserSelectedWeek(closestData.date);
      updateVerticalIndicator(
        closestData.date,
        xScale,
        marginLeft,
        chartWidth,
        verticalIndicatorGroup,
        lineTooltip
      );
      updateCornerTooltip(
        closestData,
        filteredGroundTruthData,
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
        filteredGroundTruthData,
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
  }

  function bubbleUserSelectedWeek(date: Date) {
    console.debug("Bubbling user selected week:", date.toISOString());
    dispatch(updateUserSelectedWeek(new Date(date.toISOString()))); // Ensure UTC
  }

  useEffect(() => {
    if (svgRef.current && groundTruthData.length > 0) {
      const svg = d3.select(svgRef.current);

      // Remove the existing chart elements
      svg.selectAll("*").remove();

      const chartWidth = width - margins.left - margins.right;
      const chartHeight = height - margins.top - margins.bottom;
      let marginLeft = margins.left;
      let marginRight = margins.right;
      let marginTop = margins.top;
      let marginBottom = margins.bottom;

      const filteredGroundTruthData = filterGroundTruthData(
        groundTruthData,
        USStateNum,
        [dateStart, dateEnd]
      );

      // Ensure userSelectedWeek is within the current date range
      let adjustedUserSelectedWeek = new Date(userSelectedWeek);
      if (adjustedUserSelectedWeek < dateStart) {
        adjustedUserSelectedWeek = new Date(
          filteredGroundTruthData[filteredGroundTruthData.length - 1].date
        );
        dispatch(updateUserSelectedWeek(adjustedUserSelectedWeek));
      } else if (adjustedUserSelectedWeek > dateEnd) {
        adjustedUserSelectedWeek = new Date(filteredGroundTruthData[0].date);
        dispatch(updateUserSelectedWeek(adjustedUserSelectedWeek));
      }

      const allPlaceholders = filteredGroundTruthData.every(
        (d) => d.admissions === -1
      );

      /*Check to see if all available is just placeholders*/
      if (allPlaceholders) {
        // If so, render a message to inform the user
        renderMessage(
          svg,
          "Not enough data, please extend date range.",
          chartWidth,
          chartHeight,
          marginLeft,
          marginTop
        );

        return;
      } else {
        // This works once for the first time the component is rendered to by default make the latest date as user-selected week
        if (!initialDataLoaded) {
          const filteredGroundTruthDataWithoutPlaceholders =
            filteredGroundTruthData.filter((d) => d.admissions !== -1);
          // console.debug("DEBUG: ForecastChart: Initial data loaded, setting user selected week to latest date:", filteredGroundTruthDataWithoutPlaceholders);
          const latestDate = d3.max(
            filteredGroundTruthDataWithoutPlaceholders,
            (d) => d.date
          ) as Date;
          // ensure latestDate is UTC
          const latestDateUTC = new Date(latestDate.toISOString());
          bubbleUserSelectedWeek(latestDateUTC);
          setInitialDataLoaded(true);
        }

        // Safety Clamping for when date range is changed by user and userSelectedWeek falls out of the range as a result
        if (userSelectedWeek < dateStart || userSelectedWeek > dateEnd) {
          // Re-find the nearest data point which should be new date range's endpoints
          const closestDataPoint = findNearestDataPoint(
            filteredGroundTruthData,
            userSelectedWeek
          );
          // bubbleUserSelectedWeek(new Date(closestDataPoint.date.toISOString()));
        }

        const processedPredictionData = processPredictionData(
          predictionsData,
          forecastModel,
          USStateNum,
          userSelectedWeek,
          numOfWeeksAhead,
          confidenceInterval
        );

        const { xScale, yScale, xAxis, yAxis } = createScalesAndAxes(
          filteredGroundTruthData,
          processedPredictionData,
          chartWidth,
          chartHeight,
          yAxisScale
        );
        if (historicalDataMode) {
          renderHistoricalData(
            svg,
            historicalGroundTruthData,
            xScale,
            yScale,
            marginLeft,
            marginTop
          );
        }
        renderGroundTruthData(
          svg,
          filteredGroundTruthData,
          xScale,
          yScale,
          marginLeft,
          marginTop
        );
        renderPredictionData(
          svg,
          processedPredictionData,
          xScale,
          yScale,
          marginLeft,
          marginTop,
          confidenceInterval,
          false
        );

        appendAxes(
          svg,
          xAxis,
          yAxis,
          xScale,
          marginLeft,
          marginTop,
          chartWidth,
          chartHeight,
          dateStart,
          dateEnd
        );

        const {
          mouseFollowLine,
          verticalIndicatorGroup,
          lineTooltip,
          cornerTooltip,
        } = renderChartComponents(
          svg,
          filteredGroundTruthData,
          processedPredictionData,
          historicalGroundTruthData,
          xScale,
          yScale,
          marginLeft,
          marginTop,
          chartWidth,
          chartHeight,
          height,
          marginBottom
        );

        updateVerticalIndicator(
          adjustedUserSelectedWeek || filteredGroundTruthData[0].date,
          xScale,
          marginLeft,
          chartWidth,
          verticalIndicatorGroup,
          lineTooltip
        );
      }
    }
  }, [
    width,
    height,
    margins,
    groundTruthData,
    predictionsData,
    USStateNum,
    forecastModel,
    numOfWeeksAhead,
    dateStart,
    dateEnd,
    yAxisScale,
    confidenceInterval,
    historicalDataMode,
    userSelectedWeek,
    historicalDataMode,
  ]);

  // Return the SVG object using reference
  return (
    <div ref={containerRef} className='flex w-full h-full'>
      <svg
        ref={svgRef}
        width={"100%"}
        height={"100%"}
        preserveAspectRatio='xMidYMid meet'
        style={{
          fontFamily: "var(--font-dm-sans)",
          visibility: width && height ? "visible" : "hidden",
        }}></svg>
    </div>
  );
};

export default ForecastChart;
