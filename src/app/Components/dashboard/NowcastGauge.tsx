import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import {useAppSelector} from "../../store/hooks";

interface RiskLevelGaugeProps {
    riskLevel: string;
}

const LegendBoxes: React.FC = () => {
    const legendData = [
        {label: 'Decrease', color: '#478791'},
        {label: 'Stable', color: '#b9d6d6'},
        {label: 'Increase', color: '#eae78b'}
    ];

    return (
        <div className="flex flex-row justify-evenly items-end h-full w-full">
            {legendData.map((item) => (
                <div key={item.label} className="flex items-center">
                    <div
                        className="w-[1em] h-[1em]"
                        style={{backgroundColor: item.color}}
                    ></div>
                    <span className="text-xs mx-1">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const NowcastGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});
    const nowcastTrendsCollection = useAppSelector((state) => state.nowcastTrends.allData);
    const {USStateNum, userSelectedRiskLevelModel, userSelectedWeek} = useAppSelector((state) => state.filter);

    const [zoomLevel, setZoomLevel] = useState(1);

    useEffect(() => {
        const detectZoomLevel = () => {
            const scale = window.devicePixelRatio || 1;
            setZoomLevel(scale);
        };

        detectZoomLevel();
        window.addEventListener('resize', detectZoomLevel);
        return () => window.removeEventListener('resize', detectZoomLevel);
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const {width, height} = containerRef.current.getBoundingClientRect();
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

        // Define margins
        const margin = {top: 30, right: 20, bottom: 30, left: 20};
        const chartWidth = (width - margin.left - margin.right) - 10 * zoomLevel;
        const chartHeight = (height - margin.top - margin.bottom) - 10 * zoomLevel;

        // Calculate radius considering margins
        const radius = Math.min(chartWidth, chartHeight);

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
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 1.2);

        const color = d3.scaleOrdinal<string>()
            .domain(['decrease', 'stable', 'increase'])
            .range(['#478791', '#b9d6d6', '#eae78b']);

        const data = [
            Math.max(0.001, trendToUse.decrease),
            Math.max(0.001, trendToUse.stable),
            Math.max(0.001, trendToUse.increase)
        ];

        // Create a group for the entire chart and position it
        const chartGroup = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height - margin.bottom})`);

        const paths = chartGroup.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (_, i) => color(i.toString()))
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2);

        const calculateFontSize = (baseSize: number) => {
            const baseFontSize = 16;  // Adjust this value to change the overall text size
            const zoomFactor = 1 / Math.max(1, zoomLevel);  // Inverse relationship with zoom
            return Math.max(13, Math.min(baseSize * zoomFactor, baseFontSize));
        };

        // Add text
        chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.6}`)
            .attr('font-size', `${calculateFontSize(24)}px`)
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text("Trend forecast");

        chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.3}`)
            .attr('font-size', `${calculateFontSize(16)}px`)
            .attr('fill', 'white')
            .text(`${formattedLastWeekDate} - ${formattedCurrentWeekDate}`);

        // Create tooltip
        const hovertooltip = chartGroup.append('g')
            .attr('class', 'corner-tooltip')
            .style('opacity', 0);

        const tooltipBackground = hovertooltip.append('rect')
            .attr('fill', 'white')
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 1)
            .attr('rx', 4)
            .attr('ry', 4);

        const tooltipText = hovertooltip.append('text')
            .attr('fill', 'black')
            .attr('font-size', `${calculateFontSize(12)}px`);

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

            const textBBox = tooltipText.node()!.getBBox();
            const padding = 8;
            tooltipBackground
                .attr('width', textBBox.width + padding * 2)
                .attr('height', textBBox.height + padding * 2);

            tooltipText.attr('transform', `translate(${padding}, ${textBBox.height + padding - 2})`);

            const tooltipWidth = textBBox.width + padding * 2;
            const tooltipHeight = textBBox.height + padding * 2;

            let tooltipX = x - tooltipWidth / 2;
            let tooltipY = y - tooltipHeight - 10;

            // Adjust position if it goes out of bounds
            if (tooltipX + tooltipWidth > width / 2) {
                tooltipX = width / 2 - tooltipWidth - 10;
            }
            if (tooltipX < -width / 2) {
                tooltipX = -width / 2 + 10;
            }
            if (tooltipY < -height + margin.top) {
                tooltipY = -height + margin.top + 10;
            }

            hovertooltip
                .attr('transform', `translate(${tooltipX}, ${tooltipY})`)
                .style('opacity', 1);
        })
            .on('mouseout', function () {
                hovertooltip.style('opacity', 0);
            });

    }, [dimensions, riskLevel, nowcastTrendsCollection, userSelectedRiskLevelModel, USStateNum, userSelectedWeek, zoomLevel]);

    return (
        <div ref={containerRef}
             className="layout-grid-nowcast-gauge flex flex-col justify-stretch items-stretch text-white p-2 mb-4 h-full w-full overflow-scroll">
            <div className="gauge-chart flex-grow overflow-scroll util-no-sb-length">
                <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
            </div>
            <div className="gauge-legend">
                <LegendBoxes/>
            </div>
        </div>
    );
};

export default NowcastGauge;