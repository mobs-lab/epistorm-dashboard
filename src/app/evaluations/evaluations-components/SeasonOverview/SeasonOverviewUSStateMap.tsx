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

  // Get data and settings variables from Redux store
  const locationData = useAppSelector((state) => state.location.data);
  const evaluationsScoreData = useAppSelector((state) => state.evaluationsSingleModelScoreData.data);
  const {
    evaluationSeasonOverviewHorizon,
    selectedAggregationPeriod,
    aggregationPeriods,
    mapSelectedModel,
    mapSelectedScoringOption,
    useLogColorScale,
  } = useAppSelector((state) => state.evaluationsSeasonOverviewSettings);

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
    useLogColorScale,
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

    /* Ensure all scoring options have zero in the value domain */
    const adjustedMin =
      mapSelectedScoringOption === "MAPE" || mapSelectedScoringOption === "WIS/Baseline" ? Math.min(minValue, 0) : minValue;

    // Handle different scoring metrics
    if (mapSelectedScoringOption === "MAPE" || mapSelectedScoringOption === "WIS/Baseline") {
      // For MAPE and WIS/Baseline, higher values mean worse performance
      colorDomain = [adjustedMin, maxValue];
      colorRange = [lightEndColor, navyBlueColor]; // Light to dark (better to worse)
    } else if (mapSelectedScoringOption === "Coverage") {
      // For Coverage, higher values mean better performance
      colorDomain = [adjustedMin, Math.max(maxValue, 100)];
      colorRange = [navyBlueColor, lightEndColor]; // Dark to light (worse to better)
    } else {
      // Default case, just in case
      colorDomain = [adjustedMin, maxValue];
      colorRange = [lightEndColor, navyBlueColor];
    }

    var colorScale:
      | d3.ScaleLinear<string, string, never>
      | ((arg0: any) => string | number | boolean | readonly (string | number)[] | null);

    let symlogConstant = 1;

    if (useLogColorScale) {
      // Calculate dynamic constant based on data distribution
      const positiveValues = performanceValues.filter((v) => v > 0);
      if (positiveValues.length > 0) {
        const sortedValues = [...positiveValues].sort((a, b) => a - b);
        const percentileIndex = Math.floor(sortedValues.length * 0.1);
        symlogConstant = Math.max(Math.min(sortedValues[percentileIndex], 1), 0.01);
      }
      // Use symlog for all metrics when in log mode (handles zeros properly)
      colorScale = d3.scaleSymlog<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb).constant(symlogConstant);
    } else {
      // Use linear scale when toggle is off
      colorScale = d3.scaleLinear<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb);
    }

    const mapWidth = width - margin.left - margin.right;
    const mapHeight = height - margin.top - margin.bottom;

    // Setup projection
    const projection = d3.geoAlbersUsa().fitSize([mapWidth, mapHeight], topojson.feature(mapData, mapData.objects.states));

    const path = d3.geoPath().projection(projection);

    // Create main group
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Map Title
    g.append("text")
      .attr("x", 0)
      .attr("y", -5)
      .attr("fill", "white")
      .attr("text-anchor", "left")
      .style("font-size", "18px")
      .style("font-weight", "regular")
      .text(`State-Specific ${mapSelectedScoringOption || "Performance Score"}`);

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

        // Directly use the stateId to find the location
        // No need to strip leading zeros - use it exactly as it appears in the topojson
        const state = locationData.find((loc) => loc.stateNum === stateId);
        const value = statePerformanceData.get(stateId);

        if (mapSelectedScoringOption == "Coverage" && value !== undefined) {
          // Already in percentage format
          return `${state?.stateName || "Unknown"}: ${value.toFixed(1)}% ${mapSelectedScoringOption}`;
        } else {
          return `${state?.stateName || "Unknown"}: ${value !== undefined ? value.toFixed(2) : "No data"} ${mapSelectedScoringOption}`;
        }
      });

    /* A separate circle aside for interacting with D.C.'s data */

    const nyStateId = "36"; // New York state ID
    const nyStateFeature = features.find((f: { id: string }) => f.id === nyStateId);
    console.debug("NY State Feature:", nyStateFeature);

    if (nyStateFeature) {
      // Calculate centroid of NY
      const nyCentroid = path.centroid(nyStateFeature);
      console.debug("NY Centroid:", nyCentroid);

      // DC circle position with adjusted offset
      const dcX = nyCentroid[0] + 120; // Increased offset to the right
      const dcY = nyCentroid[1] + 40; // Offset upward instead of down
      console.debug("DC Position:", { dcX, dcY });

      // Get DC data (DC state code is "11")
      const dcStateId = "11";
      const dcValue = statePerformanceData.get(dcStateId);
      const dcLocationData = locationData.find((loc) => loc.stateNum === dcStateId);

      // Create a group for DC (always render)
      const dcGroup = g.append("g").attr("class", "dc-visualization").style("cursor", "pointer");

      // Draw circle - fill with data color if available, gray if not
      dcGroup
        .append("circle")
        .attr("cx", dcX)
        .attr("cy", dcY)
        .attr("r", 15)
        .attr("fill", dcValue !== undefined ? colorScale(dcValue) : "#cccccc") // Gray if no data
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

      // Add DC text
      dcGroup
        .append("text")
        .attr("x", dcX)
        .attr("y", dcY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "white")
        .attr("font-size", "10px")
        .attr("pointer-events", "none")
        .text("DC");

      // Add tooltip regardless of data availability
      dcGroup.append("title").text(() => {
        if (dcValue === undefined) {
          return "District of Columbia: No data available";
        }

        const label = mapSelectedScoringOption === "Coverage" ? `${dcValue.toFixed(1)}%` : dcValue.toFixed(2);
        return `District of Columbia: ${label} ${mapSelectedScoringOption}`;
      });
    } else {
      console.warn("New York state feature not found for DC positioning");

      // Fallback to absolute positioning if NY can't be found
      const dcStateId = "11";
      const dcValue = statePerformanceData.get(dcStateId);

      const dcX = mapWidth * 0.86;
      const dcY = mapHeight * 0.4;

      // Create DC circle with fallback positioning
      const dcGroup = g.append("g").attr("class", "dc-visualization").style("cursor", "pointer");

      dcGroup
        .append("circle")
        .attr("cx", dcX)
        .attr("cy", dcY)
        .attr("r", 15)
        .attr("fill", dcValue !== undefined ? colorScale(dcValue) : "#cccccc")
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

      dcGroup
        .append("text")
        .attr("x", dcX)
        .attr("y", dcY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "white")
        .attr("font-size", "10px")
        .text("DC");

      dcGroup.append("title").text(() => {
        if (dcValue === undefined) return "District of Columbia: No data available";
        const label = mapSelectedScoringOption === "Coverage" ? `${dcValue.toFixed(1)}%` : dcValue.toFixed(2);
        return `District of Columbia: ${label} ${mapSelectedScoringOption}`;
      });
    }

    //Color legend in the form of a gradient thermometer
    const legendWidth = 40;
    const legendHeight = height - margin.top - margin.bottom - 20;

    // Legend Scale Setup - always put lower values at bottom, higher at top
    let legendScale;

    if (useLogColorScale) {
      legendScale = d3.scaleSymlog().domain([adjustedMin, maxValue]).range([legendHeight, 0]).constant(symlogConstant);
    } else {
      legendScale = d3.scaleLinear().domain([adjustedMin, maxValue]).range([legendHeight, 0]);
    }

    const legendAxis = d3
      .axisLeft(legendScale)
      .ticks(8)
      .tickFormat((d) => {
        if (d === 0) return "0";
        if (Math.abs(d) < 0.01) return d3.format(".2e")(d);
        // Check if it's a whole number
        if (Math.floor(d) === d) {
          return d3.format("d")(d); // No decimals for integers
        }
        return d3.format(".1f")(d); // One decimal for non-integers
      });

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
