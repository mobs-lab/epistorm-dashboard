// Updated SeasonOverviewUSStateMap.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { addWeeks } from "date-fns";
import { useResponsiveSVG } from "@/interfaces/responsiveSVG";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { modelColorMap, modelNames } from "@/interfaces/epistorm-constants";
import MapSelectorPanel from "./MapSelectorPanel";

const SeasonOverviewUSStateMap: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const svgRef = useRef<SVGSVGElement>(null);
  const [mapData, setMapData] = useState<any>(null);
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const locationData = useAppSelector((state) => state.location.data);
  const evaluationsScoreData = useAppSelector((state) => state.evaluationsSingleModelScoreData.data);
  const { evaluationSeasonOverviewHorizon, selectedAggregationPeriod, aggregationPeriods, mapSelectedModel, mapSelectedScoringOption } =
    useAppSelector((state) => state.evaluationsSeasonOverviewSettings);

  // Load US map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const data = await d3.json("/states-10m.json");
        setMapData(data);
      } catch (error) {
        console.error("Error loading map data:", error);
      }
    };

    fetchMapData();
  }, []);

  // Calculate state performance data based on selected criteria
  const statePerformanceData = useMemo(() => {
    if (!evaluationsScoreData || evaluationSeasonOverviewHorizon.length === 0 || !selectedAggregationPeriod || !locationData) {
      return new Map();
    }

    // Find the selected aggregation period
    const selectedPeriod = aggregationPeriods.find((p) => p.id === selectedAggregationPeriod);

    if (!selectedPeriod) {
      return new Map();
    }

    // Create a map to store performance scores by state
    const statePerformance = new Map();

    // Only process data for the selected model
    const modelData = [
      evaluationsScoreData.find((data) => data.modelName === mapSelectedModel && data.scoreMetric === mapSelectedScoringOption),
    ].filter(Boolean); // Remove undefined values

    // For each state, calculate average score for the selected model and horizons
    locationData.forEach((location) => {
      const stateCode = location.stateNum;

      let totalScore = 0;
      let count = 0;

      // For the selected model and horizons, get relevant scores
      modelData.forEach((modelScoreData) => {
        if (modelScoreData && modelScoreData.scoreData) {
          evaluationSeasonOverviewHorizon.forEach((horizon) => {
            // Filter scores by state, horizon, and date range
            const scores = modelScoreData.scoreData.filter((entry) => {
              // Match state and horizon
              if (entry.location !== stateCode || entry.horizon !== horizon) {
                return false;
              }

              // Check if target date is within range
              const targetDate = addWeeks(entry.referenceDate, horizon);
              return entry.referenceDate >= selectedPeriod.startDate && targetDate <= selectedPeriod.endDate;
            });

            // Calculate performance metric
            scores.forEach((score) => {
              totalScore += score.score;
              count++;
            });
          });
        }
      });

      // Calculate average if we have scores
      if (count > 0) {
        // Convert state code to the format expected by topojson (if needed)
        const stateId = stateCode.padStart(2, "0");
        statePerformance.set(stateId, totalScore / count);
      }
    });

    return statePerformance;
  }, [
    evaluationsScoreData,
    evaluationSeasonOverviewHorizon,
    selectedAggregationPeriod,
    aggregationPeriods,
    locationData,
    mapSelectedModel,
    mapSelectedScoringOption,
  ]);

  // Render map when dimensions or data change
  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && mapData && svgRef.current) {
      renderMap();
    }
  }, [
    dimensions,
    isResizing,
    mapData,
    statePerformanceData,
    selectedAggregationPeriod,
    evaluationSeasonOverviewHorizon,
    mapSelectedScoringOption,
    mapSelectedModel,
  ]);

  const renderMap = () => {
    if (!svgRef.current || !mapData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Extract state features from topojson
    const features = topojson.feature(mapData, mapData.objects.states).features;

    // Get min and max values for color scale
    const performanceValues = Array.from(statePerformanceData.values());
    const minValue = performanceValues.length > 0 ? d3.min(performanceValues) || 0 : 0;
    const maxValue = performanceValues.length > 0 ? d3.max(performanceValues) || 1 : 1;

    // Uniform navy blue color for all models and metrics
    const navyBlueColor = "#0a4786";
    const lightEndColor = "#f0f0f0"; // Near white color

    // Color Scale Logic
    // For all metrics, we want:
    // - Better performance = lighter color (closer to white)
    // - Worse performance = darker color (closer to navy blue)
    let colorDomain, colorRange;

    // Handle different scoring metrics
    if (mapSelectedScoringOption === "MAPE" || mapSelectedScoringOption === "WIS/Baseline") {
      // For MAPE and WIS/Baseline, higher values mean worse performance
      // So we map higher values to darker colors
      colorDomain = [minValue, maxValue];
      colorRange = [lightEndColor, navyBlueColor];
    } else if (mapSelectedScoringOption === "Coverage") {
      // For Coverage, higher values mean better performance
      // So we map higher values to lighter colors
      colorDomain = [minValue, maxValue];
      colorRange = [navyBlueColor, lightEndColor];
    } else {
      // Default case
      colorDomain = [minValue, maxValue];
      colorRange = [lightEndColor, navyBlueColor];
    }

    const colorScale = d3.scaleLinear<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb);

    // Setup projection
    const projection = d3
      .geoAlbersUsa()
      .fitSize(
        [width - margin.left - margin.right, height - margin.top - margin.bottom],
        topojson.feature(mapData, mapData.objects.states)
      );

    const path = d3.geoPath().projection(projection);

    // Create main group
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Create state abbreviation to ID mapping
    const stateAbbrToId = new Map();
    locationData.forEach((loc) => {
      if (loc.stateNum !== "US") {
        // Format state ID to match topojson format
        const formattedId = loc.stateNum.padStart(2, "0");
        stateAbbrToId.set(loc.state, formattedId);
      }
    });

    // Draw states
    g.selectAll("path")
      .data(features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const stateId = d.id?.toString();
        return statePerformanceData.has(stateId) ? colorScale(statePerformanceData.get(stateId)) : "#cccccc";
      })
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .append("title")
      .text((d) => {
        const stateId = d.id?.toString();
        if (!stateId) return "Unknown";

        // Now directly use the stateId to find the location
        // No need to strip leading zeros - use it exactly as it appears in the topojson
        const state = locationData.find((loc) => loc.stateNum === stateId);
        const value = statePerformanceData.get(stateId);

        const scoreLabel = mapSelectedScoringOption === "Coverage" ? "Coverage %" : mapSelectedScoringOption;

        return `${state?.stateName || "Unknown"}: ${value !== undefined ? value.toFixed(2) : "No data"} ${scoreLabel}`;
      });

    //Color legend in the form of a gradient thermometer
    const legendWidth = 40;
    const legendHeight = height - margin.top - margin.bottom - 20;
    // Set up legend scale based on scoring option
    let legendScaleDomain;

    if (mapSelectedScoringOption === "Coverage") {
      // For Coverage, higher values = better performance (lighter color)
      legendScaleDomain = [maxValue, minValue];
    } else {
      // For MAPE and WIS/Baseline, higher values = worse performance (darker color)
      legendScaleDomain = [maxValue, minValue];
    }

    const legendScale = d3.scaleLinear().domain(legendScaleDomain).range([0, legendHeight]);

    const legendAxis = d3
      .axisLeft(legendScale)
      .ticks(5)
      .tickFormat((d) => d.toFixed(1));

    const legend = svg.append("g").attr("transform", `translate(${width - margin.right - legendWidth - 10}, ${margin.top})`);

    // Create the gradient
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "color-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    // Define gradient stops based on the scoring option
    if (mapSelectedScoringOption === "Coverage") {
      // For Coverage (higher = better), white at top, blue at top
      gradient.append("stop").attr("offset", "0%").attr("stop-color", navyBlueColor);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", lightEndColor);
    } else {
      // For MAPE and WIS/Baseline (higher = worse), blue at bottom, white at top
      gradient.append("stop").attr("offset", "0%").attr("stop-color", lightEndColor);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", navyBlueColor);
    }

    // Draw the legend rectangle
    legend.append("rect").attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#color-gradient)");

    // Add legend axis on the left
    legend
      .append("g")
      .attr("transform", `translate(0, 0)`)
      .call(legendAxis)
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "10px");

    // Add legend title
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("fill", "white")
      .attr("text-anchor", "start")
      .style("font-size", "10px")
      .text(mapSelectedScoringOption || "Performance Score");

    // Add legend descriptions for better/worse
    legend
      .append("text")
      .attr("x", legendWidth + 5)
      .attr("y", 10)
      .attr("fill", "white")
      .attr("text-anchor", "start")
      .style("font-size", "9px")
      .text(mapSelectedScoringOption == "Coverage" ? "Better" : "Worse");

    legend
      .append("text")
      .attr("x", legendWidth + 5)
      .attr("y", legendHeight)
      .attr("fill", "white")
      .attr("text-anchor", "start")
      .style("font-size", "9px")
      .text(mapSelectedScoringOption == "Coverage" ? "Worse" : "Better");
  };

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={svgRef}
        width='100%'
        height='100%'
        style={{
          fontFamily: "var(--font-dm-sans)",
          opacity: isResizing ? 0.5 : 1,
          transition: "opacity 0.2s ease",
        }}
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
        preserveAspectRatio='xMidYMid meet'
      />
      <MapSelectorPanel className='absolute left-2 bottom-0' />
    </div>
  );
};

export default SeasonOverviewUSStateMap;
