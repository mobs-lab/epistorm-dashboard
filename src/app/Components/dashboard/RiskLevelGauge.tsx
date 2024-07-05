import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';

interface RiskLevelGaugeProps {
    riskLevel: string;
    subText: string;
    dateRange: string;
}

const RiskLevelGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel, subText, dateRange}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 400;
        const height = 280;
        const margin = 20;
        const thickness = 40;

        const radius = Math.min(width, height) / 2;

        const color = d3.scaleOrdinal<string>()
            .range(['#00a6e1', '#54d8d3', '#c9e799', '#6262e5']);

        const arc = d3.arc<d3.PieArcDatum<number>>()
            .innerRadius(radius - thickness)
            .outerRadius(radius)
            .startAngle(d => d.startAngle)
            .endAngle(d => d.endAngle);

        const pie = d3.pie<number>()
            .sort(null)
            .value(d => d)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height - margin})`);

        const data = [1, 1, 1, 1]; // Equal segments for the four colors

        const path = g.selectAll('path')
            .data(pie(data))
            .enter().append('path')
            .attr('fill', (_, i) => color(i.toString()))
            .attr('d', arc);

        // Add text
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-3.5em')
            .attr('font-size', '2.5em')
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text(riskLevel);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-1.5em')
            .attr('font-size', '1.5em')
            .attr('fill', 'white')
            .text(subText);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.5em')
            .attr('font-size', '1.2em')
            .attr('fill', 'white')
            .text(dateRange);

    }, [riskLevel, subText, dateRange]);

    return (
        <div className="w-full h-full flex items-center justify-center rounded-lg">
            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet"/>
        </div>
    );
};

export default RiskLevelGauge;