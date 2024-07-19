import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import {useAppSelector} from "../../store/hooks";
import {format, subDays, parseISO} from 'date-fns';

interface RiskLevelGaugeProps {
    riskLevel: string;
}

const RiskLevelGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});
    const nowcastTrendsCollection = useAppSelector((state) => state.nowcastTrends.allData);
    const selectedModel = useAppSelector((state) => state.filter.forecastModel[0]); /* TODO: There will be a dedicated variable to keep track of the model selected, only for the Risk-Level widgets */
    const selectedUSStateNum = useAppSelector((state) => state.filter.USStateNum);

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
        const height = dimensions.height - 20;

        const radius = Math.min(width, height) * 0.8;

        const modelData = nowcastTrendsCollection.find(model => model.modelName === selectedModel);

        if (!modelData || !modelData.data.length) return;

        /* Filter modelData to retrieve the entry that is in correct state */
        const latestTrend = modelData.data
            .filter(entry => entry.location === selectedUSStateNum)[0];

        // Record the week info from latestTrend to be used in text display in the center of the half donut gauge, down to the exact day unit
        const currentWeekDate: string = latestTrend.nowcast_date; // date format is yyyy-mm-dd
        // TODO: calculate the last week date based on currentWeekDate and parse it back to string
        const currentDate = parseISO(currentWeekDate);
        const lastWeekDate = format(subDays(currentDate, 7), 'yyyy-MM-dd');

        // Format dates for display
        const formattedCurrentWeekDate = format(currentDate, 'MMM d, yyyy');
        const formattedLastWeekDate = format(parseISO(lastWeekDate), 'MMM d, yyyy');


        const pie = d3.pie<number>()
            .sort(null)
            .value(d => d)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        const arc = d3.arc<d3.PieArcDatum<number>>()
            .innerRadius(radius * 0.8)
            .outerRadius(radius);

        const data = [
            Math.max(0.002, latestTrend.decrease),
            Math.max(0.002, latestTrend.stable),
            Math.max(0.002, latestTrend.increase)
        ];

        const color = d3.scaleOrdinal<string>()
            .domain(['decrease', 'stable', 'increase'])
            .range(['#478791', '#b9d6d6', '#eae78b']);

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height})`);

        g.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (_, i) => color(i.toString()));

        // Add text
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.5}`)
            .attr('font-size', `18px`)
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text("Trend Forecast");

        /* Display the last week - this week info here */
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.4}`)
            .attr('font-size', `14px`)
            .attr('fill', 'white')
            .text(`${formattedLastWeekDate} - ${formattedCurrentWeekDate}`);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.3}`)
            .attr('font-size', `14px`)
            .attr('fill', 'white')
            .text(`Decrease: ${(latestTrend.decrease * 100).toFixed(1)}%`);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.2}`)
            .attr('font-size', `14px`)
            .attr('fill', 'white')
            .text(`Increase: ${(latestTrend.increase * 100).toFixed(1)}%`);

    }, [dimensions, riskLevel, nowcastTrendsCollection, selectedModel, selectedUSStateNum]);

    return (
        <div className="w-full h-full flex items-center justify-center rounded-lg">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
        </div>
    );
};

export default RiskLevelGauge;