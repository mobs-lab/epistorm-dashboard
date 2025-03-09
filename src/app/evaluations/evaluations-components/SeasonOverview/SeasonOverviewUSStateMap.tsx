// File: /src/app/evaluations/evaluations-components/SeasonOverview/USStateOverviewMap.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { useResponsiveSVG } from "../../../interfaces/responsiveSVG";

const SeasonOverviewUSStateOverviewMap: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const svgRef = useRef<SVGSVGElement>(null);
  const [mapData, setMapData] = useState<any>(null);

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

  // Render map when dimensions or data change
  useEffect(() => {
    if (
      !isResizing &&
      dimensions.width > 0 &&
      dimensions.height > 0 &&
      mapData &&
      svgRef.current
    ) {
      renderMap();
    }
  }, [dimensions, isResizing, mapData]);

  const renderMap = () => {
    if (!svgRef.current || !mapData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Create a color scale for the states
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);

    // Setup projection
    const projection = d3
      .geoAlbersUsa()
      .fitSize(
        [
          width - margin.left - margin.right,
          height - margin.top - margin.bottom,
        ],
        topojson.feature(mapData, mapData.objects.states)
      );

    const path = d3.geoPath().projection(projection);

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Generate random values for states to simulate data
    const stateValues = new Map();
    const features = topojson.feature(mapData, mapData.objects.states).features;

    features.forEach((feature) => {
      stateValues.set(feature.id, Math.random());
    });

    // Draw states
    g.selectAll("path")
      .data(features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => colorScale(stateValues.get(d.id)))
      .attr("stroke", "white")
      .attr("stroke-width", 0.5);

    // Add color legend
    const legendWidth = 20;
    const legendHeight = height - margin.top - margin.bottom - 40;

    const legendScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(0).tickSize(0);

    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - margin.right - legendWidth - 10}, ${margin.top})`
      );

    // Create the gradient
    const defs = svg.append("defs");

    const gradient = defs
      .append("linearGradient")
      .attr("id", "color-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    const stops = [
      { offset: "0%", color: colorScale(1) },
      { offset: "50%", color: colorScale(0.5) },
      { offset: "100%", color: colorScale(0) },
    ];

    gradient
      .selectAll("stop")
      .data(stops)
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    // Draw the legend rectangle
    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#color-gradient)");

    // Add legend axis
    legend
      .append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis)
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "10px");
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
    </div>
  );
};

export default SeasonOverviewUSStateOverviewMap;
