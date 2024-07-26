import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface ChartRangeSelectorProps {
    width: number;
    height: number;
    dateRange: [Date, Date];
    data: any[]; // Replace with your actual data type
    onRangeChange: (start: Date, end: Date) => void;
}

const ChartRangeSelector: React.FC<ChartRangeSelectorProps> = ({
                                                                   width,
                                                                   height,
                                                                   dateRange,
                                                                   data,
                                                                   onRangeChange,
                                                               }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [brushExtent, setBrushExtent] = useState<[number, number]>([0, width]);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 0, right: 10, bottom: 0, left: 10 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleTime()
            .domain(dateRange)
            .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.admissions) || 0])
            .range([chartHeight, 0]);

        const area = d3.area<any>()
            .x(d => xScale(new Date(d.date)))
            .y0(chartHeight)
            .y1(d => yScale(d.admissions));

        const chart = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        chart.append('path')
            .datum(data)
            .attr('fill', '#69b3a2')
            .attr('d', area);

        const brush = d3.brushX()
            .extent([[0, 0], [chartWidth, chartHeight]])
            .on('brush end', brushed);

        chart.append('g')
            .attr('class', 'brush')
            .call(brush)
            .call(brush.move, brushExtent);

        function brushed(event: d3.D3BrushEvent<any>) {
            if (event.selection) {
                const [x0, x1] = event.selection;
                const newDateRange: [Date, Date] = [xScale.invert(x0), xScale.invert(x1)];
                onRangeChange(newDateRange[0], newDateRange[1]);
                setBrushExtent([x0, x1]);
            }
        }
    }, [width, height, dateRange, data, onRangeChange]);

    return (
        <svg ref={svgRef} width={width} height={height}></svg>
    );
};

export default ChartRangeSelector;