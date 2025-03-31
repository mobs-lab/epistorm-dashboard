// Updated SeasonOverviewUSStateMap.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { addWeeks } from "date-fns";
import { useResponsiveSVG } from "@/interfaces/responsiveSVG";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { modelNames } from "@/interfaces/epistorm-constants";
import MapSelectorPanel from "./MapSelectorPanel";

const SeasonOverviewUSStateMap: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const svgRef = useRef<SVGSVGElement>(null);
  const [mapData, setMapData] = useState<any>(null);
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const locationData = useAppSelector((state) => state.location.data);
  const evaluationsScoreData = useAppSelector((state) => state.evaluationsSingleModelScoreData.data);
  const {
    evaluationSeasonOverviewSelectedStateCode,
    evaluationSeasonOverviewHorizon,
    selectedAggregationPeriod,
    aggregationPeriods,
    mapSelectedModel,
    mapSelectedScoringOption,
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

    // Handle different scoring options
    if (mapSelectedScoringOption === "Coverage") {
      //TODO: Placeholder for Coverage data logic
      console.log("Coverage option selected - data will be implemented later");
      return statePerformance;
    }

    // Only process data for the selected model
    const modelData = [
      evaluationsScoreData.find((data) => data.modelName === mapSelectedModel && data.scoreMetric === mapSelectedScoringOption),
    ].filter(Boolean); // Remove undefined values

    // For each state, calculate average score for the selected model and horizons
    locationData.forEach((location) => {
      const stateCode = location.stateNum;

      // Skip territories or non-state entries if needed
      if (stateCode === "US" || stateCode === "PR" || stateCode === "VI") {
        return;
      }

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
  }, [evaluationsScoreData, evaluationSeasonOverviewHorizon, selectedAggregationPeriod, aggregationPeriods, locationData, mapSelectedModel, mapSelectedScoringOption]);

  // Render map when dimensions or data change
  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && mapData && svgRef.current) {
      renderMap();
    }
  }, [dimensions, isResizing, mapData, statePerformanceData, evaluationSeasonOverviewSelectedStateCode]);

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

    // Create a color scale for the states - blue for better performance (lower values)
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([maxValue, minValue]); // Invert domain so darker blue means better performance

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
      .append("title") // Simple tooltip showing state name and value
      .text((d) => {
        const stateId = d.id?.toString();
        const stateCode = stateId.startsWith("0") ? stateId.substring(1) : stateId;
        const state = locationData.find((loc) => loc.stateNum === stateCode);
        const value = statePerformanceData.get(stateId);

        return `${state?.stateName || "Unknown"}: ${value !== undefined ? value.toFixed(2) : "No data"}`;
      });

    //Color legend in the form of a gradient thermometer
    const legendWidth = 40;
    const legendHeight = height - margin.top - margin.bottom - 20;

    const legendScale = d3
      .scaleLinear()
      .domain([maxValue, minValue]) // Match colorScale domain
      .range([0, legendHeight]);

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

    const stops = [
      { offset: "0%", color: colorScale(minValue) },
      { offset: "50%", color: colorScale((maxValue + minValue) / 2) },
      { offset: "100%", color: colorScale(maxValue) },
    ];

    gradient
      .selectAll("stop")
      .data(stops)
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    // Draw the legend rectangle
    legend.append("rect").attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#color-gradient)");

    // Add legend axis
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
      <MapSelectorPanel className="absolute left-2 bottom-0" />
    </div>
  );
};

export default SeasonOverviewUSStateMap;
