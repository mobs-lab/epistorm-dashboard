// File: /src/app/evaluations/evaluations-components/SeasonOverview/QuantileStatisticsChartExtended.tsx
"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { useAppSelector } from "@/store/hooks";
import { modelColorMap, modelNames } from "@/types/common";
import { useResponsiveSVG } from "@/utils/responsiveSVG";

import { selectSeasonOverviewData, selectShouldUseJsonData } from "@/store/selectors/evaluationSelectors";
import { BoxplotStats } from "@/types/domains/evaluations";

// Options for controlling to which direction tooltip appears relative to the mouse pointer
export enum TooltipDirection {
  TOP = "top",
  RIGHT = "right",
  BOTTOM = "bottom",
  LEFT = "left",
}

interface SeasonOverviewLocationAggregatedScoreChartAltProps {
  type: "wis" | "mape";
  // Removed tooltipDirection prop as it will be determined dynamically
}

// IQR info and shape, easier to reference this way
interface IQRData {
  model: string;
  q05: number;
  q25: number;
  median: number;
  q75: number;
  q95: number;
  count: number; // show number of data points in tooltip
}

const SeasonOverviewLocationAggregatedScoreChart: React.FC<SeasonOverviewLocationAggregatedScoreChartAltProps> = ({ type }) => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG({
    debounceMs: 300,
    throttleMs: 150,
  });
  const chartRef = useRef<SVGSVGElement>(null);

  // Get data from selectors
  const shouldUseJsonData = useAppSelector(selectShouldUseJsonData);
  const seasonOverviewData = useAppSelector(selectSeasonOverviewData);

  const { wisChartScaleType, mapeChartScaleType } = useAppSelector((state) => state.evaluationsSeasonOverviewSettings);

  // Process evaluation score data based on selected criteria, enhanced with memoization
  // Process data using JSON when available, otherwise fall back to CSV processing
  const processedData = useMemo(() => {
    if (shouldUseJsonData && seasonOverviewData) {
      // Use JSON data
      const metric = type === "wis" ? "WIS/Baseline" : "MAPE";
      const results: IQRData[] = [];

      if (!seasonOverviewData.iqrData) {
        return results;
      }

      // Parse user-selected key to string then send to selector
      const horizonKey = seasonOverviewData.horizons
        .slice()
        .sort((a, b) => a - b)
        .join(",");

      // Final processed data output should be grouped by model
      // Combine data across selected horizons for each model
      for (const modelName of modelNames.filter((m) => seasonOverviewData.selectedModels.includes(m))) {
        const iqrData = (seasonOverviewData.iqrData as any)[metric]?.[modelName];
        if (!iqrData) continue;

        const finalDataForModel: BoxplotStats = iqrData?.[horizonKey];

        if (finalDataForModel) {
          results.push({
            model: modelName,
            q05: Number(finalDataForModel.q05.toFixed(3)),
            q25: Number(finalDataForModel.q25.toFixed(3)),
            median: Number(finalDataForModel.median.toFixed(3)),
            q75: Number(finalDataForModel.q75.toFixed(3)),
            q95: Number(finalDataForModel.q95.toFixed(3)),
            count: finalDataForModel.count,
          });
        } else {
          console.warn(
            `DEBUG: Seaon Overview/LocationAggregationBoxPlot/processedData()/No pre-calculated IQR data for ${modelName} matching horizons: ${horizonKey}.`
          );
        }
      }
      return results;
    }
    return [];
  }, [shouldUseJsonData, seasonOverviewData, type]);

  // Create tooltip element with initial hidden state
  const createTooltip = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    return svg.append("g").attr("class", "iqr-tooltip").style("opacity", 0).style("pointer-events", "none");
  };

  // Update tooltip with IQR data and positioning
  const updateTooltip = useCallback(
    (
      tooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
      data: IQRData,
      position: [number, number],
      direction: TooltipDirection
    ) => {
      return () => {
        tooltip.selectAll("*").remove();

        const padding = 12;
        const headerHeight = 24;
        const rowHeight = 20;
        const colWidth = 90;

        // Format values based on chart type
        const formatValue = (value: number) => {
          if (type === "mape") {
            return `${value.toFixed(1)}%`;
          }
          return value.toFixed(3);
        };

        // Create the tooltip container
        const background = tooltip
          .append("rect")
          .attr("fill", "#323944")
          .attr("rx", 8)
          .attr("ry", 8)
          .attr("opacity", 0.95)
          .attr("stroke", "#555")
          .attr("stroke-width", 1);

        // Add model name header
        tooltip
          .append("text")
          .attr("x", padding)
          .attr("y", padding + 16)
          .attr("fill", "white")
          .attr("font-weight", "bold")
          .style("font-family", "var(--font-dm-sans)")
          .style("font-size", "12px")
          .text(data.model);

        // Define table structure
        const metrics = ["5%", "25%", "Median", "75%", "95%"];
        const values = [data.q05, data.q25, data.median, data.q75, data.q95];

        // Add header for metric column
        tooltip
          .append("text")
          .attr("x", padding)
          .attr("y", padding + headerHeight + rowHeight - 4)
          .attr("fill", "#aaa")
          .attr("font-size", "10px")
          .style("font-family", "var(--font-dm-sans)")
          .text("Percentile");

        // Add header for value column
        tooltip
          .append("text")
          .attr("x", padding + colWidth + 10)
          .attr("y", padding + headerHeight + rowHeight - 4)
          .attr("fill", "#aaa")
          .attr("font-size", "12px")
          .style("font-family", "var(--font-dm-sans)")
          .text("Value");

        // Draw separator line
        tooltip
          .append("line")
          .attr("x1", padding)
          .attr("x2", padding + colWidth * 2)
          .attr("y1", padding + headerHeight + rowHeight + 2)
          .attr("y2", padding + headerHeight + rowHeight + 2)
          .attr("stroke", "#555")
          .attr("stroke-width", 1);

        // Add metric labels
        metrics.forEach((metric, i) => {
          tooltip
            .append("text")
            .attr("x", padding)
            .attr("y", padding + headerHeight + (i + 2) * rowHeight)
            .attr("fill", "white")
            .attr("font-size", "12px")
            .style("font-family", "var(--font-dm-sans)")
            .text(metric);
        });

        // Add values
        values.forEach((value, i) => {
          tooltip
            .append("text")
            .attr("x", padding + colWidth + 10)
            .attr("y", padding + headerHeight + (i + 2) * rowHeight)
            .attr("fill", "white")
            .attr("font-size", "12px")
            .style("font-family", "var(--font-dm-sans)")
            .text(formatValue(value));
        });

        // Size the tooltip background
        const tooltipWidth = colWidth * 2 + padding * 2;
        const tooltipHeight = headerHeight + (metrics.length + 2) * rowHeight;

        background.attr("width", tooltipWidth).attr("height", tooltipHeight);

        // Get SVG dimensions by getting the parent of the tooltip
        // This works because the tooltip is a child of the SVG element
        const tooltipParent = tooltip.node()?.parentNode as SVGSVGElement;
        const svgWidth = tooltipParent?.clientWidth || dimensions.width;
        const svgHeight = tooltipParent?.clientHeight || dimensions.height;

        // Detect proximity to edges
        const leftProximity = position[0];
        const rightProximity = svgWidth - position[0];
        const topProximity = position[1];
        const bottomProximity = svgHeight - position[1];

        // Use a consistent buffer distance for all edges
        const edgeBuffer = 20;

        // Calculate the default centered offset (tooltip centered on mouse)
        const defaultXOffset = -tooltipWidth / 2;

        // Determine horizontal positioning with symmetric logic
        let xOffset: number;

        // Using truly symmetric conditions for left and right edges
        if (rightProximity < tooltipWidth / 2 + edgeBuffer) {
          // Too close to right edge, position fully to the left
          xOffset = -tooltipWidth - edgeBuffer;
        } else if (leftProximity < tooltipWidth / 2 + edgeBuffer) {
          // Too close to left edge, position fully to the right
          xOffset = edgeBuffer;
        } else {
          // Enough space on both sides, center the tooltip horizontally
          xOffset = defaultXOffset;
        }

        // Similar symmetric logic for vertical positioning
        let yOffset: number;
        if (bottomProximity < tooltipHeight / 2 + edgeBuffer) {
          // Too close to bottom edge, position above
          yOffset = -tooltipHeight - edgeBuffer;
        } else if (topProximity < tooltipHeight / 2 + edgeBuffer) {
          // Too close to top edge, position below
          yOffset = edgeBuffer;
        } else {
          // Default based on original direction with fallback to above
          yOffset =
            direction === TooltipDirection.TOP
              ? -tooltipHeight - edgeBuffer
              : direction === TooltipDirection.BOTTOM
                ? edgeBuffer
                : -tooltipHeight - edgeBuffer;
        }

        // Apply the calculated offsets
        tooltip.attr("transform", `translate(${position[0] + xOffset},${position[1] + yOffset})`).style("opacity", 1);
      };
    },
    [type]
  );

  const generateEvenlySpacedTicks = (scale: d3.ScaleSymLog<number, number, never>, pixelWidth: number, numTicks = 8, isWis = false) => {
    if (isWis) {
      // For WIS/Baseline data, trying a specialized approach
      const maxValue = scale.domain()[1];

      // Create a predefined set of tick values appropriate for WIS/Baseline
      let ticks;

      if (maxValue <= 1) {
        // If max is small, focus on decimals
        ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
      } else if (maxValue <= 2) {
        // For max values up to 2
        ticks = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2];
      } else if (maxValue <= 5) {
        // For max values up to 5
        ticks = [0, 0.25, 0.5, 0.75, 1, 2, 3, 5];
      } else {
        // For larger range
        ticks = [0, 0.5, 1, 2, 3, 4, 5, 6, 7, 8].filter((v) => v <= maxValue);
      }

      return ticks.filter((v) => v <= maxValue);
    } else {
      // Original logic for MAPE - evenly distribute in pixel space
      const pixelPositions = [];
      for (let i = 0; i < numTicks; i++) {
        pixelPositions.push((i / (numTicks - 1)) * pixelWidth);
      }

      const dataValues = pixelPositions.map((pos) => {
        const value = scale.invert(pos);
        return Math.round(value);
      });

      const uniqueValues = Array.from(new Set([0, ...dataValues])).sort((a, b) => a - b);
      return uniqueValues;
    }
  };

  const renderChart = useCallback(() => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    // Chart dimensions
    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 10, right: 10, bottom: 45, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Check if we have data to display
    if (processedData.length === 0) {
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("No data available for selected criteria");
      return;
    }

    // Sort data for consistent display
    const data = [...processedData].sort((a, b) => {
      return modelNames.indexOf(a.model) - modelNames.indexOf(b.model);
    });

    // Calculate dynamic padding based on number of models
    const modelCount = data.length;
    // Formula: fewer models = more padding (inversely proportional)
    const dynamicPadding = Math.min(0.8, Math.max(0.1, 0.8 - modelCount * 0.09));

    // Y scale - models
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.model))
      .range([0, innerHeight])
      .padding(dynamicPadding);

    // X scale - values
    // Calculate domain from data instead of fixed 0-100
    const maxValue = Math.max(...data.map((d) => d.q95)) * 1.1; // Add 10% padding
    // const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);

    const dataRange = {
      min: Math.min(...data.map((d) => d.q05)),
      max: Math.max(...data.map((d) => d.q95)),
      median: d3.median(data, (d) => d.median) || Math.min(...data.map((d) => d.median)),
    };

    // Calculate a good constant based on data characteristics
    const calculateConstant = () => {
      // Ratio between max and median can help determine appropriate constant
      const ratio = dataRange.max / dataRange.median;

      if (ratio > 10) {
        /* Usually this option is for WIS/Baseline */
        return 0.3; // Very skewed data, use small constant
      } else if (ratio > 5) {
        return 1.2; // Moderately skewed
      } else {
        return 2.8; // Less skewed
      }
    };

    const constant = calculateConstant();
    console.log(`Using symlog constant: ${constant} for ${type} data`);

    // Get the active scale type based on chart type
    const scaleType = type === "wis" ? wisChartScaleType : mapeChartScaleType;

    // Create appropriate scale based on the scaleType
    let xScale;
    if (scaleType === "log") {
      const constant = calculateConstant();
      xScale = d3.scaleSymlog().domain([0, maxValue]).constant(constant).range([0, innerWidth]);
    } else {
      xScale = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);
    }

    // Y axis with truncated model names for readability
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((g) => g.selectAll(".tick text").remove())
      .call((g) => g.select(".domain").attr("stroke", "white"));

    const customTicks = generateEvenlySpacedTicks(xScale as any, innerWidth, 8, type === "wis");

    // X axis with proper decimal formatting
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(customTicks)
          .tickFormat((d) => {
            if (type === "wis") {
              // For WIS values, use appropriate decimal places
              if (d === 0) return "0";
              if (Number(d) < 1) return d3.format(".1f")(d); // One decimal for values < 1
              return d3.format("d")(d); // No decimals for whole numbers
            } else {
              // For MAPE, use integers
              return d3.format("d")(d);
            }
          })
      )
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "11px");

    // X axis label beneath the ticks
    g.append("g").attr("transform", `translate(${innerWidth / 2}, ${innerHeight + 10})`);

    if (type == "wis") {
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "14px")
        .text("WIS/Baseline");
    } else {
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "14px")
        .text("MAPE");
    }

    // Invisible overlay for better hover detection
    const boxGroups = g.selectAll(".model-box-group").data(data).enter().append("g").attr("class", "model-box-group");

    // Render boxplots with interactive elements
    data.forEach((d, i) => {
      const y = yScale(d.model) || 0;
      const boxHeight = Math.max(yScale.bandwidth(), 20);
      const boxGroup = g.append("g").attr("class", `box-${d.model}`);

      // Draw whiskers
      boxGroup
        .append("line")
        .attr("x1", xScale(d.q05))
        .attr("x2", xScale(d.q95))
        .attr("y1", y + boxHeight / 2)
        .attr("y2", y + boxHeight / 2)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      // Draw whisker end caps
      boxGroup
        .append("line")
        .attr("x1", xScale(d.q05))
        .attr("x2", xScale(d.q05))
        .attr("y1", y + boxHeight / 2 - 6)
        .attr("y2", y + boxHeight / 2 + 6)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      boxGroup
        .append("line")
        .attr("x1", xScale(d.q95))
        .attr("x2", xScale(d.q95))
        .attr("y1", y + boxHeight / 2 - 6)
        .attr("y2", y + boxHeight / 2 + 6)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      // Draw IQR box with tooltip interaction
      boxGroup
        .append("rect")
        .attr("x", xScale(d.q25))
        .attr("width", xScale(d.q75) - xScale(d.q25))
        .attr("y", y)
        .attr("height", boxHeight)
        .attr("fill", modelColorMap[d.model])
        .attr("opacity", 0.995)
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          const [mouseX, mouseY] = d3.pointer(event, svg.node());

          // Create tooltip if it doesn't exist
          let tooltip: d3.Selection<SVGGElement, unknown, null, undefined> | d3.Selection<d3.BaseType, unknown, null, undefined> =
            svg.select(".iqr-tooltip");
          if (tooltip.empty()) {
            tooltip = createTooltip(svg);
          }

          // Dynamically determine tooltip direction based on model position
          // Top half of models: show tooltip below (BOTTOM)
          // Bottom half of models: show tooltip above (TOP)
          const modelIndex = data.indexOf(d);
          const totalModels = data.length;
          const direction = modelIndex < Math.floor(totalModels / 2) ? TooltipDirection.BOTTOM : TooltipDirection.TOP;

          updateTooltip(tooltip as d3.Selection<SVGGElement, unknown, null, undefined>, d, [mouseX, mouseY], direction);
          tooltip.raise(); // Ensure tooltip is on top of all other elements

          // Highlight the active box
          d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
        })
        .on("mousemove", function (event) {
          const [mouseX, mouseY] = d3.pointer(event, svg.node());
          const tooltip = svg.select(".iqr-tooltip");

          // Maintain same dynamic direction logic on mousemove
          const modelIndex = data.indexOf(d);
          const totalModels = data.length;
          const direction = modelIndex < Math.floor(totalModels / 2) ? TooltipDirection.BOTTOM : TooltipDirection.TOP;

          updateTooltip(tooltip as unknown as d3.Selection<SVGGElement, unknown, null, undefined>, d, [mouseX, mouseY], direction);
          tooltip.raise(); // Ensure tooltip stays on top during movement
        })
        .on("mouseout", function () {
          // Hide tooltip and remove highlight
          svg.select(".iqr-tooltip").style("opacity", 0);
          d3.select(this).attr("stroke", "none");
        });

      // Draw median line
      boxGroup
        .append("line")
        .attr("x1", xScale(d.median))
        .attr("x2", xScale(d.median))
        .attr("y1", y)
        .attr("y2", y + boxHeight)
        .attr("stroke", "white")
        .attr("stroke-width", 2);
    });

    // Reference line at x=1 for WIS/Baseline
    if (type === "wis") {
      // Add vertical reference line at x=1
      g.append("line")
        .attr("class", "reference-line")
        .attr("x1", xScale(1))
        .attr("x2", xScale(1))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 1);
    }

    // Create tooltip at the end to ensure it's on top of all elements
    const tooltip = createTooltip(svg);
  }, [dimensions.height, dimensions.width, mapeChartScaleType, processedData, type, updateTooltip, wisChartScaleType]);

  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && chartRef.current) {
      renderChart();
    }
  }, [dimensions, isResizing, processedData, wisChartScaleType, mapeChartScaleType, renderChart]);

  return (
    <div ref={containerRef} className='w-full h-full relative'>
      <svg
        ref={chartRef}
        width='100%'
        height='100%'
        /* style={{
          fontFamily: "var(--font-dm-sans)",
          opacity: isResizing ? 0.5 : 1,
          transition: "opacity 0.2s ease",
        }} */
        preserveAspectRatio='xMidYMid meet'
      />
    </div>
  );
};

export default SeasonOverviewLocationAggregatedScoreChart;
