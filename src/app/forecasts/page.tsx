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
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        console.log("DEBUG: page.tsx: useEffect called");

        const fetchData = async () => {
            try {
                const groundTruthData = await d3.csv("/data/ground-truth/target-hospital-admissions.csv");
                const parsedGroundTruthData = groundTruthData.map((d) => ({

                    date: new Date(d.date.replace(/-/g, '\/')),
                    stateNum: d.location,
                    stateName: d.location_name,
                    admissions: +d.value,
                }));

// Fetch predictions data
                const predictionsData = await Promise.all(
                    ['MOBS-GLEAM_FLUH', 'CEPH-Rtrend_fluH', 'MIGHTE-Nsemble', 'NU_UCSD-GLEAM_AI_FLUH'].map(async (team_model) => {
                        const data = await d3.csv(`/data/processed/${team_model}/predictions.csv`);
                        const predictionData = data.map((d) => ({
                            referenceDate: new Date(d.reference_date.replace(/-/g, '\/')),
                            targetEndDate: new Date(d.target_end_date.replace(/-/g, '\/')),
                            stateNum: d.location,
                            confidence025: +d['0.025'],
                            confidence050: +d['0.05'],
                            confidence250: +d['0.25'],
                            confidence500: +d['0.5'],
                            confidence750: +d['0.75'],
                            confidence950: +d['0.95'],
                            confidence975: +d['0.975'],
                        }));
                        return {modelName: team_model, predictionData};
                    })
                );

                // Fetch location data
                const locationData = await d3.csv('/data/locations.csv');
                const parsedLocationData = locationData.map((d) => ({
                    stateNum: d.location,
                    state: d.abbreviation,
                    stateName: d.location_name,
                }));


                if (parsedGroundTruthData.length > 0 && predictionsData.length > 0 && parsedLocationData.length > 0) {
                    // Use the ground truth data to add back empty dates with predictions
                    const groundTruthDataWithPredictions = addBackEmptyDatesWithPrediction(parsedGroundTruthData, predictionsData);
                    dispatch(setGroundTruthData(groundTruthDataWithPredictions));
                    dispatch(setPredictionsData(predictionsData));
                    dispatch(setLocationData(parsedLocationData));
                    setDataLoaded(true);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [dispatch]);

    return (
        <div className={"container mx-auto"}>
            {dataLoaded ? (
                <>
                    <div className={"dashboard-grid-layout"}>
                        <div className={"forecast-state"}>
                            <SingleStateMap/>
                        </div>
                        <div className={"forecast-gauge"}>
                            {/*<RiskLevelGauge riskLevel={"Very High"}></RiskLevelGauge>*/}
                        </div>
                        {/* Line chart below */}
                        <div className={"forecast-graph"}>
                            <ForecastChart/>
                        </div>
                        <div className={"forecast-settings"}>
                            <FiltersPane/>
                        </div>
                    </div>
                </>) : (
                <div className={"container mx-auto"}> Loading... </div>
            )}
        </div>
    );
};

function addBackEmptyDatesWithPrediction(groundTruthData: DataPoint[], predictionsData: ModelPrediction[]): DataPoint[] {
    const states = new Set<string>();
    let mostRecentDate = new Date(0);

    // Step 1: Keep track of distinct states and the most recent date in ground truth data
    groundTruthData.forEach((dataPoint) => {
        states.add(`${dataPoint.stateNum}-${dataPoint.stateName}`);
        if (dataPoint.date > mostRecentDate) {
            mostRecentDate = dataPoint.date;
        }
    });

    const newerDates = new Set<string>();

    // Step 2: Find dates in prediction data that are newer than the most recent ground truth date
    predictionsData.forEach((model) => {
        model.predictionData.forEach((dataPoint) => {
            if (dataPoint.referenceDate > mostRecentDate) {
                newerDates.add(dataPoint.referenceDate.toISOString());
            }
        });
    });

    const placeholderData: DataPoint[] = [];

    // Step 3: Create placeholder data for each distinct state and newer date
    newerDates.forEach((dateString) => {
        const date = new Date(dateString);
        states.forEach((stateString) => {
            const [stateNum, stateName] = stateString.split('-');
            placeholderData.push({
                date,
                stateNum,
                stateName,
                admissions: -1 // Use -1 to indicate a placeholder
            });
        });
    });
    return [...groundTruthData, ...placeholderData].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default Page;
