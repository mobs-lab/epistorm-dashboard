import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';

interface RiskLevelGaugeProps {
    riskLevel: string;
    subText: string;
    dateRange: string;
}

const RiskLevelGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel, subText, dateRange}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});

    useEffect(() => {
        const updateDimensions = () => {
            if (svgRef.current) {
                const {width, height} = svgRef.current.getBoundingClientRect();
                setDimensions({width, height});
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = dimensions.width;
        const height = dimensions.height;
        const margin = Math.min(width, height) * 0.1;
        const thickness = Math.min(width, height) * 0.15;

        const radius = Math.min(width, height) / 2 - margin;

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
            .attr('dy', `-${radius * 0.5}`)
            .attr('font-size', `${radius * 0.2}px`)
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text(riskLevel);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.2}`)
            .attr('font-size', `${radius * 0.12}px`)
            .attr('fill', 'white')
            .text(subText);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `${radius * 0.1}`)
            .attr('font-size', `${radius * 0.1}px`)
            .attr('fill', 'white')
            .text(dateRange);

    }, [dimensions, riskLevel, subText, dateRange]);

    return (
        <div className="w-full h-full flex items-center justify-center rounded-lg">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
        </div>
    );
};

export default RiskLevelGauge;