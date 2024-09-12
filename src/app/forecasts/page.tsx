// File Path: src/app/forecasts/page.tsx

'use client'

import React, {useEffect, useState} from "react";
import {
    DataPoint,
    ModelPrediction,
    NowcastTrendByModel,
    SeasonOption,
    StateThresholds, HistoricalDataEntry
} from "../Interfaces/forecast-interfaces";
import ForecastChart from "../Components/dashboard/ForecastChart";
import SettingsPanel from "../Components/dashboard/SettingsPanel";
import NowcastStateThermo from "../Components/dashboard/NowcastStateThermo";
import NowcastGauge from "../Components/dashboard/NowcastGauge";
import {useAppDispatch} from '../store/hooks';
import {setGroundTruthData} from '../store/groundTruthSlice';
import {setPredictionsData} from '../store/predictionsSlice';
import {setLocationData} from '../store/locationSlice';
import {setNowcastTrendsData} from '../store/nowcastTrendsSlice';
import {setSeasonOptions, updateDateRange} from "../store/filterSlice";
import {setStateThresholdsData} from '../store/stateThresholdsSlice';

import * as d3 from "d3";
import {format} from "date-fns";
import NowcastHeader from "../Components/dashboard/NowcastHeader";
import ForecastChartHeader from "../Components/dashboard/ForecastChartHeader";

import {setHistoricalGroundTruthData} from '../store/historicalGroundTruthSlice';


