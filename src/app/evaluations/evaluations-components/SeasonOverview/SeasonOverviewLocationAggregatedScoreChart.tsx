// File: /src/app/evaluations/evaluations-components/SeasonOverview/QuantileStatisticsChartExtended.tsx
"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useAppSelector } from "@/store/hooks";
import {
  modelColorMap,
  modelNames,
} from "@/interfaces/epistorm-constants";
import { useResponsiveSVG } from "@/interfaces/responsiveSVG";

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
}

const SeasonOverviewLocationAggregatedScoreChart: React.FC<
  SeasonOverviewLocationAggregatedScoreChartAltProps
> = ({
  type,
}) => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG({
    debounceMs: 300,
    throttleMs: 150,
  });
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (
      !isResizing &&
      dimensions.width > 0 &&
      dimensions.height > 0 &&
      chartRef.current
    ) {
      renderChart();
    }
  }, [dimensions, isResizing]);

  // Create tooltip element with initial hidden state
  const createTooltip = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  ) => {
    return svg
      .append("g")
      .attr("class", "iqr-tooltip")
      .style("opacity", 0)
      .style("pointer-events", "none");
  };

  // Update tooltip with IQR data and positioning
  const updateTooltip = (
    tooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: IQRData,
    position: [number, number],
    direction: TooltipDirection,
    modelIndex: number,
    totalModels: number
  ) => {
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

    // Calculate position offset based on direction
    let xOffset = 0;
    let yOffset = 0;

    switch (direction) {
      case TooltipDirection.TOP:
        xOffset = -tooltipWidth / 2;
        yOffset = -tooltipHeight - 15;
        break;
      case TooltipDirection.RIGHT:
        xOffset = 15;
        yOffset = -tooltipHeight / 2;
        break;
      case TooltipDirection.BOTTOM:
        xOffset = -tooltipWidth / 2;
        yOffset = 15;
        break;
      case TooltipDirection.LEFT:
        xOffset = -tooltipWidth - 15;
        yOffset = -tooltipHeight / 2;
        break;
    }

    // Position the tooltip
    tooltip
      .attr(
        "transform",
        `translate(${position[0] + xOffset},${position[1] + yOffset})`
      )
      .style("opacity", 1);
  };

  const renderChart = () => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    // Chart dimensions
    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 10, right: 10, bottom: 30, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use models from constant
    const displayedModels = modelNames;

    // Generate dummy data for visualization
    const data = displayedModels.map((model) => ({
      model,
      q05: Math.random() * 10,
      q25: Math.random() * 20 + 10,
      median: Math.random() * 30 + 30,
      q75: Math.random() * 20 + 60,
      q95: Math.random() * 10 + 80,
    }));

    // Y scale - models
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.model))
      .range([0, innerHeight])
      .padding(0.2);

    // X scale - values
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);

    // Y axis with truncated model names for readability
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((g) => g.selectAll(".tick text").remove())
      .call((g) => g.select(".domain").attr("stroke", "white"));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "9px");

    // Invisible overlay for better hover detection
    const boxGroups = g
      .selectAll(".model-box-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "model-box-group");

    // Render boxplots with interactive elements
    data.forEach((d, i) => {
      const y = yScale(d.model) || 0;
      const boxHeight = yScale.bandwidth();
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
        .attr("y1", y + boxHeight / 2 - 4)
        .attr("y2", y + boxHeight / 2 + 4)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      boxGroup
        .append("line")
        .attr("x1", xScale(d.q95))
        .attr("x2", xScale(d.q95))
        .attr("y1", y + boxHeight / 2 - 4)
        .attr("y2", y + boxHeight / 2 + 4)
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
          let tooltip = svg.select(".iqr-tooltip");
          if (tooltip.empty()) {
            tooltip = createTooltip(svg);
          }
          
          // Dynamically determine tooltip direction based on model position
          // Top half of models: show tooltip below (BOTTOM)
          // Bottom half of models: show tooltip above (TOP)
          const modelIndex = displayedModels.indexOf(d.model);
          const totalModels = displayedModels.length;
          const direction = modelIndex < Math.floor(totalModels / 2) 
            ? TooltipDirection.BOTTOM 
            : TooltipDirection.TOP;
          
          updateTooltip(tooltip, d, [mouseX, mouseY], direction, modelIndex, totalModels);
          tooltip.raise(); // Ensure tooltip is on top of all other elements

          // Highlight the active box
          d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
        })
        .on("mousemove", function (event) {
          const [mouseX, mouseY] = d3.pointer(event, svg.node());
          const tooltip = svg.select(".iqr-tooltip");
          
          // Maintain same dynamic direction logic on mousemove
          const modelIndex = displayedModels.indexOf(d.model);
          const totalModels = displayedModels.length;
          const direction = modelIndex < Math.floor(totalModels / 2) 
            ? TooltipDirection.BOTTOM 
            : TooltipDirection.TOP;
          
          updateTooltip(tooltip, d, [mouseX, mouseY], direction, modelIndex, totalModels);
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

    // Create tooltip at the end to ensure it's on top of all elements
    const tooltip = createTooltip(svg);
  };

  return (
    <div ref={containerRef} className='w-full h-full relative'>
      <svg
        ref={chartRef}
        width='100%'
        height='100%'
        style={{
          fontFamily: "var(--font-dm-sans)",
          opacity: isResizing ? 0.5 : 1,
          transition: "opacity 0.2s ease",
        }}
        preserveAspectRatio='xMidYMid meet'
      />
    </div>
  );
};

export default SeasonOverviewLocationAggregatedScoreChart;