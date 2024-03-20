'use client'

import React, {useState, useEffect} from "react";
import StateDetail from "../Components/dashboard/SingleState";
import RiskLevelGauge from "../Components/dashboard/RiskLevelGauge";
import LineChart from "../Components/dashboard/ForecastChart";
import FiltersPane from "../Components/dashboard/FiltersPane";

interface DataPoint {
    date: string;
    stateNum: string;
    state: string;
    admissions: number;
}

interface PredictionDataPoint {
    referenceDate: string;
    targetEndDate: string;
    stateNum: string;
    confidence025: number;
    confidence250: number;
    confidence500: number;
    confidence750: number;
    confidence975: number;
}


function Page() {

    // Note: the ground truth data gets loaded here and is passed into chart component
    const [groundTruthData, setGroundTruthData] = useState<DataPoint[]>([]);

    // Note: predictions data gets loaded here (several models each within 2nd level array) and is passed into chart component
    const [predictionsData, setPredictionsData] = useState<PredictionDataPoint[][]>([]);

    // Note:
    const [stateMapping, setStateMapping] = useState<Map<string, string>>(new Map<string, string>());

    // NOTE: selectedUSState manages the selected state from map or from dropdown menu in filtersPane, defaults to "US" to show total
    const [USState, setUSState] = useState("US");

    // NOTE: selectedForecastModel manages the selected forecast model from dropdown menu in filtersPane, defaults to "MOBS-GLEAM_FLUH"
    //  User can select multiple models, so this will be an array of strings; add to it when multiple are selected
    const [forecastModel, setForecastModel] = useState(["MOBS-GLEAM_FLUH"]);

    // TODO: change this in the future so that it's a date range (using a date picker) (means also change the filters pane's child component)
    const [dates, setDates] = useState("2023-2024");

    const [yScale, setYScale] = useState("linear");

    const [confidenceInterval, setConfidenceInterval] = useState("90");

    const [displayMode, setDisplayMode] = useState("By Date");

    //Function to update global state variables; need to pass them into filters pane
    const updateState = (selectedState: string) => {
        setUSState(selectedState);
    }

    const updateModel = (selectedModel: string[]) => {
        setForecastModel(selectedModel);
    }

    const updateDates = (selectedDates: string) => {
        setDates(selectedDates);
    }

    const updateYScale = (selectedYScale: string) => {
        setYScale(selectedYScale);
    }

    const updateConfidenceInterval = (selectedConfidenceInterval: string) => {
        setConfidenceInterval(selectedConfidenceInterval);
    }

    const updateDisplayMode = (selectedDisplayMode: string) => {
        setDisplayMode(selectedDisplayMode);
    }

    return (
        <div className={"container mx-auto"}>
            <div className={"dashboard-grid-layout"}>
                <div className={"forecast-state"}>
                    <h1> State </h1>
                    {/*<StateDetail/>*/}
                </div>
                <div className={"forecast-gauge"}>
                    <h1> Gauge </h1>
                    {/*<RiskLevelGauge riskLevel={"Very High"}></RiskLevelGauge>*/}
                </div>
                {/* Line chart below */}
                <div className={"forecast-graph"}>
                    <h1> Graph </h1>
                    <LineChart
                        selectedUSState={USState}
                        selectedForecastModel={forecastModel}
                        selectedDates={dates}
                        yAxisScale={yScale}
                        confidenceInterval={confidenceInterval}
                        displayMode={displayMode}
                    />
                </div>
                <div className={"forecast-settings"}>
                    <h1> Settings Pane</h1>
                    <FiltersPane
                        handleStateSelectionChange={updateState}
                        handleModelSelectionChange={updateModel}
                        handleDatesSelectionChange={updateDates}
                        handleYAxisScaleChange={updateYScale}
                        handleConfidenceIntervalChange={updateConfidenceInterval}
                        handleDisplayModeChange={updateDisplayMode}
                    />
                </div>
            </div>
        </div>

    )
};

export default Page;