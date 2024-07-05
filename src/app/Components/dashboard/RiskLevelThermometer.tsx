import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NowcastTrend } from "../../Interfaces/forecast-interfaces";

interface RiskLevelThermometerProps {
    nowcastTrend: NowcastTrend | null;
}

const RiskLevelThermometer: React.FC<RiskLevelThermometerProps> = ({ nowcastTrend }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 80;
        const height = 200;

        // Create gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'thermometer-gradient')
            .attr('gradientTransform', 'rotate(180)');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#32bbe0');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#e25e6d');

        // Draw thermometer rectangle
        svg.append('rect')
            .attr('x', 10)
            .attr('y', 0)
            .attr('width', width - 20)
            .attr('height', height)
            .attr('fill', 'url(#thermometer-gradient)');

        // Draw dotted line (bottom)
        svg.append('line')
            .attr('x1', 0)
            .attr('y1', height * 0.7)
            .attr('x2', width)
            .attr('y2', height * 0.7)
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4');

        // Draw solid line (top)
        svg.append('line')
            .attr('x1', 0)
            .attr('y1', height * 0.3)
            .attr('x2', width)
            .attr('y2', height * 0.3)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        // Draw arrow
        svg.append('line')
            .attr('x1', width / 2)
            .attr('y1', height * 0.7)
            .attr('x2', width / 2)
            .attr('y2', height * 0.3)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrow)');

        // Define arrow marker
        svg.append('defs').append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', 'white');

        // Add labels
        svg.append('text')
            .attr('x', width + 5)
            .attr('y', height * 0.3)
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('alignment-baseline', 'middle')
            .text('High');

        svg.append('text')
            .attr('x', width + 5)
            .attr('y', height * 0.7)
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('alignment-baseline', 'middle')
            .text('Low');

    }, [nowcastTrend]);

    return (
        <div className="w-1/5 h-full flex items-center justify-center">
            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 80 200" preserveAspectRatio="xMidYMid meet"/>
        </div>
    );
};

export default RiskLevelThermometer;