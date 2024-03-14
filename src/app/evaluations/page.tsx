import React from "react";


export default function Page() {

    return (
        <div className={"container mx-auto"}>
            <div className={"evaluations-grid-layout"}>
                <div className={"evaluations-title flex flex-col justify-stretch align-baseline"}>
                    <h1>Models Evaluations</h1>
                    <p> This page shows a smaller version of forecast, in horizon view, side by side with evaluation
                        chart based on ___ scoring system </p>
                </div>
                <div className={"evaluations-forecast bg-amber-800"}>
                    <h1> State </h1>
                </div>
                <div className={"evaluations-score bg-amber-900"}>
                    <h1> Gauge </h1>
                </div>
                <div className={"evaluations-settings bg-yellow-500"}>
                    <h1> Settings </h1>
                </div>
            </div>
        </div>

    )
};