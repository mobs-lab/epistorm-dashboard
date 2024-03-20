// components/ForecastChart.tsx
"use client"

import React, {useRef} from "react";
import * as d3 from "d3";

const mobs_gleam_data = "/data/processed/MOBS-GLEAM_FLUH/predictions.csv";
const ceph_rtrend_fluh_data = "/data/processed/CEPH-Rtrend_fluH/predications.csv";
const mighte_nsemble_data = "/data/processed/MIGHTe-Ensemble/predictions.csv";
const nu_ucsd_gleam_ai_fluh_data = "/data/processed/NU-UCSD-GLEAM_AI_FLUH/predictions.csv";
const ground_truth_data = "/data/ground-truth/target-hospital-admissions.csv";

type LineChartProps = {
    selectedUSState: string;
    selectedForecastModel: string[];
    selectedDates: string;
    yAxisScale: string;
    confidenceInterval: string;
    displayMode: string;
};


// TODO Construct a chart, configure it;
const LineChart: React.FC<LineChartProps> = () => {
    // reference to svg object
    const svgRef = useRef(null);

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

// TODO Read the predictions data into a const

export default LineChart;
