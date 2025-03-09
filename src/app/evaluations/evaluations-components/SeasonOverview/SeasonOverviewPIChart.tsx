// File: /src/app/evaluations/evaluations-components/SeasonOverview/PIChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useResponsiveSVG } from '../../../interfaces/responsiveSVG';
import { modelColorMap, modelNames } from '../../../interfaces/epistorm-constants';

const SeasonOverviewPIChart: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!isResizing && dimensions.width > 0 && dimensions.height > 0 && chartRef.current) {
      renderChart();
    }
  }, [dimensions, isResizing]);

  const renderChart = () => {
    if (!chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    // Chart dimensions
    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Generate fake data set that 
    const models = modelNames.slice(0, 4);
    const timePoints = Array.from({ length: 12 }, (_, i) => i);
    
    // Create an area for each model
    const areaData = models.map(model => {
      // Generate random coverage data between 70% and 100%
      return {
        model,
        values: timePoints.map(t => ({
          time: t,
          coverage: 70 + Math.random() * 30
        }))
      };
    });

    // X scale - time
    const xScale = d3.scaleLinear()
      .domain([0, timePoints.length - 1])
      .range([0, innerWidth]);

    // Y scale - coverage
    const yScale = d3.scaleLinear()
      .domain([60, 100])  // 60-100% coverage
      .range([innerHeight, 0]);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', 'white')
      .style('font-size', '10px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', 'white')
      .style('font-size', '10px');

    // Area generator
    const area = d3.area<{time: number, coverage: number}>()
      .x(d => xScale(d.time))
      .y0(innerHeight)
      .y1(d => yScale(d.coverage))
      .curve(d3.curveMonotoneX);

    // Line generator for model lines
    const line = d3.line<{time: number, coverage: number}>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.coverage))
      .curve(d3.curveMonotoneX);

    // Draw areas with opacity
    areaData.forEach((d, i) => {
      // Draw area with gradient opacity
      g.append('path')
        .datum(d.values)
        .attr('fill', modelColorMap[d.model])
        .attr('fill-opacity', 0.3)
        .attr('d', area);
      
      // Draw line
      g.append('path')
        .datum(d.values)
        .attr('fill', 'none')
        .attr('stroke', modelColorMap[d.model])
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Add points
      g.selectAll(`.point-${i}`)
        .data(d.values)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.time))
        .attr('cy', d => yScale(d.coverage))
        .attr('r', 4)
        .attr('fill', modelColorMap[d.model]);
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={chartRef}
        width="100%"
        height="100%"
        style={{
          fontFamily: 'var(--font-dm-sans)',
          visibility: isResizing ? 'hidden' : 'visible'
        }}
        viewBox={`0 0 ${dimensions.width || 100} ${dimensions.height || 100}`}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default SeasonOverviewPIChart;