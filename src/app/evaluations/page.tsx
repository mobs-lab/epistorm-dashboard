import React from "react";
import StateDetail from "../Components/dashboard/SingleStateNowcast";
import RiskLevelGauge from "../Components/dashboard/RiskLevelGauge";
import ForecastChart from "../Components/dashboard/ForecastChart";
import StateMapWithFilters from "../Components/dashboard/FiltersPane";

export default function Page() {

    return (
        <div className={"container mx-auto"}>
            <div className={"evaluations-grid-layout"}>
                <div className={"bg-yellow-500 evaluations-title"}>
                    <h1> Model Evaluations</h1>
                    <h3> This page shows a smaller version of line chart, side by side with the evaluations based on ___ scoring system.</h3>
                </div>
                <div className={"bg-amber-800 evaluations-graph"}>
                    <h1>
                        Model Graph
                    </h1>
                    {/*<LineChart/>*/}
                </div>
                {/* Line chart below */}
                <div className={"bg-amber-900 evaluations-score"}>

                </div>
                <div className={"bg-fuchsia-300 evaluations-settings"}>

                </div>
            </div>
        </div>

    )
};