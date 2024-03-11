import React from "react";
import StateDetail from "../Components/dashboard/SingleState";
import RiskLevelGauge from "../Components/dashboard/RiskLevelGauge";
import LineChart from "../Components/dashboard/ForecastChart";
import StateMapWithFilters from "../Components/dashboard/FiltersPane";


export default function Page() {

    return (

        <div className="container mx-auto p-6">
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    {/* State details and risk gauge side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                        <StateDetail stateName="MA" hospitalizations={1234}/>
                        <RiskLevelGauge riskLevel="moderate"/>
                    </div>
                    {/* Line chart below */}
                    <LineChart /* chart data props */ />
                </div>
                {/* Right-hand side map and filters */}
                <StateMapWithFilters /* props */ />
            </div>
        </div>
    )
};