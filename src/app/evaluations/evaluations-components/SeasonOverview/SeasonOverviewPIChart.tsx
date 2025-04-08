// File: /src/app/evaluations/evaluations-components/SeasonOverview/PIChart.tsx
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { useResponsiveSVG } from "@/interfaces/responsiveSVG";
import { modelColorMap, modelNames } from "@/interfaces/epistorm-constants";
import { useAppSelector } from "@/store/hooks";
import { addWeeks } from "date-fns";

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

  // Get data from Redux store
  const detailedCoverageData = useAppSelector((state) => state.evaluationsSingleModelScoreData.detailedCoverage);
  const { evaluationSeasonOverviewHorizon, selectedAggregationPeriod, aggregationPeriods } = useAppSelector(
    (state) => state.evaluationsSeasonOverviewSettings
  );

  // Process the detailed coverage data based on selected criteria
  const processedData = useMemo(() => {
    if (!detailedCoverageData || evaluationSeasonOverviewHorizon.length === 0 || !selectedAggregationPeriod) {
      return [];
    }

    // Find selected time period
    const selectedPeriod = aggregationPeriods.find((p) => p.id === selectedAggregationPeriod);

    if (!selectedPeriod) {
      return [];
    }

    // Pre-create set for faster horizon lookups
    const horizonSet = new Set(evaluationSeasonOverviewHorizon);

    // Process data for each model
    const results: ProcessedCoverageData[] = [];

    // Map from coverage field names to confidence levels
    const coverageMapping = [
      { field: "coverage10", level: 10 },
      { field: "coverage20", level: 20 },
      { field: "coverage30", level: 30 },
      { field: "coverage40", level: 40 },
      { field: "coverage50", level: 50 },
      { field: "coverage60", level: 60 },
      { field: "coverage70", level: 70 },
      { field: "coverage80", level: 80 },
      { field: "coverage90", level: 90 },
      { field: "coverage95", level: 95 },
      { field: "coverage98", level: 98 },
    ];

    // Process each model's data
    for (const model of detailedCoverageData) {
      // Skip if no coverageData
      if (!model.coverageData || model.coverageData.length === 0) continue;

      // Initialize arrays to store sums and counts for each confidence level
      const coverageSums = coverageMapping.map(() => 0);
      const coverageCounts = coverageMapping.map(() => 0);

      // Filter and aggregate coverage data
      for (const entry of model.coverageData) {
        // Skip if horizon doesn't match
        if (!horizonSet.has(entry.horizon)) continue;

        // Calculate target date for filtering by time period
        const referenceDate = entry.referenceDate;
        const targetDate = addWeeks(referenceDate, entry.horizon);

        // Skip if outside selected time period
        if (referenceDate < selectedPeriod.startDate || targetDate > selectedPeriod.endDate) continue;

        // This entry passes all filters, add its values to the sums
        coverageMapping.forEach((mapping, index) => {
          // Add value to the sum for this confidence level
          coverageSums[index] += entry[mapping.field as keyof typeof entry] as number;
          coverageCounts[index]++;
        });
      }

      // If we have data for this model, calculate averages and add to results
      if (coverageCounts.some((count) => count > 0)) {
        const coveragePoints = coverageMapping.map((mapping, index) => ({
          covLevel: mapping.level,
          coverageValue: coverageCounts[index] > 0 ? coverageSums[index] / coverageCounts[index] : 0,
        }));

        results.push({
          modelName: model.modelName,
          coveragePoints: coveragePoints,
        });
      }
    }

    return results;
  }, [detailedCoverageData, evaluationSeasonOverviewHorizon, selectedAggregationPeriod, aggregationPeriods]);

  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && chartRef.current) {
      renderChart();
    }
  }, [dimensions, isResizing, processedData]);

  const renderChart = () => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    // If no data to display
    if (processedData.length === 0) {
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
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Get confidence levels (x-axis values)
    const confidenceLevels = processedData[0].coveragePoints.map((p) => p.covLevel);

    // X scale - confidence levels
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(confidenceLevels) || 10, d3.max(confidenceLevels) || 98])
      .range([0, innerWidth]);

    // Calculate domain for y-scale
    const allCoverageValues = processedData.flatMap((model) => model.coveragePoints.map((p) => p.coverageValue));
    const minValue = Math.max(0, (d3.min(allCoverageValues) || 0) - 5); // Allow some padding, but not below 0
    const maxValue = Math.min(100, (d3.max(allCoverageValues) || 100) + 5); // Allow some padding, but not above 100

    // Y scale - coverage values
    const yScale = d3.scaleLinear().domain([minValue, maxValue]).range([innerHeight, 0]);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickValues(confidenceLevels))
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "10px");

    // Y axis
    g.append("g").call(d3.axisLeft(yScale).ticks(5)).selectAll("text").attr("fill", "white").style("font-size", "10px");

    // Axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "12px")
      .text("PI");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "12px")
      .text("Cov.");

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
    const area = d3
      .area<{ confidenceLevel: number; coverageValue: number }>()
      .x((d) => xScale(d.confidenceLevel))
      .y0(innerHeight)
      .y1((d) => yScale(d.coverageValue))
      .curve(d3.curveCatmullRom);

    // Line generator
    const line = d3
      .line<{ confidenceLevel: number; coverageValue: number }>()
      .x((d) => xScale(d.confidenceLevel))
      .y((d) => yScale(d.coverageValue))
      .curve(d3.curveCatmullRom);

    // Draw areas and lines for each model
    // Sort data so that models with lower values are drawn first (for better visibility)
    const sortedData = [...processedData].sort((a, b) => {
      const aAvg = d3.mean(a.coveragePoints, (d) => d.coverageValue) || 0;
      const bAvg = d3.mean(b.coveragePoints, (d) => d.coverageValue) || 0;
      return aAvg - bAvg;
    });

    sortedData.forEach((model) => {
      const color = modelColorMap[model.modelName];

      // Draw area with gradient opacity
      g.append("path").datum(model.coveragePoints).attr("fill", color).attr("fill-opacity", 0.3).attr("d", area);

      // Draw line
      g.append("path").datum(model.coveragePoints).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);

      // Add points with hover interaction
      g.selectAll(`.point-${model.modelName}`)
        .data(model.coveragePoints)
        .enter()
        .append("circle")
        .attr("class", `point-${model.modelName}`)
        .attr("cx", (d) => xScale(d.covLevel))
        .attr("cy", (d) => yScale(d.coverageValue))
        .attr("r", 4)
        .attr("fill", color)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          const [x, y] = d3.pointer(event, svg.node());

          // Show tooltip
          tooltip.attr("transform", `translate(${x + 10},${y - 30})`).style("opacity", 1);

          tooltipText.selectAll("*").remove();

          tooltipText.append("tspan").attr("x", 8).attr("y", 17).text(`${model.modelName}`);

          tooltipText
            .append("tspan")
            .attr("x", 8)
            .attr("y", 35)
            .text(`PI: ${d.covLevel}%, Coverage: ${d.coverageValue.toFixed(1)}%`);

          // Size the background rect based on text
          const bbox = tooltipText.node()!.getBBox();
          tooltipRect.attr("width", bbox.width + 16).attr("height", bbox.height + 16);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
        });
    });

    // Add a diagonal dashed line representing ideal coverage
    g.append("line")
      .attr("x1", xScale(10))
      .attr("y1", yScale(10))
      .attr("x2", xScale(98))
      .attr("y2", yScale(98))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .style("opacity", 0.7);
  };

  return (
    <div ref={containerRef} className='w-full h-full'>
      <svg
        ref={chartRef}
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
    </div>
  );
};

export default SeasonOverviewPIChart;
