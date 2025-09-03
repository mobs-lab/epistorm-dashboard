// File: /src/app/evaluations/evaluations-components/SeasonOverview/PIChart.tsx
"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";

import { useAppSelector } from "@/store/hooks";
import { useResponsiveSVG } from "@/utils/responsiveSVG";
import { modelColorMap, modelNames } from "@/types/common";
import { selectSeasonOverviewData, selectShouldUseJsonData } from "@/store/selectors/evaluationSelectors";

// Interface for processed data structure
interface ProcessedCoverageData {
  modelName: string;
  coveragePoints: {
    covLevel: number;
    coverageValue: number;
  }[];
}

const SeasonOverviewPIChart: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const chartRef = useRef<SVGSVGElement>(null);

  // Get data from selectors
  const shouldUseJsonData = useAppSelector(selectShouldUseJsonData);
  const seasonOverviewData = useAppSelector(selectSeasonOverviewData);

  // Process the detailed coverage data using JSON when available, otherwise CSV fallback
  const processedData = useMemo(() => {
    if (shouldUseJsonData && seasonOverviewData) {
      // Use JSON data structure
      const coverageData = seasonOverviewData.coverageData;
      const results: ProcessedCoverageData[] = [];

      // Coverage levels mapping for JSON data
      const coverageLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98];

      // Process each selected model
      for (const modelName of modelNames.filter((m) => seasonOverviewData.selectedModels.includes(m))) {
        const modelCoverageData = (coverageData as any)[modelName];
        if (!modelCoverageData) continue;

        const coveragePoints: { covLevel: number; coverageValue: number }[] = [];

        // Calculate coverage for each level by aggregating across horizons
        coverageLevels.forEach((level) => {
          let totalSum = 0;
          let totalCount = 0;

          seasonOverviewData.horizons.forEach((horizon) => {
            const horizonData = modelCoverageData[horizon];
            if (horizonData && horizonData[level]) {
              totalSum += horizonData[level].sum;
              totalCount += horizonData[level].count;
            }
          });

          if (totalCount > 0) {
            coveragePoints.push({
              covLevel: level,
              coverageValue: totalSum / totalCount,
            });
          }
        });

        if (coveragePoints.length > 0) {
          results.push({
            modelName,
            coveragePoints,
          });
        }
      }

      return results;
    }
    return [];
  }, [shouldUseJsonData, seasonOverviewData]);

  const renderChart = useCallback(() => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    // If no data to display
    if (!processedData || processedData.length === 0) {
      svg
        .append("text")
        .attr("x", dimensions.width / 2)
        .attr("y", dimensions.height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("No coverage data available for selected criteria");
      return;
    }

    // Chart dimensions
    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 20, right: 10, bottom: 45, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Get confidence levels (x-axis values)
    const covLevels = processedData[0].coveragePoints.map((p) => p.covLevel);

    // X scale - confidence levels
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(covLevels) || 10, d3.max(covLevels) || 98])
      .range([0, innerWidth]);

    // Calculate domain for y-scale
    const allCoverageValues = processedData.flatMap((model) => model.coveragePoints.map((p) => p.coverageValue));
    const minValue = Math.max(0, (d3.min(allCoverageValues) || 0) - 5);
    const maxValue = Math.min(100, (d3.max(allCoverageValues) || 100) + 5);

    // Y scale - coverage values
    const yScale = d3.scaleLinear().domain([minValue, maxValue]).range([innerHeight, 0]);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(covLevels)
          .tickFormat((d) => d.toString())
      )
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "11px")
      .attr("dx", function (d) {
        return d === 98 ? "6px" : "0";
      });

    // Y axis
    g.append("g").call(d3.axisLeft(yScale).ticks(5)).selectAll("text").attr("fill", "white").style("font-size", "10px");

    /* Guidance Line (y=x) */
    g.append("line")
      .attr("x1", xScale(10))
      .attr("y1", yScale(10))
      .attr("x2", xScale(98))
      .attr("y2", yScale(98))
      .attr("stroke", "white")
      .attr("stroke-width", 4)
      .attr("stroke-dasharray", "10,6")
      .style("opacity", 0.6);

    // Axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "14px")
      .text("Prediction Interval");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "14px")
      .text("Coverage %");

    // Create tooltip
    const tooltip = svg.append("g").attr("class", "tooltip").style("opacity", 0).style("pointer-events", "none");

    const tooltipRect = tooltip
      .append("rect")
      .attr("fill", "#323944")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("opacity", 0.95)
      .attr("stroke", "#555")
      .attr("stroke-width", 1);

    const tooltipText = tooltip
      .append("text")
      .attr("fill", "white")
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .style("font-family", "var(--font-dm-sans)");

    // Area generator
    /* const area = d3
      .area<{ covLevel: number; coverageValue: number }>()
      .x((d) => xScale(d.covLevel))
      .y0(innerHeight)
      .y1((d) => yScale(d.coverageValue))
      .curve(d3.curveCatmullRom); */

    // Line generator
    const line = d3
      .line<{ covLevel: number; coverageValue: number }>()
      .x((d) => xScale(d.covLevel))
      .y((d) => yScale(d.coverageValue))
      .curve(d3.curveCatmullRom);

    // Draw areas and lines for each model
    // Sort data so that models with higher values are drawn first (towards bottom, in terms of z-index)
    // To avoid larger shaded region being on top of smaller ones, so all the data points can be reached
    const sortedData = [...processedData].sort((a, b) => {
      const aAvg = d3.mean(a.coveragePoints, (d) => d.coverageValue) || 0;
      const bAvg = d3.mean(b.coveragePoints, (d) => d.coverageValue) || 0;
      return bAvg - aAvg;
    });

    sortedData.forEach((model) => {
      const color = modelColorMap[model.modelName];

      // Draw area with gradient opacity
      // g.append("path").datum(model.coveragePoints).attr("fill", color).attr("fill-opacity", 0.3).attr("d", area);

      // Draw line
      g.append("path").datum(model.coveragePoints).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);

      // Add points with hover interaction
      g.selectAll(`.point-${model.modelName}`)
        .data(model.coveragePoints)
        .enter()
        .append("circle")
        .attr("class", `point-${model.modelName}`)
        .attr("cx", (d: { covLevel: number; coverageValue: number }) => xScale(d.covLevel))
        .attr("cy", (d: { covLevel: number; coverageValue: number }) => yScale(d.coverageValue))
        .attr("r", 5)
        .attr("fill", color)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d: { covLevel: number; coverageValue: number }) {
          const [mouseX, mouseY] = d3.pointer(event, svg.node());

          // Prepare tooltip content
          tooltipText.selectAll("*").remove();
          tooltipText.append("tspan").attr("x", 8).attr("y", 17).text(`${model.modelName}`);
          tooltipText
            .append("tspan")
            .attr("x", 8)
            .attr("y", 35)
            .text(`PI: ${d.covLevel}%, Coverage: ${d.coverageValue.toFixed(1)}%`);

          // Get tooltip dimensions
          const bbox = tooltipText.node()!.getBBox();
          const tooltipWidth = bbox.width + 16;
          const tooltipHeight = bbox.height + 16;
          tooltipRect.attr("width", tooltipWidth).attr("height", tooltipHeight);

          // Get SVG dimensions
          const svgNode = svg.node();
          const svgWidth = svgNode?.clientWidth || dimensions.width;
          const svgHeight = svgNode?.clientHeight || dimensions.height;

          // Detect proximity to edges
          const leftProximity = mouseX;
          const rightProximity = svgWidth - mouseX;
          const topProximity = mouseY;
          const bottomProximity = svgHeight - mouseY;

          // Edge buffer
          const horizontalEdgeBuffer = 20;

          // Calculate horizontal position to avoid clipping
          let xOffset: number;
          if (rightProximity < tooltipWidth + horizontalEdgeBuffer) {
            // Too close to right edge, position to the left
            xOffset = -tooltipWidth - horizontalEdgeBuffer;
          } else if (leftProximity < horizontalEdgeBuffer) {
            // Too close to left edge, position to the right
            xOffset = horizontalEdgeBuffer;
          } else {
            // Default position with slight offset
            xOffset = 10;
          }

          const verticalEdgeBuffer = 60;
          // Calculate vertical position to avoid clipping
          let yOffset: number;
          if (bottomProximity < tooltipHeight + verticalEdgeBuffer) {
            // Too close to bottom edge, position above
            yOffset = -tooltipHeight - verticalEdgeBuffer;
          } else if (topProximity < verticalEdgeBuffer) {
            // Too close to top edge, position below
            yOffset = 10;
          } else {
            // Default position above the point
            yOffset = -tooltipHeight - 10;
          }

          // Apply calculated position
          tooltip.attr("transform", `translate(${mouseX + xOffset},${mouseY + yOffset})`).style("opacity", 1);

          // Highlight the point
          d3.select(this).attr("r", 7).attr("stroke", "white").attr("stroke-width", 2);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
          d3.select(this).attr("r", 5).attr("stroke", "none");
        });
    });
  }, [processedData, dimensions]);

  /* UseEffect Hook for rendering the chart */
  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && chartRef.current) {
      renderChart();
    }
  }, [dimensions, isResizing, processedData, renderChart]);

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={chartRef}
        width='100%'
        height='100%'
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
        preserveAspectRatio='xMidYMid meet'
      />
    </div>
  );
};

export default SeasonOverviewPIChart;
