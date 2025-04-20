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

// Define color constants
const NAVY_BLUE = "#0a4786";
const WHITE = "#f0f0f0";
const PURPLE = "#800080";
const NO_DATA_COLOR = "#363b43"; // Color for states with no data

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
  const modelPerformanceData = useMemo(() => {
    if (!evaluationsScoreData || evaluationSeasonOverviewHorizon.length === 0 || !selectedAggregationPeriod || !locationData) {
      return new Map();
    }

    // Find the selected aggregation period
    const selectedPeriod = aggregationPeriods.find((p) => p.id === selectedAggregationPeriod);

    if (!selectedPeriod) {
      return new Map();
    }

    // Create a map to store performance scores by state
    const statePerformanceData = new Map();

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
        statePerformanceData.set(stateId, totalScore / count);
      }
    });

    return statePerformanceData;
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
    /* if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && mapData && svgRef.current) {
      renderMap();
    } */
    // Debounce or delay rendering slightly after resize finishes
    let timeoutId: NodeJS.Timeout | null = null;
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && mapData && svgRef.current) {
      // Clear previous timeout if exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Set a small delay to ensure resizing calculations are stable
      timeoutId = setTimeout(() => {
        renderMap();
      }, 50); // 50ms delay
    }

    // Cleanup timeout on unmount or before next effect run
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [dimensions, isResizing, mapData, modelPerformanceData, useLogColorScale]);

  const renderMap = () => {
    if (!svgRef.current || !mapData || !dimensions || dimensions.width <= 0 || dimensions.height <= 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 30, right: 20, bottom: 20, left: 20 }; // Adjusted margins for legend/title
    const mapWidth = width - margin.left - margin.right;
    const mapHeight = height - margin.top - margin.bottom;

    // Extract state features from topojson
    const stateFeatures = topojson.feature(mapData, mapData.objects.states).features;

    // Get performance data values for scale calculation
    const performanceValues = Array.from(modelPerformanceData.values());
    const hasData = performanceValues.length > 0;

    // Determine min/max values, handling the case of no data
    const minValue = hasData ? (d3.min(performanceValues) ?? 0) : 0;
    const maxValue = hasData ? (d3.max(performanceValues) ?? 1) : 1;

    // --- Scale Configuration ---
    let colorScale: d3.ScaleLinear<string, string> | d3.ScaleSymLog<string, string>;
    let legendScale: d3.ScaleLinear<number, number> | d3.ScaleSymLog<number, number>;
    let symlogConstant = 1; // Default symlog constant

    // Calculate symlog constant if needed (based on positive values near zero)
    if (useLogColorScale && hasData) {
      const positiveValues = performanceValues.filter((v) => v > 0); // Use > 0 for symlog constant logic···
      if (positiveValues.length > 0) {
        const sortedValues = [...positiveValues].sort((a, b) => a - b);
        const percentileIndex = Math.max(0, Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.1)));
        // Ensure constant is positive and reasonable, avoiding zero
        symlogConstant = Math.max(sortedValues[percentileIndex] || 0.01, 0.01);
      } else {
        symlogConstant = 0.01; // Fallback if no positive values
      }
    }

    // Create Scales based on Scoring Option and Log Toggle
    const isWISBaseline = mapSelectedScoringOption === "WIS/Baseline";
    let colorDomain: number[];
    let colorRange: string[];
    let legendDomain: number[];
    let legendRangePixels: number[];

    // Legend settings
    const legendWidth = 40;
    const legendHeight = mapHeight * 0.98;
    const legendX = width - margin.right - legendWidth - 10; // Position legend to the right
    const legendY = margin.top + (mapHeight - legendHeight) / 2; // Center legend vertically

    /* Two-way (For WIS/Baseline) and normal one-way color gradient scale logic here*/
    if (isWISBaseline) {
      // WIS/Baseline: Diverging Scale
      const pivotValue = 1;
      // Ensure pivot is within the actual data range for domain setting, clamp if necessary
      const effectiveMin = 0;
      const effectiveMax = maxValue;

      // Define the 3-point domain around the pivot
      colorDomain = [effectiveMin, pivotValue, effectiveMax];
      colorRange = [PURPLE, WHITE, NAVY_BLUE]; // Purple -> White (at 1) -> Navy Blue

      // Legend scale maps data domain to pixel range
      legendDomain = colorDomain;
      legendRangePixels = [legendHeight, legendHeight / 2, 0]; // Default position for pivot position in pixels

      // Calculate the actual pixel position for the pivot value (1) on the legend scale
      let tempScaleForPivotPosition: d3.ScaleLinear<number, number> | d3.ScaleSymLog<number, number>;
      if (useLogColorScale) {
        // Symlog scale for calculating pivot position
        tempScaleForPivotPosition = d3
          .scaleSymlog()
          .domain([effectiveMin, effectiveMax]) // Use min/max for range calculation
          .range([legendHeight, 0]) // Map data range to full pixel height (bottom to top)
          .constant(symlogConstant);
      } else {
        // Linear scale for calculating pivot position
        tempScaleForPivotPosition = d3
          .scaleLinear()
          .domain([effectiveMin, effectiveMax]) // Use min/max for range calculation
          .range([legendHeight, 0]); // Map data range to full pixel height
      }

      // Calculate pixel position for '1', clamp within bounds
      let pivotPixelPosition = tempScaleForPivotPosition(pivotValue);
      pivotPixelPosition = Math.max(0, Math.min(legendHeight, pivotPixelPosition));

      // Update the legend's pixel range using the calculated pivot position
      legendRangePixels = [legendHeight, pivotPixelPosition, 0]; // [Bottom, Pivot, Top]

      // Create the actual scales
      if (useLogColorScale) {
        // Use symlog scale with 3-point domain/range
        colorScale = d3.scaleSymlog<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb).constant(symlogConstant);

        legendScale = d3
          .scaleSymlog()
          .domain(legendDomain)
          .range(legendRangePixels) // Use calculated pixel positions
          .constant(symlogConstant);
      } else {
        // Use linear scale with 3-point domain/range
        colorScale = d3.scaleLinear<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb);

        legendScale = d3.scaleLinear().domain(legendDomain).range(legendRangePixels); // Use calculated pixel positions
      }
    } else {
      // --- Other Metrics: One-way Color Gradient Scale (Coverage & MAPE)
      colorDomain = [0, maxValue];
      legendDomain = colorDomain;
      legendRangePixels = [legendHeight, 0]; // Bottom to Top

      if (mapSelectedScoringOption === "Coverage") {
        // Coverage: Higher is better (closer to target). Often target is 95%.

        colorRange = [NAVY_BLUE, WHITE];
      } else {
        // For MAPE, white=better=lower value
        colorRange = [WHITE, NAVY_BLUE];
      }

      // Create the appropriate scale
      if (useLogColorScale) {
        colorScale = d3.scaleSymlog<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb).constant(symlogConstant);
        legendScale = d3.scaleSymlog().domain(legendDomain).range(legendRangePixels).constant(symlogConstant);
      } else {
        colorScale = d3.scaleLinear<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb);
        legendScale = d3.scaleLinear().domain(legendDomain).range(legendRangePixels);
      }
    }

    /* Create SVG groups */
    const visGroup = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`); // Group for map + title
    const legendGroup = svg.append("g").attr("transform", `translate(${legendX - 10}, ${legendY})`); // Group for legend elements

    // --- Draw Legend ---
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "color-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%") // Bottom
      .attr("x2", "0%")
      .attr("y2", "0%"); // Top

    // Add gradient stops based on the scale type
    if (isWISBaseline) {
      // Calculate normalized position of '1' for the gradient offset
      let pivotPercent = 0.5; // Default middle
      if (maxValue > minValue) {
        // Use a temporary scale matching the main scale type to find the relative position of '1'
        const tempScaleNormalize = (useLogColorScale ? d3.scaleSymlog().constant(symlogConstant) : d3.scaleLinear())
          .domain([minValue, maxValue])
          .range([0, 1]); // Map data range to 0-1
        const valueToScale = Math.max(minValue, Math.min(maxValue, 1)); // Clamp '1' within the actual data range
        pivotPercent = tempScaleNormalize(valueToScale);
      }
      // Ensure pivot is strictly within 0-1 for distinct gradient stops if possible
      pivotPercent = Math.max(0.001, Math.min(0.999, pivotPercent));

      // Handle cases where the entire range is above or below 1
      if (minValue >= 1) {
        // Range is 1 or higher: White to Navy
        gradient.append("stop").attr("offset", "0%").attr("stop-color", WHITE);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", NAVY_BLUE);
      } else if (maxValue <= 1) {
        // Range is 1 or lower: Purple to White
        gradient.append("stop").attr("offset", "0%").attr("stop-color", PURPLE);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", WHITE);
      } else {
        // Normal Diverging case: Purple -> White -> Navy
        gradient.append("stop").attr("offset", "0%").attr("stop-color", PURPLE); // Bottom color (for minValue)
        gradient
          .append("stop")
          .attr("offset", `${pivotPercent * 100}%`)
          .attr("stop-color", WHITE); // Mid color (at pivot '1')
        gradient.append("stop").attr("offset", "100%").attr("stop-color", NAVY_BLUE); // Top color (for maxValue)
      }
    } else {
      // One-Way gradient (handles Coverage, MAPE etc.)
      gradient.append("stop").attr("offset", "0%").attr("stop-color", colorRange[0]); // Bottom color
      gradient.append("stop").attr("offset", "100%").attr("stop-color", colorRange[1]); // Top color
    }

    // Draw legend rectangle
    legendGroup.append("rect").attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#color-gradient)");

    // Create and add legend axis
    const legendAxis = d3
      .axisLeft(legendScale) // Use axisRight since legend is on the right
      .ticks(8) // Fewer ticks for clarity
      .tickPadding(5)
      .tickSizeOuter(0)
      .tickFormat((d) => {
        const value = Number(d);
        if (value === 0) return "0";
        if (Math.abs(value) < 0.01 && Math.abs(value) > 0) return d3.format(".1e")(value); // Use scientific for very small numbers
        if (value === 1 && isWISBaseline) return "1 (Baseline)"; // Highlight baseline
        if (Math.abs(value) < 100 && Math.abs(value) >= 0.1 && isWISBaseline) return d3.format(".1f")(value); // One decimal place for WIS/Baseline's values
        return d3.format(".0f")(value); // Integers for larger numbers
      });

    legendGroup.append("g").call(legendAxis).selectAll("text").attr("fill", "white").style("font-size", "11px");

    // Remove the domain path line (axis line)
    legendGroup.select(".domain").remove();

    // Add legend title
    legendGroup
      .append("text")
      .attr("x", legendWidth / 2) // Center title above legend bar
      .attr("y", -10) // Position above the bar
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .text(mapSelectedScoringOption || "Model Performance Score");

    // Add 'Better'/'Worse' labels (adapt for WIS/Baseline)
    const betterWorseLabelYOffset = 8;
    const betterWorseLabelFontSize = "9px";
    if (isWISBaseline) {
      // NOTE: disabled text for WIS Baseline since it is two-way
      /* legendGroup
        .append("text") // Top label (Worse)
        .attr("x", legendWidth + 5)
        .attr("y", betterWorseLabelYOffset)
        .attr("fill", "white")
        .attr("text-anchor", "start")
        .style("font-size", betterWorseLabelFontSize)
        .text("Worse");

      legendGroup
        .append("text") // Bottom label (Better)
        .attr("x", legendWidth + 5)
        .attr("y", legendHeight - betterWorseLabelYOffset + 3) // Adjust vertical position slightly
        .attr("fill", "white")
        .attr("text-anchor", "start")
        .style("font-size", betterWorseLabelFontSize)
        .text("Lower (Better)"); */
    } else if (mapSelectedScoringOption === "Coverage") {
      // Coverage: Lighter is better (closer to target) assumed WHITE
      legendGroup
        .append("text") // Top label (Worse - NAVY)
        .attr("x", legendWidth + 5)
        .attr("y", betterWorseLabelYOffset)
        .attr("fill", "white")
        .attr("text-anchor", "start")
        .style("font-size", betterWorseLabelFontSize)
        .text("Overconfident");
      legendGroup
        .append("text") // Bottom label (Better - WHITE)
        .attr("x", legendWidth + 5)
        .attr("y", legendHeight - betterWorseLabelYOffset + 3)
        .attr("fill", "white")
        .attr("text-anchor", "start")
        .style("font-size", betterWorseLabelFontSize)
        .text("Over-Cautious");
    } else {
      legendGroup
        .append("text") // Top label (Worse - NAVY)
        .attr("x", legendWidth + 5)
        .attr("y", betterWorseLabelYOffset)
        .attr("fill", "white")
        .attr("text-anchor", "start")
        .style("font-size", betterWorseLabelFontSize)
        .text("Worse");
      legendGroup
        .append("text") // Bottom label (Better - WHITE)
        .attr("x", legendWidth + 5)
        .attr("y", legendHeight - betterWorseLabelYOffset + 3)
        .attr("fill", "white")
        .attr("text-anchor", "start")
        .style("font-size", betterWorseLabelFontSize)
        .text("Better");
    }

    // --- Map Title ---
    visGroup
      .append("text")
      .attr("x", 0)
      .attr("y", -10) // Position above map area
      .attr("fill", "white")
      .attr("text-anchor", "left")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`State-Specific ${mapSelectedScoringOption || "Performance"}`);

    // --- State Map Drawing ---
    const projection = d3.geoAlbersUsa().fitSize([mapWidth, mapHeight], topojson.feature(mapData, mapData.objects.states));
    const path = d3.geoPath().projection(projection);

    // Draw states
    visGroup
      .selectAll("path.state") // Add class for easier selection
      .data(stateFeatures)
      .join("path")
      .attr("class", "state") // Add class
      .attr("d", path)
      .attr("fill", (d: any) => {
        // Explicitly type d if possible, or use any
        const stateId = d.id?.toString().padStart(2, "0"); // Ensure consistent ID format
        const value = modelPerformanceData.get(stateId);
        return value !== undefined ? colorScale(value) : NO_DATA_COLOR; // Use color scale or no-data color
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1.2) 
      .style("cursor", "default") // Indicate non-interactive for now
      .append("title") // Hover tooltip
      .text((d: any) => {
        const stateId = d.id?.toString().padStart(2, "0");
        if (!stateId) return "Unknown State";

        const stateInfo = locationData.find((loc) => loc.stateNum.toString().padStart(2, "0") === stateId);
        const stateName = stateInfo?.stateName || `State ${stateId}`;
        const value = modelPerformanceData.get(stateId);
        const metricName = mapSelectedScoringOption || "Score";

        if (value === undefined) {
          return `${stateName}: No data`;
        }

        // Format value based on metric
        let formattedValue: string;
        if (mapSelectedScoringOption === "Coverage") {
          formattedValue = `${value.toFixed(1)}%`; // Percentage for Coverage
        } else {
          formattedValue = value.toFixed(1); // Two decimal places otherwise
        }
        return `${stateName}: ${formattedValue} ${metricName}`;
      });

    // --- Draw DC Circle ---
    // Find a reference point (e.g., Maryland centroid) for positioning DC
    const mdStateFeature = stateFeatures.find((f: any) => f.id === "24"); // Maryland ID is 24
    let dcX = mapWidth * 0.9; // Fallback X
    let dcY = mapHeight * 0.5; // Fallback Y
    const dcRadius = Math.min(mapWidth, mapHeight) * 0.04; // Relative radius

    if (mdStateFeature && path.centroid(mdStateFeature)?.length === 2) {
      const [mdX, mdY] = path.centroid(mdStateFeature);
      // Position DC slightly southeast of Maryland centroid
      dcX = mdX + dcRadius * 3;
      dcY = mdY + dcRadius * 1.2;
    }

    const dcStateId = "11"; // DC ID
    const dcValue = modelPerformanceData.get(dcStateId);

    const dcGroup = visGroup.append("g").attr("class", "dc-visualization").attr("transform", `translate(${dcX}, ${dcY})`); // Use transform for positioning

    // Draw circle for DC
    dcGroup
      .append("circle")
      .attr("r", dcRadius)
      .attr("fill", dcValue !== undefined ? colorScale(dcValue) : NO_DATA_COLOR)
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    // Add DC text label inside circle
    dcGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white") // Make text white for better contrast
      .attr("font-size", `${Math.max(8, dcRadius * 0.6)}px`) // Scale font size
      .attr("dy", "0.05em") // Slight vertical adjustment
      .style("pointer-events", "none") // Prevent text from blocking circle hover
      .text("DC");

    // Add tooltip for DC circle
    dcGroup.append("title").text(() => {
      const stateName = "District of Columbia";
      const metricName = mapSelectedScoringOption || "Score";
      if (dcValue === undefined) {
        return `${stateName}: No data`;
      }
      let formattedValue: string;
      if (mapSelectedScoringOption === "Coverage") {
        formattedValue = `${dcValue.toFixed(1)}%`;
      } else {
        formattedValue = dcValue.toFixed(1);
      }
      return `${stateName}: ${formattedValue} ${metricName}`;
    });
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
      <MapSelectorPanel className='absolute left-2 bottom-2' />
    </div>
  );
};

export default SeasonOverviewUSStateMap;
