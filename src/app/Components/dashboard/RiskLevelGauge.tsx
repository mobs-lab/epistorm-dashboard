import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import {useAppSelector} from "../../store/hooks";

interface RiskLevelGaugeProps {
    riskLevel: string;
}

const RiskLevelGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});
    const nowcastTrendsCollection = useAppSelector((state) => state.nowcastTrends.allData);
    const {USStateNum, userSelectedRiskLevelModel, userSelectedWeek} = useAppSelector((state) => state.filter);

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
        if (!svgRef.current || !nowcastTrendsCollection.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = dimensions.width;
        const height = dimensions.height;

        const radius = Math.min(width, height * 0.7);

        const matchingModelNowcast = nowcastTrendsCollection.find(model => model.modelName === userSelectedRiskLevelModel);
        if (!matchingModelNowcast || !matchingModelNowcast.data.length) return;

        const modelData = matchingModelNowcast.data;
        const matchingStateData = modelData.filter(entry => entry.location === USStateNum);

        const userSelectedWeekStart = new Date(userSelectedWeek);
        userSelectedWeekStart.setHours(0, 0, 0, 0);

        const latestTrend = matchingStateData.find(entry => {
            const entryDate = new Date(entry.reference_date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === userSelectedWeekStart.getTime();
        });

        let trendToUse = latestTrend || matchingStateData.reduce((acc, curr) => acc.reference_date > curr.reference_date ? acc : curr);

        if (!trendToUse) {
            console.error("No trend data available for the selected state and date range");
            return;
        }

        const formattedCurrentWeekDate = new Date(trendToUse.reference_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const lastWeekDate = new Date(trendToUse.reference_date);
        lastWeekDate.setDate(lastWeekDate.getDate() - 6);
        const formattedLastWeekDate = lastWeekDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const pie = d3.pie<number>()
            .sort(null)
            .value(d => d)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        const arc = d3.arc<d3.PieArcDatum<number>>()
            .innerRadius(radius * 0.74)
            .outerRadius(radius);

        const color = d3.scaleOrdinal<string>()
            .domain(['decrease', 'stable', 'increase'])
            .range(['#478791', '#b9d6d6', '#eae78b']);

        const data = [
            Math.max(0.02, trendToUse.decrease),
            Math.max(0.02, trendToUse.stable),
            Math.max(0.02, trendToUse.increase)
        ];

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height * 0.8})`);

        const paths = g.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (_, i) => color(i.toString()))
            .attr('stroke', '#333')
            .attr('stroke-width', 2);

        // Add text
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.3}`)
            .attr('font-size', `24px`)
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text("Trend forecast");

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.12}`)
            .attr('font-size', `16px`)
            .attr('fill', 'white')
            .text(`${formattedLastWeekDate} - ${formattedCurrentWeekDate}`);

        // Legend
        const legendWidth = radius * 2;
        const legendX = width / 2 - radius;
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX},${height * 0.9})`);

        const legendData = [
            {label: 'Decrease', color: '#478791', position: 'left'},
            {label: 'Stable', color: '#b9d6d6', position: 'center'},
            {label: 'Increase', color: '#eae78b', position: 'right'}
        ];

        legendData.forEach((item, index) => {
            let legendX;
            const legend = svg.append('g')
                .attr('class', `legend-${item.position}`)
                .attr('class', 'text-sm');

            legend.append('rect')
                .attr('width', 20)
                .attr('height', 20)
                .attr('fill', item.color)
                .attr('stroke', '#333')
                .attr('stroke-width', 1);

            const text = legend.append('text')
                .attr('x', 25)
                .attr('y', 16)
                .attr('fill', 'white')
                .text(item.label);

            const legendWidth = legend.node().getBBox().width;

            if (item.position === 'left') {
                legendX = width / 2 - radius;
            } else if (item.position === 'center') {
                legendX = width / 2 - legendWidth / 2;
            } else {
                legendX = width / 2 + radius - legendWidth;
            }

            legend.attr('transform', `translate(${legendX},${height * 0.9})`);
        });


        // Create tooltip
        const hovertooltip = svg.append('g')
            .attr('class', 'corner-tooltip')
            .style('opacity', 0);

        const tooltipBackground = hovertooltip.append('rect')
            .attr('fill', 'rgba(0, 0, 0, 0.7)')
            .attr('rx', 5)
            .attr('ry', 5);

        const tooltipText = hovertooltip.append('text')
            .attr('fill', 'white')
            .attr('font-size', '14px');

        paths.on('mouseover', function (event: MouseEvent, d) {
            const [x, y] = d3.pointer(event);
            let label, value;
            if (d.index === 0) {
                label = 'Decrease';
                value = trendToUse.decrease;
            } else if (d.index === 1) {
                label = 'Stable';
                value = trendToUse.stable;
            } else {
                label = 'Increase';
                value = trendToUse.increase;
            }

            const tooltipContent = `${label}: ${value.toFixed(3)}`;
            tooltipText.text(tooltipContent);

            const textBBox = tooltipText.node().getBBox();
            const padding = 10;
            tooltipBackground
                .attr('width', textBBox.width + padding * 2)
                .attr('height', textBBox.height + padding * 2);

            tooltipText.attr('transform', `translate(${padding}, ${textBBox.height + padding})`);

            const tooltipWidth = textBBox.width + padding * 2;
            const tooltipHeight = textBBox.height + padding * 2;

            let tooltipX = x + width / 2 - tooltipWidth / 2;
            let tooltipY = y + height * 0.5 - tooltipHeight - 5;

            // Adjust position if it goes out of bounds
            if (tooltipX + tooltipWidth > width) {
                tooltipX = width - tooltipWidth - 10;
            }
            if (tooltipY < 0) {
                tooltipY = 10;
            }

            hovertooltip
                .attr('transform', `translate(${tooltipX}, ${tooltipY})`)
                .style('opacity', 1);
        })
            .on('mouseout', function () {
                hovertooltip.style('opacity', 0);
            });

    }, [dimensions, riskLevel, nowcastTrendsCollection, userSelectedRiskLevelModel, USStateNum, userSelectedWeek]);

    return (
        <div className="w-full h-full flex items-center justify-center rounded-lg">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
        </div>
    );
};

export default RiskLevelGauge;