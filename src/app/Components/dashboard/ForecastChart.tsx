`use client`

//TODO: The main dashboard display, using d3.js
//  Note to myself: view width should dynamically adjust, bc right side "settings" is collapsed by default


import React from "react";
import StateMap from "./svg/StateMap";

interface ForecastChartProps {

}

const ForecastChart: React.FC<ForecastChartProps> = () => {
    return (
        <>
            <StateMap/>
        </>
    )

}

export default ForecastChart;