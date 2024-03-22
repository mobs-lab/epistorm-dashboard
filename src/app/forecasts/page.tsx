'use client'

import React, {useEffect, useState} from "react";
import LineChart from "../Components/dashboard/ForecastChart";
import FiltersPane from "../Components/dashboard/FiltersPane";
import * as d3 from "d3";

interface DataPoint {
    date: Date;
    stateNum: string;
    stateName: string;
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

interface LocationData {
    stateNum: string;
    state: string;
    stateName: string;
}


const Page: React.FC = () => {

    // Note: the ground truth data gets loaded here and is passed into chart component
    const [groundTruthData, setGroundTruthData] = useState<DataPoint[]>([]);

    // Note: predictions data gets loaded here (several models each within 2nd level array) and is passed into chart component
    const [predictionsData, setPredictionsData] = useState<PredictionDataPoint[][]>([]);

    const [locationData, setLocationData] = useState<LocationData[]>([]);

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

    useEffect(() => {
        // Load ground truth data
        d3.csv("/data/ground-truth/target-hospital-admissions.csv").then((data) => {
            const dataPoints: DataPoint[] = data.map((d) => {
                return {
                    date: new Date(d.date),
                    stateNum: d.location,
                    stateName: d.location_name,
                    admissions: +d.value,
                }
            })
            console.log(dataPoints);
            setGroundTruthData(dataPoints);
        });


        // Load predictions data
        d3.csv("/data/processed/MOBS-GLEAM_FLUH/predictions.csv").then((data) => {
            // console.log(data)
            // setPredictionsData([[data]]);
        });

        d3.csv("/data/locations.csv").then((data) => {
            // console.log(data)
            // setLocationData(data);
        });

    }, []);

    return (<div className={"container mx-auto"}>
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
                        groundTruthData={groundTruthData}
                        predictionsData={[[]]}
                        locationData={[]}
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
