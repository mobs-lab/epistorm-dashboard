'use client'

import React, {useEffect, useState} from "react";
import ForecastChart from "../Components/dashboard/ForecastChart";
import FiltersPane from "../Components/dashboard/FiltersPane";
import SingleStateMap from "../Components/dashboard/SingleStateMap";
import {useAppDispatch} from '../store/hooks';
import {setGroundTruthData} from '../store/groundTruthSlice';
import {setPredictionsData} from '../store/predictionsSlice';
import {setLocationData} from '../store/locationSlice';

import * as d3 from "d3";

import {DataPoint, LocationData, PredictionDataPoint, ModelPrediction} from "../Interfaces/forecast-interfaces";


const Page: React.FC = () => {

    const dispatch = useAppDispatch();

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
            dispatch(setGroundTruthData(dataPoints));
            // setGroundTruthData(dataPoints);
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
                return {modelName: team_model, predictionData};
            });
        });

        // Load all selected teams's prediction data
        Promise.all(predictionDataPromises).then((allPredictionsData: ModelPrediction[]) => {
            console.log("All Predictions Data Loaded: ", allPredictionsData.length);
            dispatch(setPredictionsData(allPredictionsData));
            // setPredictionsData(allPredictionsData);
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
            dispatch(setLocationData(locationData));
            // setLocationData(locationData);
        });

    }, []);

    return (
        <div className={"container mx-auto"}>
            <div className={"dashboard-grid-layout"}>
                <div className={"forecast-state"}>
                    <h1> State </h1>
                    <SingleStateMap/>
                </div>
                <div className={"forecast-gauge"}>
                    <h1> Gauge </h1>
                    {/*<RiskLevelGauge riskLevel={"Very High"}></RiskLevelGauge>*/}
                </div>
                {/* Line chart below */}
                <div className={"forecast-graph"}>
                    <h1> Graph </h1>
                    <ForecastChart/>
                </div>
                <div className={"forecast-settings"}>
                    <h1> Settings Pane</h1>
                    <FiltersPane
                    />
                </div>
            </div>
        </div>

    )
};

export default Page;
