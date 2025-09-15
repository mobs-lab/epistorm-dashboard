// Updated SeasonOverviewUSStateMap.tsx
"use client";

import { useDataContext } from "@/providers/DataProvider";
import { useAppSelector } from "@/store/hooks";
import { selectLocationData } from "@/store/selectors";
import { selectSeasonOverviewData, selectShouldUseJsonData } from "@/store/selectors/evaluationSelectors";
import { useResponsiveSVG } from "@/utils/responsiveSVG";
import * as d3 from "d3";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as topojson from "topojson-client";
import MapSelectorPanel from "./MapSelectorPanel";

// Define color constants
const NAVY_BLUE = "#00495F";
const WHITE = "#E9E9E9";
const GREEN = "#6A9629";
const NO_DATA_COLOR = "#363b43"; // Color for states with no data

const SeasonOverviewUSStateMap: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const svgRef = useRef<SVGSVGElement>(null);
  const { mapData } = useDataContext();

  // Get data from selectors
  const shouldUseJsonData = useAppSelector(selectShouldUseJsonData);
  const seasonOverviewData = useAppSelector(selectSeasonOverviewData);

  const locationData = useAppSelector(selectLocationData);

  const { mapSelectedModel, mapSelectedScoringOption, useLogColorScale } = useAppSelector(
    (state) => state.evaluationsSeasonOverviewSettings
  );

  // Calculate state performance data based on selected criteria
  const modelPerformanceData = useMemo(() => {
    if (shouldUseJsonData && seasonOverviewData) {
      // Use JSON data structure
      const statePerformanceMap = new Map();
      const stateMapData = (seasonOverviewData.stateMapData as any)[mapSelectedScoringOption] || {};
      const modelData = stateMapData[mapSelectedModel] || {};

      // Calculate averages across selected horizons for each state
      Object.entries(modelData).forEach(([stateNum, horizonData]) => {
        let totalScore = 0;
        let totalCount = 0;

        seasonOverviewData.horizons.forEach((horizon) => {
          const horizonStats = (horizonData as any)[horizon];
          if (horizonStats && horizonStats.sum !== undefined && horizonStats.count > 0) {
            totalScore += horizonStats.sum;
            totalCount += horizonStats.count;
          }
        });

        if (totalCount > 0) {
          const stateId = stateNum.toString().padStart(2, "0");
          statePerformanceMap.set(stateId, totalScore / totalCount);
        }
      });
      return statePerformanceMap;
    }
  }, [shouldUseJsonData, seasonOverviewData, mapSelectedModel, mapSelectedScoringOption]);

  const createTooltip = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    return svg.append("g").attr("class", "soStateMap-tooltip").style("opacity", 0).style("pointer-style", "none");
  };

  const updateTooltip = useCallback(
    (
      tooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
      stateData: {
        stateName: string;
        value: number | undefined;
        metricName: string;
      },
      position: [number, number]
    ) => {
      tooltip.selectAll("*").remove();

      // Background rectangle
      const tooltipRect = tooltip
        .append("rect")
        .attr("fill", "#323944")
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("opacity", 0.95)
        .attr("stroke", "#4e585e")
        .attr("stroke-width", 1);

      // State name
      tooltip
        .append("text")
        .attr("x", 10)
        .attr("y", 16)
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .style("font-size", "13px")
        .style("font-family", "var(--font-dm-sans)")
        .text(stateData.stateName);

      // Value information
      const valueText = tooltip
        .append("text")
        .attr("x", 10)
        .attr("y", 35)
        .attr("fill", "white")
        .style("font-size", "12px")
        .style("font-family", "var(--font-dm-sans)");

      if (stateData.value !== undefined) {
        let formattedValue: string;
        if (mapSelectedScoringOption === "Coverage") {
          formattedValue = `${stateData.value.toFixed(1)}%`;
        } else {
          formattedValue = stateData.value.toFixed(2);
        }
        valueText.text(`${stateData.metricName}: ${formattedValue}`);
      } else {
        valueText.attr("fill", "#aaa").text("No data available");
      }

      // Size the tooltip background
      const textBBox = valueText.node()?.getBBox() || { width: 100, height: 20 };
      const titleBBox = tooltip.select("text").node()?.getBBox() || { width: 100, height: 20 };
      const textWidth = Math.max(textBBox.width, titleBBox.width);
      tooltipRect.attr("width", textWidth + 20).attr("height", 45);

      // Get SVG dimensions
      const svgNode = tooltip.node()?.ownerSVGElement;
      const svgWidth = svgNode?.clientWidth || dimensions.width;
      const svgHeight = svgNode?.clientHeight || dimensions.height;

      // Adjust tooltip position based on boundaries
      const tooltipWidth = textWidth + 20;
      const tooltipHeight = 45;

      // Calculate offsets to keep tooltip in view
      let xOffset = 10;
      let yOffset = -tooltipHeight - 5;

      // Check right edge
      if (position[0] + tooltipWidth + xOffset > svgWidth - 10) {
        xOffset = -tooltipWidth - 10;
      }

      // Check top edge
      if (position[1] + yOffset < 10) {
        yOffset = 10;
      }

      // Apply position
      tooltip.attr("transform", `translate(${position[0] + xOffset},${position[1] + yOffset})`).style("opacity", 1);
    },
    [dimensions.height, dimensions.width, mapSelectedScoringOption]
  );

  const renderMap = useCallback(() => {
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

    // Easier for condition checks
    const isWISBaseline = mapSelectedScoringOption === "WIS/Baseline";

    // Determine min/max values, handling the case of no data
    const minValue = hasData ? (d3.min(performanceValues) ?? 0) : 0;
    const maxValue = hasData ? (d3.max(performanceValues) ?? 1) : 1;

    //NOTE: For the thermometer legend safety, for WIS/Baseline, ensure we have 1.0 in our dataset for proper scaling
    let effectiveValues = [...performanceValues];
    if (isWISBaseline && !effectiveValues.includes(1.0)) {
      // Add 1.0 to effectively consider in scale calculations
      effectiveValues.push(1.0);
    }

    // --- Scale Configuration ---
    let colorScale: d3.ScaleLinear<string, string> | d3.ScaleSymLog<string, string>;
    let legendScale: d3.ScaleLinear<number, number> | d3.ScaleSymLog<number, number>;
    let symlogConstant = 1; // Default symlog constant

    // Calculate symlog constant if needed (based on positive values near zero)
    if (useLogColorScale && hasData) {
      const positiveValues = effectiveValues.filter((v) => v > 0); // Use > 0 for symlog constant logic
      if (positiveValues.length > 0) {
        const sortedValues = [...positiveValues].sort((a, b) => a - b);
        const percentileIndex = Math.max(0, Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.1)));

        // Ensure constant is positive and reasonable, avoiding zero
        symlogConstant = Math.max(sortedValues[percentileIndex] || 0.01, 0.01);
      } else {
        symlogConstant = 0.01; // Fallback if no positive values
      }
    }

    // Legend settings
    const legendWidth = 40;
    const legendHeight = mapHeight * 0.98;
    const legendX = width - margin.right - legendWidth - 10; // Position legend to the right
    const legendY = margin.top + (mapHeight - legendHeight) / 2; // Center legend vertically

    // Create Scales based on Scoring Option and Log Toggle
    let colorDomain: number[];
    let colorRange: string[];
    let legendDomain: number[];
    let legendRangePixels: number[];
    let legendAxis: d3.Axis<d3.NumberValue>;

    /* Two-way (For WIS/Baseline) and normal one-way color gradient scale logic here*/
    if (isWISBaseline) {
      // WIS/Baseline: Diverging Scale
      const pivotValue = 1;
      const effectiveMin = 0;
      const effectiveMax = Math.max(maxValue, pivotValue);

      // Define the 3-point domain around the pivot
      colorDomain = [effectiveMin, pivotValue, effectiveMax];
      colorRange = [GREEN, WHITE, NAVY_BLUE]; // GREEN -> White (at 1) -> Navy Blue

      // Create a scale for calculating the pivot pixel position
      const tempPixelScale = useLogColorScale
        ? d3.scaleSymlog().domain([effectiveMin, effectiveMax]).range([legendHeight, 0]).constant(symlogConstant)
        : d3.scaleLinear().domain([effectiveMin, effectiveMax]).range([legendHeight, 0]);

      // Calculate exact pixel position for pivot value (1.0), ensure integer for clean rendering
      const pivotPixelPosition = Math.round(tempPixelScale(pivotValue));
      /* console.debug("SO/StateMap/tempPixelScale found 1.0 value's pixel position at: ", pivotPixelPosition);
      console.debug("SO/StateMap/color scale implementation's legendHeight and etc. are: ", legendHeight); */

      // Set legend domain and pixels based on calculated pivot position
      legendDomain = colorDomain;
      legendRangePixels = [legendHeight, pivotPixelPosition, 0];

      // Create color scales
      if (useLogColorScale) {
        colorScale = d3.scaleSymlog<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb).constant(symlogConstant);

        legendScale = d3.scaleSymlog().domain(legendDomain).range(legendRangePixels).constant(symlogConstant);
      } else {
        colorScale = d3.scaleLinear<string>().domain(colorDomain).range(colorRange).interpolate(d3.interpolateRgb);

        legendScale = d3.scaleLinear().domain(legendDomain).range(legendRangePixels);
      }

      // Create axis with special handling to ensure "1" is always shown
      legendAxis = d3
        .axisLeft(legendScale)
        .ticks(8)
        .tickValues([...d3.ticks(effectiveMin, effectiveMax, 5), 1.0]) // Ensure 1.0 is included
        .tickPadding(5)
        .tickSizeOuter(0)
        .tickFormat((d) => {
          const value = Number(d);
          if (value === 0) return "0";
          if (Math.abs(value) < 0.01 && Math.abs(value) > 0) return d3.format(".1e")(value);
          if (value === 1) return "1 (Baseline)"; // Highlight baseline
          if (Math.abs(value) < 100 && Math.abs(value) >= 0.1) return d3.format(".1f")(value);
          return d3.format(".0f")(value);
        });
    } else {
      // --- Other Metrics: One-way Color Gradient Scale (Coverage & MAPE)
      colorDomain = [0, maxValue];
      legendDomain = colorDomain;
      legendRangePixels = [legendHeight, 0]; // Bottom to Top

      if (mapSelectedScoringOption === "Coverage") {
        colorRange = [NAVY_BLUE, WHITE];
      } else {
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

      // Create standard axis
      legendAxis = d3
        .axisLeft(legendScale)
        .ticks(8)
        .tickPadding(5)
        .tickSizeOuter(0)
        .tickFormat((d) => {
          const value = Number(d);
          if (value === 0) return "0";
          if (Math.abs(value) < 0.01 && Math.abs(value) > 0) return d3.format(".1e")(value);
          return d3.format(".0f")(value);
        });
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
    // Add gradient stops
    if (isWISBaseline) {
      // For WIS/Baseline, get normalized position of the pivot
      // Convert pixel position to percentage for gradient
      const oneValuePixelPosition = legendScale(1);
      const pivotPercent = (legendHeight - oneValuePixelPosition) / legendHeight;
      //DEBUG: console.debug("SO/StateMap/pivotPercent after calculating onto the thermometer: ", pivotPercent);

      if (minValue >= 1) {
        // All values above baseline: White to Navy
        gradient.append("stop").attr("offset", "0%").attr("stop-color", WHITE);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", NAVY_BLUE);
      } else if (maxValue <= 1) {
        // All values below baseline: GREEN to White
        gradient.append("stop").attr("offset", "0%").attr("stop-color", GREEN);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", WHITE);
      } else {
        const transitionPower = 0.5; // Adjust between 0.2-0.7 for different effects

        // Generate gradient steps below '1' (GREEN to WHITE)
        const bottomSteps = 12;
        for (let i = 0; i <= bottomSteps; i++) {
          // Non-linear distribution of steps - changes faster near white
          const t = i / bottomSteps;
          // Apply power function for non-linear distribution
          const nonLinearT = Math.pow(t, transitionPower);

          // Position in the gradient (as percentage)
          const offset = pivotPercent * nonLinearT;

          // Calculate color - reversed so we get GREEN→WHITE
          const color = d3.interpolateRgb(GREEN, WHITE)(nonLinearT);

          gradient
            .append("stop")
            .attr("offset", `${offset * 100}%`)
            .attr("stop-color", color);
        }

        // Generate gradient steps above '1' (WHITE to NAVY_BLUE)
        const topSteps = 12;
        for (let i = 0; i <= topSteps; i++) {
          // Non-linear distribution of steps - changes faster near white
          const t = i / topSteps;
          // Apply power function for non-linear distribution
          const nonLinearT = Math.pow(t, transitionPower);

          // Position in the gradient (as percentage)
          const offset = pivotPercent + (1 - pivotPercent) * nonLinearT;

          // Calculate color
          const color = d3.interpolateRgb(WHITE, NAVY_BLUE)(nonLinearT);

          gradient
            .append("stop")
            .attr("offset", `${offset * 100}%`)
            .attr("stop-color", color);
        }
      }
    } else {
      // One-Way gradient (handles Coverage, MAPE etc.)
      gradient.append("stop").attr("offset", "0%").attr("stop-color", colorRange[0]);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", colorRange[1]);
    }

    // Draw legend rectangle
    legendGroup.append("rect").attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#color-gradient)");

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
    if (mapSelectedScoringOption === "Coverage") {
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

    // Tooltip Creation
    const tooltip = createTooltip(svg);

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
      .style("cursor", "pointer") // Indicate non-interactive for now
      .on("mouseover", function (event, d: any) {
        // Highlight state on hover
        d3.select(this).attr("stroke-width", 2.5);

        // Get state data
        const stateId = d.id?.toString().padStart(2, "0");
        const stateInfo = locationData.find((loc) => loc.stateNum.toString().padStart(2, "0") === stateId);
        const stateName = stateInfo?.stateName || `State ${stateId}`;
        const value = modelPerformanceData.get(stateId);
        const metricName = mapSelectedScoringOption || "Score";

        // Get mouse position
        const [mouseX, mouseY] = d3.pointer(event, svg.node());

        // Show tooltip
        updateTooltip(tooltip, { stateName, value, metricName }, [mouseX, mouseY]);
      })
      .on("mousemove", function (event) {
        // Update tooltip position
        const [mouseX, mouseY] = d3.pointer(event, svg.node());

        // Move tooltip with mouse (we don't recreate content, just reposition)
        tooltip.attr("transform", function () {
          // Get tooltip dimensions
          const tooltipWidth = this.getBBox().width;
          const tooltipHeight = this.getBBox().height;

          // Calculate offsets to keep tooltip in view
          let xOffset = 10;
          let yOffset = -tooltipHeight - 5;

          // Check boundaries
          if (mouseX + tooltipWidth + xOffset > width - 10) {
            xOffset = -tooltipWidth - 10;
          }
          if (mouseY + yOffset < 10) {
            yOffset = 10;
          }

          return `translate(${mouseX + xOffset},${mouseY + yOffset})`;
        });
      })
      .on("mouseout", function () {
        // Hide tooltip and reset highlight
        tooltip.style("opacity", 0);
        d3.select(this).attr("stroke-width", 1.2);
      });

    // --- Draw DC Circle ---
    // Find a reference point (e.g., Maryland) for positioning DC
    const mdStateFeature = stateFeatures.find((f: any) => f.id === "24"); // Maryland ID is 24
    let dcX = mapWidth * 0.9; // Fallback X
    let dcY = mapHeight * 0.5; // Fallback Y
    const dcRadius = Math.min(mapWidth, mapHeight) * 0.04; // Relative radius

    if (mdStateFeature && path.centroid(mdStateFeature)?.length === 2) {
      const [mdX, mdY] = path.centroid(mdStateFeature);
      // Position DC slightly southeast of Maryland
      dcX = mdX + dcRadius * 3;
      dcY = mdY + dcRadius * 1.2;
    }

    const dcStateId = "11"; // DC ID
    const dcValue = modelPerformanceData.get(dcStateId);

    const dcGroup = visGroup.append("g").attr("class", "dc-visualization").attr("transform", `translate(${dcX}, ${dcY})`); // Use transform for positioning

    // Draw circle for DC with tooltip interaction
    dcGroup
      .append("circle")
      .attr("r", dcRadius)
      .attr("fill", dcValue !== undefined ? colorScale(dcValue) : NO_DATA_COLOR)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event) {
        // Highlight DC on hover
        d3.select(this).attr("stroke-width", 2);

        const stateName = "District of Columbia";
        const metricName = mapSelectedScoringOption || "Score";

        // Get mouse position
        const [mouseX, mouseY] = d3.pointer(event, svg.node());

        // Show tooltip
        updateTooltip(tooltip, { stateName, value: dcValue, metricName }, [mouseX, mouseY]);
      })
      .on("mousemove", function (event) {
        // Update tooltip position
        const [mouseX, mouseY] = d3.pointer(event, svg.node());

        // Move tooltip with mouse
        tooltip.attr("transform", function () {
          // Get tooltip dimensions
          const tooltipWidth = this.getBBox().width;
          const tooltipHeight = this.getBBox().height;

          // Calculate offsets to keep tooltip in view
          let xOffset = 10;
          let yOffset = -tooltipHeight - 5;

          // Check boundaries
          if (mouseX + tooltipWidth + xOffset > width - 10) {
            xOffset = -tooltipWidth - 10;
          }
          if (mouseY + yOffset < 10) {
            yOffset = 10;
          }

          return `translate(${mouseX + xOffset},${mouseY + yOffset})`;
        });
      })
      .on("mouseout", function () {
        // Hide tooltip and reset highlight
        tooltip.style("opacity", 0);
        d3.select(this).attr("stroke-width", 1);
      });

    // Add DC text label inside circle
    dcGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white") // Make text white for better contrast
      .attr("font-size", `${Math.max(12, dcRadius * 0.6)}px`) // Scale font size
      .attr("dy", "0.05em") // Slight vertical adjustment
      .style("pointer-events", "none") // Prevent text from blocking circle hover
      .text("DC");
  }, [dimensions, locationData, mapData, mapSelectedScoringOption, modelPerformanceData, updateTooltip, useLogColorScale]);

  // Render map when dimensions or data change
  useEffect(() => {
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
  }, [dimensions, isResizing, mapData, modelPerformanceData, renderMap, useLogColorScale]);

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={svgRef}
        width='100%'
        height='100%'
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
        preserveAspectRatio='xMidYMid meet'
      />
      <MapSelectorPanel className='absolute left-2 bottom-2' />
    </div>
  );
};

export default SeasonOverviewUSStateMap;
