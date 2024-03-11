// components/ForecastChart.tsx

import React from "react";

type LineChartProps = {
    // Props for your data
};

const LineChart: React.FC<LineChartProps> = ({ /* data props here */}) => {
    return (
        <div className="chart-container bg-gray-800 text-white p-4 rounded">
            <h3 className="text-lg font-semibold mb-3">Massachusetts Weekly Hospital Admissions</h3>
            {/* Chart rendering goes here */}
            <div id="line-chart" className="h-64"></div>
        </div>
    );
};

export default LineChart;
