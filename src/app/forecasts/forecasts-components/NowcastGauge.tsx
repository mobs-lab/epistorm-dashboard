import React, { useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useAppSelector } from "@/store/hooks";

import InfoButton from "@/shared-components/InfoButton";
import { trendForecastInfo } from "types/infobutton-content";
import { selectNowcastTrendsForModelAndDate } from "@/store/selectors";
import { useResponsiveSVG } from "@/utils/responsiveSVG";
import "@/styles/component_styles/nowcast-gauge.css";

interface RiskLevelGaugeProps {
  riskLevel: string;
}

const LegendBoxes: React.FC = () => {
  const legendData = [
    { label: "Decrease", color: "#478791" },
    { label: "Stable", color: "#b9d6d6" },
    { label: "Increase", color: "#eae78b" },
  ];

  return (
    <div className='flex flex-row justify-evenly items-end h-full w-full'>
      {legendData.map((item) => (
        <div key={item.label} className='flex items-center'>
          <div className='w-[1rem] h-[1rem]' style={{ backgroundColor: item.color }}></div>
          <span className='text-sm mx-2'>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Prop interface for positioning info button
interface InfoButtonPosition {
  left: number;
  top: number;
  visible: boolean;
}

const NowcastGauge: React.FC<RiskLevelGaugeProps> = ({ riskLevel }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    containerRef,
    dimensions: containerDimensions,
    isResizing,
  } = useResponsiveSVG({
    debounceMs: 300,
    throttleMs: 150,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [infoButtonPosition, setInfoButtonPosition] = useState<InfoButtonPosition>({
    left: 0,
    top: 0,
    visible: false,
  });

  const { USStateNum, userSelectedRiskLevelModel, userSelectedWeek } = useAppSelector((state) => state.forecastSettings);
  const nowcastTrends = useAppSelector((state) =>
    selectNowcastTrendsForModelAndDate(state, userSelectedRiskLevelModel, userSelectedWeek, USStateNum)
  );

  const drawGauge = useCallback(() => {
    if (!svgRef.current || containerDimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = containerDimensions;
    const margin = { top: 20, right: 10, bottom: 5, left: 10 };
    const gaugeWidth = width - margin.left - margin.right;
    const gaugeHeight = height - margin.top - margin.bottom;

    const diagonalLength = Math.sqrt((gaugeWidth / 2) ** 2 + gaugeHeight ** 2) * 0.62;

    const radius = Math.min(Math.min(gaugeWidth / 2, diagonalLength), gaugeHeight * 1.12);

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

    const chartGroup = svg.append("g").attr("transform", `translate(${width / 2}, ${height - margin.bottom})`);

    const trendToUse = nowcastTrends;

    const formattedCurrentWeekDate = userSelectedWeek.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const lastWeekDate = new Date(userSelectedWeek);
    lastWeekDate.setDate(lastWeekDate.getDate() - 6);
    const formattedLastWeekDate = lastWeekDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const pie = d3
      .pie<number>()
      .sort(null)
      .value((d) => d)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    const arc = d3
      .arc<d3.PieArcDatum<number>>()
      .innerRadius(radius * 0.78)
      .outerRadius(radius * 0.96);

    const color = d3
      .scaleOrdinal<string>()
      .domain(["decrease", "stable", "increase", "no data-slices"])
      .range(["#478791", "#b9d6d6", "#eae78b", "rgba(200, 200, 200, 0.1)"]);

    const data = trendToUse
      ? [Math.max(0.001, trendToUse.decrease), Math.max(0.001, trendToUse.stable), Math.max(0.001, trendToUse.increase)]
      : [1]; // Single slice for "no data-slices"

    const paths = chartGroup
      .selectAll("path")
      .data(pie(data))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => (trendToUse ? color(i.toString()) : "rgba(200, 200, 200, 0.1)"))
      .attr("stroke", "lightgray")
      .attr("stroke-width", 2);

    const fontSize = width < height ? 16 : Math.min(24, Math.max(12, radius * 0.1));

    chartGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", `-${radius * 0.35}`)
      .attr("font-size", `${fontSize}px`)
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("class", "trend-forecast-title")
      .text("Trend Forecast");

    // Store position information for the info button
    setTimeout(() => {
      const titleElement = document.querySelector(".trend-forecast-title");

      if (titleElement) {
        const titleRect = titleElement.getBoundingClientRect();
        const svgRect = svgRef.current?.getBoundingClientRect();

        if (svgRect) {
          const textMiddleY = titleRect.top + titleRect.height / 2;

          // Calculate position relative to the SVG container
          setInfoButtonPosition({
            left: titleRect.right - svgRect.left + 5, // 5px to the right of text
            top: textMiddleY - svgRect.top - 12, // Align with text vertically
            visible: true,
          });
        }
      }
    }, 0);

    chartGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", `-${radius * 0.15}`)
      .attr("font-size", `${fontSize * 0.8}px`)
      .attr("fill", "white")
      .text(`${formattedLastWeekDate} - ${formattedCurrentWeekDate}`);

    // Tooltip implementation
    const tooltip = d3.select(tooltipRef.current);

    paths
      .on("mouseover", function (event, d) {
        let label, value;
        if (!trendToUse) {
          label = "No data-slices";
          value = "N/A";
        } else if (d.index === 0) {
          label = "Decrease";
          value = trendToUse.decrease;
        } else if (d.index === 1) {
          label = "Stable";
          value = trendToUse.stable;
        } else {
          label = "Increase";
          value = trendToUse.increase;
        }

        const tooltipContent = value === "N/A" ? `${label}: ${value}` : `${label}: ${(value as number).toFixed(3)}`;
        tooltip.html(tooltipContent).style("display", "block");

        updateTooltipPosition(event);
      })
      .on("mousemove", updateTooltipPosition)
      .on("mouseout", () => {
        tooltip.style("display", "none");
      });

    function updateTooltipPosition(event: MouseEvent) {
      const tooltipNode = tooltip.node();
      if (tooltipNode) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const svgRect = svgRef.current?.getBoundingClientRect();

        if (containerRect && svgRect) {
          const x = event.clientX - svgRect.left;
          const y = event.clientY - svgRect.top;

          const tooltipWidth = tooltipNode.offsetWidth;
          const tooltipHeight = tooltipNode.offsetHeight;

          let left = x - tooltipWidth / 2;
          let top = y - tooltipHeight - 10; // Position above the cursor

          // Ensure the tooltip stays within the container bounds
          left = Math.max(0, Math.min(left, containerRect.width - tooltipWidth));
          top = Math.max(0, Math.min(top, containerRect.height - tooltipHeight));

          tooltip.style("left", `${left}px`).style("top", `${top}px`);
        }
      }
    }
  }, [containerDimensions, containerRef, nowcastTrends, userSelectedWeek]);

  useEffect(() => {
    drawGauge();

    // When dimensions change or component rerenders, recalculate the info button position
    const handleResize = () => {
      setInfoButtonPosition((prev) => ({ ...prev, visible: false }));
      setTimeout(drawGauge, 0);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGauge]);

  return (
    <div className='layout-nowcast-gauge'>
      <div ref={containerRef} className='nowcast-gauge-chart-area'>
        <svg ref={svgRef} className='w-full h-full' preserveAspectRatio='xMidYMid meet' />
        {infoButtonPosition.visible && (
          <div
            className='absolute'
            style={{
              left: `${infoButtonPosition.left}px`,
              top: `${infoButtonPosition.top}px`,
              zIndex: 5,
            }}>
            <InfoButton title='Trend Forecast Information' content={trendForecastInfo} displayStyle='icon' size='sm' dialogSize='lg' />
          </div>
        )}
        <div
          ref={tooltipRef}
          className='absolute hidden bg-white text-black rounded shadow-md p-2 text-sm'
          style={{ pointerEvents: "none", zIndex: 10 }}></div>
      </div>
      <div className='nowcast-gauge-legend-area'>
        <LegendBoxes />
      </div>
    </div>
  );
};

export default NowcastGauge;
