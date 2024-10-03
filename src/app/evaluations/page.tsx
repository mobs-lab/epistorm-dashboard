import React from "react";
import StateDetail from "../forecasts/forecasts-components/NowcastStateThermo";
import NowcastGauge from "../forecasts/forecasts-components/NowcastGauge";
import ForecastChart from "../forecasts/forecasts-components/ForecastChart";
import StateMapWithFilters from "../forecasts/forecasts-components/SettingsPanel";

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