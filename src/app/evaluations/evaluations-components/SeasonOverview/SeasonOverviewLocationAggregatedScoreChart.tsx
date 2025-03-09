// File: /src/app/evaluations/evaluations-components/SeasonOverview/QuantileStatisticsChartExtended.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useAppSelector } from '../../../store/hooks';
import { modelColorMap, modelNames } from '../../../interfaces/epistorm-constants';
import { useResponsiveSVG } from '../../../interfaces/responsiveSVG';

interface SeasonOverviewLocationAggregatedScoreChartAltProps {
  type: 'wis' | 'mape';
}

const SeasonOverviewLocationAggregatedScoreChart: React.FC<SeasonOverviewLocationAggregatedScoreChartAltProps> = ({ type }) => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG();
  const chartRef = useRef<SVGSVGElement>(null);

  // Get models from Redux store
  const models = useAppSelector((state) => state.evaluationsSeasonOverviewSettings.evaluationsSeasonOverviewViewModel);

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
    const margin = { top: 10, right: 10, bottom: 30, left: 10 }; // Increased left margin for longer model names
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Use all models (or cap at 9 if there are more)
    const displayedModels = modelNames;
    
    // Generate some dummy data for the sample visualization
	/* NOTE: In actual implementation, each model's horizontal quantile band is from correct season's respective scoring data across all U.S. 	States, for a certain model
		showing the distribution of scores (relative to each other in the score pool) across location in the given season. */
    const data = displayedModels.map(model => ({
      model,
      q05: Math.random() * 10,
      q25: Math.random() * 20 + 10,
      median: Math.random() * 30 + 30,
      q75: Math.random() * 20 + 60,
      q95: Math.random() * 10 + 80
    }));

    // Y scale - models
    const yScale = d3.scaleBand()
      .domain(data.map(d => d.model))
      .range([0, innerHeight])
      .padding(0.2); // Reduced padding to allow more space for each band

    // X scale - values
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, innerWidth]);

    // Y axis with truncated model names for readability
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))  // Remove step ticks on y-axis
      .call(g => g.selectAll('.tick text').remove()) // Remove text labels
      .call(g => g.select('.domain').attr('stroke', 'white')); // Keep axis line, make it white

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5)) // Fewer ticks for clarity
      .selectAll('text')
      .attr('fill', 'white')
      .style('font-size', '9px');

    // Render boxplots
    data.forEach(d => {
      const y = yScale(d.model) || 0;
      const boxHeight = yScale.bandwidth();

      // Draw whiskers
      g.append('line')
        .attr('x1', xScale(d.q05))
        .attr('x2', xScale(d.q95))
        .attr('y1', y + boxHeight / 2)
        .attr('y2', y + boxHeight / 2)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      // Draw whisker end caps
      g.append('line')
        .attr('x1', xScale(d.q05))
        .attr('x2', xScale(d.q05))
        .attr('y1', y + boxHeight / 2 - 4)
        .attr('y2', y + boxHeight / 2 + 4)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      g.append('line')
        .attr('x1', xScale(d.q95))
        .attr('x2', xScale(d.q95))
        .attr('y1', y + boxHeight / 2 - 4)
        .attr('y2', y + boxHeight / 2 + 4)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      // Draw IQR box
      g.append('rect')
        .attr('x', xScale(d.q25))
        .attr('width', xScale(d.q75) - xScale(d.q25))
        .attr('y', y)
        .attr('height', boxHeight)
        .attr('fill', modelColorMap[d.model])
        .attr('opacity', 0.995);

      // Draw median line
      g.append('line')
        .attr('x1', xScale(d.median))
        .attr('x2', xScale(d.median))
        .attr('y1', y)
        .attr('y2', y + boxHeight)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
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

export default SeasonOverviewLocationAggregatedScoreChart;