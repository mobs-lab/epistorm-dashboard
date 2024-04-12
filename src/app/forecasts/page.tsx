'use client'

import React, {useEffect, useState} from "react";
import LineChart from "../Components/dashboard/ForecastChart";
import FiltersPane from "../Components/dashboard/FiltersPane";
import SingleStateMap from "../Components/dashboard/SingleStateMap";

import * as d3 from "d3";

import {DataPoint, LocationData, PredictionDataPoint, ModelPrediction} from "../Interfaces/forecast-interfaces";


const Page: React.FC = () => {

    // Note: the ground truth data gets loaded here and is passed into chart component
    const [groundTruthData, setGroundTruthData] = useState<DataPoint[]>([]);

    // Note: predictions data gets loaded here (several models each within 2nd level array) and is passed into chart component
    const [predictionsData, setPredictionsData] = useState<ModelPrediction[]>([]);

    const [locationData, setLocationData] = useState<LocationData[]>([]);

    const [USStateNum, setUSStateNum] = useState("US");

    // NOTE: selectedForecastModel manages the selected forecast model from dropdown menu in filtersPane, defaults to "MOBS-GLEAM_FLUH"
    //  User can select multiple models, so this will be an array of strings; add to it when multiple are selected
    const [forecastModel, setForecastModel] = useState(["MOBS-GLEAM_FLUH"]);

    const [numOfWeeksAhead, setNumOfWeeksAhead] = useState(1);

    // Date Range consists of starting and ending date
    const [dateStart, setDateStart] = useState(new Date("2023-06-01"));

    const [dateEnd, setDateEnd] = useState(new Date("2024-06-01"));


    const [yScale, setYScale] = useState("linear");

    const [confidenceInterval, setConfidenceInterval] = useState("90");

    const [displayMode, setDisplayMode] = useState("byDate");

    //Function to update global state variables; need to pass them into filters pane
    const updateState = (selectedStateNum: string) => {
        setUSStateNum(selectedStateNum);
    }

    const updateModel = (selectedModel: string[]) => {
        setForecastModel(selectedModel);
    }

    const updateNumOfWeeksAhead = (selectedNumOfWeeksAhead: number) => {
        setNumOfWeeksAhead(selectedNumOfWeeksAhead);
    }

    const updateDateStart = (selectedDateStart: Date) => {
        setDateStart(selectedDateStart);
    }
    const updateDateEnd = (selectedDateEnd: Date) => {
        setDateEnd(selectedDateEnd);
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
            console.log("Ground Truth Data Loaded: ", dataPoints);
            setGroundTruthData(dataPoints);
        });


        // Load Prediction Data for Each Model
        const predictionDataPromises = ["MOBS-GLEAM_FLUH", "CEPH-Rtrend_fluH", "MIGHTE-Nsemble", "NU_UCSD-GLEAM_AI_FLUH"].map((team_model) => {
            return d3.csv(`/data/processed/${team_model}/predictions.csv`).then((data) => {
                const predictionData: PredictionDataPoint[] = data.map((d) => {
                    // Adapt prediction data to match my interface
                    return {
                        referenceDate: d.reference_date,
                        targetEndDate: d.target_end_date,
                        stateNum: d.location,
                        confidence025: +d["0.025"],
                        confidence050: +d["0.05"],
                        confidence250: +d["0.25"],
                        confidence500: +d["0.5"],
                        confidence750: +d["0.75"],
                        confidence950: +d["0.95"],
                        confidence975: +d["0.975"],
                    }
                });
                console.log("Prediction Data Loaded for team: ", team_model, "  ", predictionData);
                return {modelName: team_model, predictionData};
            });
        });

        // Load all selected teams's prediction data
        Promise.all(predictionDataPromises).then((allPredictionsData: ModelPrediction[]) => {
            console.log("All Predictions Data Loaded: ", allPredictionsData.length);
            console.log("The first one inside allPredictionData: ", allPredictionsData[0]);
            setPredictionsData(allPredictionsData);
        });

        // Load location data (just once)
        d3.csv("/data/locations.csv").then((data) => {
            const locationData: LocationData[] = data.map((d) => {
                return {
                    stateNum: d.location,
                    state: d.abbreviation,
                    stateName: d.location_name
                }
            });
            console.log("Location Data Loaded: ", locationData);
            setLocationData(locationData);
        });

    }, []);

    return (
        <div className={"container mx-auto"}>
            <div className={"dashboard-grid-layout"}>
                <div className={"forecast-state"}>
                    <h1> State </h1>
                    <SingleStateMap stateNum={USStateNum}/>
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
                        predictionsData={predictionsData}
                        selectedUSStateNum={USStateNum}
                        selectedForecastModel={forecastModel}
                        weeksAhead={numOfWeeksAhead}
                        selectedDateRange={[dateStart, dateEnd]}
                        yAxisScale={yScale}
                        confidenceInterval={confidenceInterval}
                        displayMode={displayMode}
                    />
                </div>
                <div className={"forecast-settings"}>
                    <h1> Settings Pane</h1>
                    <FiltersPane
                        locationData={locationData}
                        handleStateSelectionChange={updateState}
                        handleModelSelectionChange={updateModel}
                        handleNumOfWeeksAheadChange={updateNumOfWeeksAhead}
                        handleDateStartSelectionChange={updateDateStart}
                        handleDateEndSelectionChange={updateDateEnd}
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
