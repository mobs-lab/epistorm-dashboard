import React from "react";
import StateDetail from "../Components/dashboard/SingleState";
import RiskLevelGauge from "../Components/dashboard/RiskLevelGauge";
import LineChart from "../Components/dashboard/ForecastChart";
import StateMapWithFilters from "../Components/dashboard/FiltersPane";

export default function Page() {

    return (
        <div className={"container mx-auto"}>
            <div className={"dashboard-grid-layout"}>
                <div className={"forecast-state"}>
                    <h1> State </h1>
                    <StateDetail stateName={"Massachusetts"} hospitalizations={123}/>
                </div>
                <div className={"forecast-gauge"}>
                    <h1> Gauge </h1>
                    <RiskLevelGauge riskLevel={"Very High"}></RiskLevelGauge>
                </div>
                {/* Line chart below */}
                <div className={"forecast-graph"}>
                    <h1> Graph </h1>
                    <LineChart/>

                </div>
                <div className={"forecast-settings"}>
                    <h1> Settings Pane</h1>
                    <StateMapWithFilters/>

                </div>
            </div>
        </div>

    )
};