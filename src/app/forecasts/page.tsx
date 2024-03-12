import React from "react";
import StateDetail from "../Components/dashboard/SingleState";
import RiskLevelGauge from "../Components/dashboard/RiskLevelGauge";
import LineChart from "../Components/dashboard/ForecastChart";
import StateMapWithFilters from "../Components/dashboard/FiltersPane";

export default function Page() {

    return (
        <div className={"container mx-auto p-2"}>
            <div id={"dashboard-grid-layout"}>
                <div className={"grid-area: state"}>
                    <h1> State </h1>
                </div>
                <div className={"grid-area: gauge"}>
                    <h1> Gauge </h1>
                </div>
                {/* Line chart below */}
                <div className={"grid-area: graph"}>
                    <h1> Graph </h1>

                </div>
                <div className={"grid-area: settings"}>
                    <h1> Settings Pane</h1>

                </div>
            </div>
        </div>

    )
};