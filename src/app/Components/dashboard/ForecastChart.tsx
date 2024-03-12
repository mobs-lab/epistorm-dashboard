// components/ForecastChart.tsx
"use client"

import React, {useRef} from "react";
import * as d3 from "d3";

const mobs_gleam_data = "/data/processed/";

type LineChartProps = {
    // Props for your data
};

const predictionData = await d3.csv(",", );

const LineChart: React.FC<LineChartProps> = () => {
    const svgRef = useRef(null);
    const lineChart = d3.select(svgRef.current).append("svg").attr("width", 960).attr("height", 720);

    return (<svg ref={svgRef}></svg>);
};

export default LineChart;
