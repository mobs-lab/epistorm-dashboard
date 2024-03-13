// components/ForecastChart.tsx
"use client"

import React, {useRef} from "react";
import * as d3 from "d3";
import {csvParse} from "d3";

const mobs_gleam_data = "../../../../data/processed/MIGHTE-Nsemble/predictions.csv";

type LineChartProps = {
    // Props for your data
};

// TODO Read the predictions data into a const

function retrievePredictions = () => {
    const predictionData = d3.csv(mobs_gleam_data).then(function(entry) {
        reference_date : d3.timeParse("")
    } )
    return predictionData;
    }


// TODO Construct a chart, configure it;
const LineChart: React.FC<LineChartProps> = () => {
    // reference to svg object
    const svgRef = useRef(null);
    const data = retrievePredictions();
    // Set up size and margins
    const width = 928;
    const height = 500;

    const marginTop = 20;
    const marginBottom = 20;
    const marginLeft = 20;
    const marginRight = 20;

    // Build X-Axis, which is based on dates

    // Build Y-Axis, which is based on highest

    // Return the SVG object using reference
    return (<svg ref={svgRef}></svg>);
};

export default LineChart;