const Page: React.FC = () => {

    const dispatch = useAppDispatch();
    const [dataLoaded, setDataLoaded] = useState(false);


    useEffect(() => {
        console.log("DEBUG: page.tsx: useEffect called");

        const fetchData = async () => {
            try {
                const groundTruthData = await d3.csv("/data/ground-truth/target-hospital-admissions.csv");
                const parsedGroundTruthData = groundTruthData.map((d) => ({

                    date: new Date(d.date + "T12:00:00Z"), // Ensure UTC
                    stateNum: d.location,
                    stateName: d.location_name,
                    admissions: +d.value,
                    weeklyRate: +d["weekly_rate"],
                }));

                console.log("DEBUG: page.tsx: fetchData: parsedGroundTruthData: ", parsedGroundTruthData);

                // Fetch predictions data (new and old)
                const predictionsData = await Promise.all(['MOBS-GLEAM_FLUH', 'CEPH-Rtrend_fluH', 'MIGHTE-Nsemble', 'NU_UCSD-GLEAM_AI_FLUH'].map(async (team_model) => {
                    const newPredictions = await d3.csv(`/data/processed/${team_model}/predictions.csv`);
                    const oldPredictions = await d3.csv(`/data/processed/${team_model}/predictions_older.csv`);

                    const predictionData = [...newPredictions.map((d) => ({
                        referenceDate: new Date(d.reference_date + "T12:00:00Z"),
                        targetEndDate: new Date(d.target_end_date + "T12:00:00Z"),
                        stateNum: d.location,
                        confidence025: +d['0.025'],
                        confidence050: +d['0.05'],
                        confidence250: +d['0.25'],
                        confidence500: +d['0.5'],
                        confidence750: +d['0.75'],
                        confidence950: +d['0.95'],
                        confidence975: +d['0.975'],
                        isOld: false, // Add a flag to identify new predictions
                    })), ...oldPredictions.map((d) => ({
                        referenceDate: new Date(d.reference_date + "T12:00:00Z"), // Ensure UTC
                        targetEndDate: new Date(d.target_end_date + "T12:00:00Z"),
                        stateNum: d.location,
                        confidence025: +d['0.025'],
                        confidence050: +d['0.05'],
                        confidence250: +d['0.25'],
                        confidence500: +d['0.5'],
                        confidence750: +d['0.75'],
                        confidence950: +d['0.95'],
                        confidence975: +d['0.975'],
                        isOld: true, // Add a flag to identify old predictions
                    })),];

                    return {modelName: team_model, predictionData};
                }));

                // Fetch location data
                const locationData = await d3.csv('/data/locations.csv');
                const parsedLocationData = locationData.map((d) => ({
                    stateNum: d.location,
                    state: d.abbreviation,
                    stateName: d.location_name,
                    population: +d.population,
                }));

                // Fetch nowcast trends data for all models
                const modelNames = ['MOBS-GLEAM_FLUH', 'CEPH-Rtrend_fluH', 'MIGHTE-Nsemble', 'NU_UCSD-GLEAM_AI_FLUH'];
                const nowcastTrendsData: NowcastTrendByModel[] = await Promise.all(
                    modelNames.map(async (modelName) => {
                        const response = await d3.csv(`/data/processed/${modelName}/nowcast_trends.csv`);
                        const parsedData = response.map((d) => ({
                            location: d.location,
                            // reference_date: new Date(d.reference_date.replace(/-/g, '\/')),
                            reference_date: new Date(d.reference_date + "T12:00:00Z"),
                            decrease: +d.decrease,
                            increase: +d.increase,
                            stable: +d.stable,
                        }));
                        return {modelName, data: parsedData};
                    })
                );

                /* Load the Thresholds Data for RiskLevelThermometer */
                const thresholdsData = await d3.csv('/data/thresholds.csv');
                const parsedThresholdsData: StateThresholds[] = thresholdsData.map((d) => ({
                    location: d.Location,
                    medium: +d.Medium,
                    high: +d.High,
                    veryHigh: +d["Very High"],
                }));


                const historicalData: HistoricalDataEntry[] = [];
                const startDate = new Date('2023-09-23T12:00:00Z');
                const endDate = new Date('2024-04-27T12:00:00Z');

                for (let date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 7)) {
                    const fileName = `target-hospital-admissions_${date.toISOString().split('T')[0]}.csv`;
                    const filePath = `/data/ground-truth/historical-data/${fileName}`;

                    try {
                        const fileContent = await d3.csv(filePath);
                        historicalData.push({
                            associatedDate: new Date(date.toISOString()),
                            historicalData: fileContent.map(record => ({
                                date: new Date(record.date + "T12:00:00Z"),
                                stateNum: record.location ?? record['location'],
                                stateName: record.location_name ?? record['location_name'],
                                admissions: +(record.value ?? record['value']),
                                weeklyRate: +(record.weekly_rate ?? record['weekly_rate']),
                            }))
                        });
                    } catch (error) {
                        console.warn(`File not found or error parsing: ${fileName}`, error);
                        // Continue to the next date if file is not found or there's an error
                    }
                }

                if (parsedGroundTruthData.length > 0 && predictionsData.length > 0 && parsedLocationData.length > 0) {
                    // Use the ground truth data to add back empty dates with predictions
                    const groundTruthDataWithPredictions = addBackEmptyDatesWithPrediction(parsedGroundTruthData, predictionsData);
                    const seasonOptions = generateSeasonOptions(groundTruthDataWithPredictions);

                    // console.log("Debug: page.tsx: fetchData: nowcastTrendsData: ", nowcastTrendsData);
                    // console.log("Debug: page.tsx: fetchData: locationData:", locationData);
                    // console.log("Debug: page.tsx: fetchData: parsedThresholdsData:", parsedThresholdsData);
                    console.log("Debug: page.tsx: fetchData: historicalData:", historicalData);
                    console.log("Debug: page.tsx: fetchData: groundTruthDataWithPredictions:", groundTruthDataWithPredictions);

                    dispatch(setGroundTruthData(groundTruthDataWithPredictions));
                    dispatch(setPredictionsData(predictionsData));
                    dispatch(setLocationData(parsedLocationData));
                    dispatch(setNowcastTrendsData(nowcastTrendsData));
                    dispatch(setSeasonOptions(seasonOptions));
                    dispatch(setStateThresholdsData(parsedThresholdsData));
                    dispatch(setHistoricalGroundTruthData(historicalData));

                    setDataLoaded(true);
                    console.warn("DEBUG: page.tsx: fetchData: dataLoaded: ", dataLoaded);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [dispatch]);

    return (<>
        {dataLoaded ? (
            <div className="layout-grid-forecasts-page w-full h-full pl-4">
                <div className="nowcast-header">
                    <NowcastHeader/>
                </div>
                <div className="nowcast-thermo">
                    <NowcastStateThermo/>
                </div>
                <div className="vertical-separator">
                    <svg width="100%" height="100%">
                        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="lightgray" strokeWidth="1"/>
                    </svg>
                </div>

                <div className="nowcast-gauge">
                    <NowcastGauge riskLevel="US"/>
                </div>
                <div className="settings-panel">
                    <SettingsPanel/>
                </div>
                <div className="horizontal-separator">
                    <svg width="100%" height="100%">
                        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="lightgray" strokeWidth="1"/>
                    </svg>
                </div>
                <div className="chart-header">
                    <ForecastChartHeader/>
                </div>
                <div className="forecast-graph">
                    <ForecastChart/>
                </div>
            </div>


        ) : (<div className={"mx-auto"}> Loading...</div>)}
    </>);
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

    const newerDates = new Set<Date>();

    // Step 2: Find dates in prediction data that are newer than the most recent ground truth date
    predictionsData.forEach((model) => {
        model.predictionData.forEach((dataPoint) => {
            if (dataPoint.referenceDate > mostRecentDate) {
                newerDates.add(dataPoint.referenceDate);
            } else if (dataPoint.targetEndDate > mostRecentDate) {
                newerDates.add(dataPoint.targetEndDate);
            }
        });
    });

    console.log("DEBUG: page.tsx: addBackEmptyDatesWithPrediction: newerDates: ", newerDates);

    const placeholderData: DataPoint[] = [];

    // Step 3: Create placeholder data for each distinct state and newer date
    newerDates.forEach((newDate) => {
        const date = newDate;
        states.forEach((stateString) => {
            const [stateNum, stateName] = stateString.split('-');
            placeholderData.push({
                date, stateNum, stateName, admissions: -1, weeklyRate: 0 // Use -1 to indicate a placeholder for admission value
            });
        });
    });
    return [...groundTruthData, ...placeholderData].sort((a, b) => b.date.getTime() - a.date.getTime());
}

function generateSeasonOptions(data: DataPoint[]): SeasonOption[] {
    const options: SeasonOption[] = [];

    if (data.length === 0) {
        return options;
    }

    let earliestDate = data[0].date;
    let latestDate = data[0].date;

    // Find earliest and latest dates without using spread operator
    for (let i = 1; i < data.length; i++) {
        if (data[i].date < earliestDate) earliestDate = data[i].date;
        if (data[i].date > latestDate) latestDate = data[i].date;
    }

    const earliestYear = earliestDate.getFullYear();
    const latestYear = latestDate.getFullYear();

    // Handle partial season at the start
    const firstSeasonStart = new Date(earliestYear, 7, 1); // August 1st of the earliest year
    if (earliestDate < firstSeasonStart) {
        options.push({
            index: 0,
            displayString: `Partial ${earliestYear - 1}-${earliestYear}`,
            timeValue: `${format(earliestDate, 'yyyy-MM-dd')}/${format(new Date(earliestYear, 6, 31), 'yyyy-MM-dd')}`,
            startDate: earliestDate,
            endDate: new Date(earliestYear, 6, 31) // July 31st of the earliest year
        });
    }


    let optionIndex = 1;
    // Generate full seasons
    for (let year = earliestYear; year <= latestYear; year++) {
        const seasonStart = new Date(year, 7, 1); // August 1st
        const seasonEnd = new Date(year + 1, 6, 31); // July 31st of the following year

        // Adjust start and end dates if they're outside the data range
        const adjustedStart = new Date(Math.max(seasonStart.getTime(), earliestDate.getTime()));
        const adjustedEnd = new Date(Math.min(seasonEnd.getTime(), latestDate.getTime()));

        // Only add the season if it's within the data range
        if (adjustedStart < adjustedEnd) {
            options.push({
                index: optionIndex++,
                displayString: `${year}-${year + 1}`,
                timeValue: `${format(adjustedStart, 'yyyy-MM-dd')}/${format(adjustedEnd, 'yyyy-MM-dd')}`,
                startDate: adjustedStart,
                endDate: adjustedEnd
            });
        }
    }

    // Handle partial season at the end
    const lastSeasonEnd = new Date(latestYear, 6, 31); // July 31st of the latest year
    if (latestDate > lastSeasonEnd) {
        options.push({
            index: options.length,
            displayString: `Partial ${latestYear}-${latestYear + 1}`,
            timeValue: `${format(new Date(latestYear, 7, 1), 'yyyy-MM-dd')}/${format(latestDate, 'yyyy-MM-dd')}`,
            startDate: new Date(latestYear, 7, 1), // August 1st of the latest year
            endDate: latestDate
        });
    }
    return options;
}

export default Page;
