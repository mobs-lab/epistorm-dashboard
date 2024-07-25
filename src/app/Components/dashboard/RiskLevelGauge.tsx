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
        const height = dimensions.height - 20;

        const radius = Math.min(width, height) * 0.8;

        // Find matching model's nowcast trend data
        const matchingModelNowcast = nowcastTrendsCollection.find(model => model.modelName === userSelectedRiskLevelModel);
        // If no data, return
        if (!matchingModelNowcast || !matchingModelNowcast.data.length) return;

        // Filter modelData by selected state
        const modelData = matchingModelNowcast.data;
        const matchingStateData = modelData
            .filter(entry => entry.location === USStateNum);
        // Convert userSelectedWeek to the start of the day to ensure consistent comparison
        const userSelectedWeekStart = new Date(userSelectedWeek);
        userSelectedWeekStart.setHours(0, 0, 0, 0);

        // Find the matching trend data
        const latestTrend = matchingStateData.find(entry => {
            const entryDate = new Date(entry.reference_date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === userSelectedWeekStart.getTime();
        });

        // If no exact match is found, use the latest available trend
        let trendToUse;
        if (!latestTrend) {
            console.warn("No exact match found for userSelectedWeek. Using latest available trend.");
            trendToUse = matchingStateData.reduce((acc, curr) => {
                return acc.reference_date > curr.reference_date ? acc : curr;
            });
            console.log("No matching trend using selected Week. Falling back to latest from data.", trendToUse);
        } else {
            trendToUse = latestTrend;
        }

        // Ensure we have a trend to use before proceeding
        if (!trendToUse) {
            console.error("No trend data available for the selected state and date range");
            return;
        }

        // Format dates
        const formattedCurrentWeekDate = trendToUse.reference_date.toDateString();

        // Calculate last week's date
        const lastWeekDate = new Date(trendToUse.reference_date);
        lastWeekDate.setDate(lastWeekDate.getDate() - 6);
        const formattedLastWeekDate = lastWeekDate.toDateString();

        const pie = d3.pie<number>()
            .sort(null)
            .value(d => d)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        const arc = d3.arc<d3.PieArcDatum<number>>()
            .innerRadius(radius * 0.8)
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

        /!* Display the last week - this week info here *!/
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.4}`)
            .attr('font-size', `14px`)
            .attr('fill', 'white')
            .text(`${formattedLastWeekDate} - ${formattedCurrentWeekDate}`);

        /*

        /*g.append('text')
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
            .text(`Increase: ${(latestTrend.increase * 100).toFixed(1)}%`);*/

    }, [dimensions, riskLevel, nowcastTrendsCollection, userSelectedRiskLevelModel, USStateNum, userSelectedWeek]);

    return (
        <div className="w-full h-full flex items-center justify-center rounded-lg">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
        </div>
    );
};

export default RiskLevelGauge;