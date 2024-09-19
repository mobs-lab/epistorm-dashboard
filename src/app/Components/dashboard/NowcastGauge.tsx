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
                        className="w-[1rem] h-[1rem]"
                        style={{backgroundColor: item.color}}
                    ></div>
                    <span className="text-sm mx-2">{item.label}</span>
                </div>
            ))}
        </div>
    );
};
const NowcastGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const gaugeRef = useRef<HTMLDivElement>(null);
    const [gaugeDimensions, setGaugeDimensions] = useState({width: 0, height: 0});
    const [zoomLevel, setZoomLevel] = useState(1);
    const nowcastTrendsCollection = useAppSelector((state) => state.nowcastTrends.allData);
    const {USStateNum, userSelectedRiskLevelModel, userSelectedWeek} = useAppSelector((state) => state.filter);

    useEffect(() => {
        if (!gaugeRef.current) return;

        const updateDimensions = () => {
            if (gaugeRef.current) {
                const {width, height} = gaugeRef.current.getBoundingClientRect();
                setGaugeDimensions({width, height});
            }
        };

        const detectZoom = () => {
            const zoom = window.devicePixelRatio;
            setZoomLevel(zoom);
        };

        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
            detectZoom();
        });

        resizeObserver.observe(gaugeRef.current);
        window.addEventListener('resize', detectZoom);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', detectZoom);
        };
    }, []);

    useEffect(() => {
        if (!svgRef.current || !nowcastTrendsCollection.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const {width, height} = gaugeDimensions;
        const baseMargin = {top: 60, right: 30, bottom: 0, left: 30};
        const margin = {
            top: baseMargin.top / zoomLevel,
            right: baseMargin.right / zoomLevel,
            bottom: baseMargin.bottom / zoomLevel,
            left: baseMargin.left / zoomLevel
        };

        const gaugeWidth = width - margin.left - margin.right;
        const gaugeHeight = height - margin.top - margin.bottom;
        console.log("gaugeWidth", gaugeWidth, "gaugeHeight", gaugeHeight);

        // Calculate radius based on the diagonal of the available space
        const diagonal = Math.sqrt(gaugeWidth * gaugeWidth + gaugeHeight * gaugeHeight);
        const radius = (diagonal / 2) * 0.75; // Using 80% of half the diagonal
        console.log("radius", radius);

        // Set viewBox for better scaling
        svg.attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMaxYMid meet');

        // Create a group for the entire chart and position it
        const chartGroup = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height})`);

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
            .innerRadius(radius * 0.68)
            .outerRadius(radius * 0.89);

        const color = d3.scaleOrdinal<string>()
            .domain(['decrease', 'stable', 'increase'])
            .range(['#478791', '#b9d6d6', '#eae78b']);

        const data = [
            Math.max(0.001, trendToUse.decrease),
            Math.max(0.001, trendToUse.stable),
            Math.max(0.001, trendToUse.increase)
        ];

        const paths = chartGroup.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (_, i) => color(i.toString()))
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2);

        /*const calculateFontSize = (baseSize: number) => {
            const baseFontSize = 16;  // Adjust this value to change the overall text size
            const zoomFactor = 1 / Math.max(1, zoomLevel);  // Inverse relationship with zoom
            return Math.max(13, Math.min(baseSize * zoomFactor, baseFontSize));
        };*/

        const fontSize = Math.max(23, Math.min(16, radius * 0.1));

        // Add text
        chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.3}`)
            .attr('font-size', `${fontSize}px`)
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text("Trend forecast");

        chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `-${radius * 0.1}`)
            .attr('font-size', `${fontSize * 0.8}px`)
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
            .attr('font-size', `${fontSize * 0.5}px`);

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
            if (tooltipX + tooltipWidth > gaugeWidth / 2) {
                tooltipX = gaugeWidth / 2 - tooltipWidth - 10;
            }
            if (tooltipX < -gaugeWidth / 2) {
                tooltipX = -gaugeWidth / 2 + 10;
            }
            if (tooltipY < -gaugeHeight + margin.top) {
                tooltipY = -gaugeHeight + margin.top + 10;
            }

            hovertooltip
                .attr('transform', `translate(${tooltipX}, ${tooltipY})`)
                .style('opacity', 1);
        })
            .on('mouseout', function () {
                hovertooltip.style('opacity', 0);
            });

    }, [gaugeDimensions, riskLevel, nowcastTrendsCollection, userSelectedRiskLevelModel, USStateNum, userSelectedWeek, zoomLevel]);

    return (
        <div ref={containerRef}
             className="layout-grid-nowcast-gauge py-2">
            <div ref={gaugeRef} className="gauge-chart">
                <svg ref={svgRef} width="100%" height="100%"/>
            </div>
            <div className="gauge-legend">
                <LegendBoxes/>
            </div>
        </div>
    )

};

export default NowcastGauge;