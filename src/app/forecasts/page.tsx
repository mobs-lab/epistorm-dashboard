// File Path: src/app/forecasts/page.tsx

'use client'

import React, {useEffect, useState} from "react";
import * as d3 from "d3";
import {
    addWeeks,
    eachWeekOfInterval,
    endOfWeek,
    format,
    getYear,
    isAfter,
    isBefore,
    isSameDay,
    parseISO,
    setDate,
    setMonth,
    startOfWeek
} from "date-fns";

import {
    DataPoint,
    LocationData,
    ModelPrediction,
    PredictionDataPoint,
    SeasonOption
} from "../Interfaces/forecast-interfaces";
import ForecastChart from "./forecasts-components/ForecastChart";
import SettingsPanel from "./forecasts-components/SettingsPanel";
import NowcastStateThermo from "./forecasts-components/NowcastStateThermo";
import NowcastGauge from "./forecasts-components/NowcastGauge";
import NowcastHeader from "./forecasts-components/NowcastHeader";
import ForecastChartHeader from "./forecasts-components/ForecastChartHeader";

import {useAppDispatch} from '../store/hooks';
import {setGroundTruthData} from '../store/groundTruthSlice';
import {setPredictionsData} from '../store/predictionsSlice';
import {setLocationData} from '../store/locationSlice';
import {setNowcastTrendsData} from '../store/nowcastTrendsSlice';
import {setSeasonOptions, updateDateEnd, updateDateRange, updateDateStart} from "../store/filterSlice";
import {setStateThresholdsData} from '../store/stateThresholdsSlice';
import {setHistoricalGroundTruthData} from '../store/historicalGroundTruthSlice';

import '../CSS/component_styles/forecast-page.css';

/* Custom Interface for addBackEmptyDatesWithPrediction() and generateSeasonOptions().*/
interface ProcessedDataWithDateRange {
    data: DataPoint[];
    earliestDate: Date;
    latestDate: Date;
}

const modelNames = ['MOBS-GLEAM_FLUH', 'CEPH-Rtrend_fluH', 'MIGHTE-Nsemble', 'NU_UCSD-GLEAM_AI_FLUH', 'FluSight-ensemble'];


const Page: React.FC = () => {

    const dispatch = useAppDispatch();
    const [loadingStates, setLoadingStates] = useState({
        groundTruth: true,
        predictions: true,
        locations: true,
        nowcastTrends: true,
        thresholds: true,
        historicalGroundTruth: true,
        seasonOptions: true,
    });

    const updateLoadingState = (key: keyof typeof loadingStates, value: boolean) => {
        setLoadingStates(prev => ({...prev, [key]: value}));
    };

    useEffect(() => {
        // Surveillance and predictions are fetched together to ensure special days are added
        fetchForecastData();
        fetchLocationData();
        fetchNowcastTrendsData();
        fetchThresholdsData();
        fetchHistoricalGroundTruthData();
    }, []);

    const safeCSVFetch = async (url: string) => {
        try {
            return await d3.csv(url);
        } catch (error) {
            console.warn(`File not found or error parsing: ${url}`);
            return null;
        }
    };

    const fetchForecastData = async () => {
        try {
            const groundTruthData = await d3.csv("/data/ground-truth/target-hospital-admissions.csv");
            const parsedGroundTruthData = groundTruthData.map((d) => ({
                date: parseISO(d.date),
                stateNum: d.location,
                stateName: d.location_name,
                admissions: +d.value,
                weeklyRate: +d["weekly_rate"],
            }));


            const predictionsData = await Promise.all(modelNames.map(async (team_model) => {
                const newPredictions = await safeCSVFetch(`/data/processed/${team_model}/predictions.csv`);
                const oldPredictions = await safeCSVFetch(`/data/processed/${team_model}/predictions_older.csv`);

                if (!newPredictions && !oldPredictions) {
                    console.warn(`No prediction data found for model: ${team_model}`);
                    return {modelName: team_model, predictionData: []};
                }

                // Process predictions data
                // NOTE: 2024-09-25: No longer distinguish between old vs new prediction data
                const predictionData: PredictionDataPoint[] =
                    [...(newPredictions || []), ...(oldPredictions || [])].map((d) => ({
                        referenceDate: parseISO(d.reference_date), // Ensure UTC
                        targetEndDate: parseISO(d.target_end_date),
                        stateNum: d.location,
                        confidence025: +d['0.025'],
                        confidence050: +d['0.05'],
                        confidence250: +d['0.25'],
                        confidence500: +d['0.5'],
                        confidence750: +d['0.75'],
                        confidence950: +d['0.95'],
                        confidence975: +d['0.975'],
                        confidence_low: +d['0.5'],
                        confidence_high: +d['0.5'],
                    }));

                return {modelName: team_model, predictionData: predictionData};
            }));

            const validPredictionsData = predictionsData.filter(Boolean);
            const locationData = await fetchLocationData();

            const processedData = addBackEmptyDatesWithPrediction(parsedGroundTruthData, validPredictionsData, locationData);
            dispatch(setGroundTruthData(processedData.data));
            updateLoadingState('groundTruth', false);


            dispatch(setPredictionsData(predictionsData));
            updateLoadingState('predictions', false);
            console.log("Debug: page.tsx: fetchForecastData: predictionsData: ", predictionsData);

            /*NOTE: Season Options are generated using Ground Truth data so must be here*/
            const seasonOptions = generateSeasonOptions(processedData);
            // console.log("Debug: page.tsx: fetchForecastData: seasonOptions: ", seasonOptions);
            dispatch(setSeasonOptions(seasonOptions));
            if (seasonOptions.length > 0) {
                const lastSeason = seasonOptions[seasonOptions.length - 1];
                dispatch(updateDateRange(lastSeason.timeValue));
                dispatch(updateDateStart(lastSeason.startDate));
                dispatch(updateDateEnd(lastSeason.endDate));
            }
            updateLoadingState('seasonOptions', false);
        } catch (error) {
            console.error('Error fetching predictions data:', error);
            updateLoadingState('predictions', false);
        }
    };

    const fetchLocationData = async () => {
        try {
            const locationData = await d3.csv('/data/locations.csv');
            const parsedLocationData = locationData.map((d) => ({
                stateNum: d.location, state: d.abbreviation, stateName: d.location_name, population: +d.population,
            }));
            dispatch(setLocationData(parsedLocationData));
            updateLoadingState('locations', false);
            return parsedLocationData;
        } catch (error) {
            console.error('Error fetching location data:', error);
            updateLoadingState('locations', false);
            return [];
        }
    };

    const fetchNowcastTrendsData = async () => {
        try {
            const nowcastTrendsData = await Promise.all(
                modelNames.map(async (modelName) => {
                    const response = await safeCSVFetch(`/data/processed/${modelName}/nowcast_trends.csv`);
                    if (!response) {
                        console.warn(`No nowcast trends data found for model: ${modelName}`);
                        return {modelName, data: []};
                    }
                    const responseParsed = response.map((d) => ({
                        location: d.location,
                        reference_date: parseISO(d.reference_date),
                        decrease: +d.decrease,
                        increase: +d.increase,
                        stable: +d.stable,
                    }));
                    return {modelName, data: responseParsed};
                }));
            const validNowcastTrendsData = nowcastTrendsData.filter(Boolean);
            dispatch(setNowcastTrendsData(validNowcastTrendsData));
            updateLoadingState('nowcastTrends', false);
        } catch (error) {
            console.error('Error fetching nowcast trends data:', error);
            updateLoadingState('nowcastTrends', false);
        }
    };

    const fetchThresholdsData = async () => {
        try {
            const thresholdsData = await d3.csv('/data/thresholds.csv');
            const parsedThresholdsData = thresholdsData.map((d) => ({
                location: d.Location, medium: +d.Medium, high: +d.High, veryHigh: +d["Very High"],
            }));
            dispatch(setStateThresholdsData(parsedThresholdsData));
            updateLoadingState('thresholds', false);
        } catch (error) {
            console.error('Error fetching thresholds data:', error);
            updateLoadingState('thresholds', false);
        }
    };

    const fetchHistoricalGroundTruthData = async () => {
        try {
            const startDate = parseISO('2023-09-23T12:00:00Z');
            const endDate = parseISO('2024-04-27T12:00:00Z');
            const historicalData = [];

            for (let date = startDate; date <= endDate; date = addWeeks(date, 1)) {
                const fileName = `target-hospital-admissions_${format(date, 'yyyy-MM-dd')}.csv`;
                const filePath = `/data/ground-truth/historical-data/${fileName}`;

                try {
                    const fileContent = await d3.csv(filePath);
                    historicalData.push({
                        associatedDate: date, historicalData: fileContent.map(record => ({
                            date: parseISO(record.date),
                            stateNum: record.location ?? record['location'],
                            stateName: record.location_name ?? record['location_name'],
                            admissions: +(record.value ?? record['value']),
                            weeklyRate: +(record.weekly_rate ?? record['weekly_rate']),
                        }))
                    });
                } catch (error) {
                    console.warn(`File not found or error parsing: ${fileName}`, error);
                }
            }
            dispatch(setHistoricalGroundTruthData(historicalData));
            updateLoadingState('historicalGroundTruth', false);
        } catch (error) {
            console.error('Error fetching historical ground truth data:', error);
            updateLoadingState('historicalGroundTruth', false);
        }
    };

    const isFullyLoaded = Object.values(loadingStates).every(state => !state);

    function addBackEmptyDatesWithPrediction(groundTruthData: DataPoint[], predictionsData: ModelPrediction[], locationData: LocationData[]): ProcessedDataWithDateRange {
        let earliestDate = new Date(8640000000000000); // Max date
        let latestDate = new Date(-8640000000000000); // Min date

        // Find earliest and latest dates
        groundTruthData.forEach(d => {
            if (d.date < earliestDate) earliestDate = d.date;
            if (d.date > latestDate) latestDate = d.date;
        });

        predictionsData.forEach(model => {
            model.predictionData.forEach(d => {
                if (d.referenceDate < earliestDate) earliestDate = d.referenceDate;
                if (d.targetEndDate > latestDate) latestDate = d.targetEndDate;
            });
        });

        // Generate all Saturdays between earliest and latest dates
        const allSaturdays = eachWeekOfInterval({
            start: startOfWeek(earliestDate, {weekStartsOn: 6}),
            end: endOfWeek(latestDate, {weekStartsOn: 6})
        }, {weekStartsOn: 6});

        // Create a map of existing data points
        const existingDataMap = new Map(groundTruthData.map(d => [format(d.date, 'yyyy-MM-dd'), d]));

        // Create placeholder data for missing dates
        const placeholderData: DataPoint[] = [];

        allSaturdays.forEach(date => {
            const dateString = format(date, 'yyyy-MM-dd');
            if (!existingDataMap.has(dateString)) {
                locationData.forEach(location => {
                    placeholderData.push({
                        date, stateNum: location.stateNum, stateName: location.stateName, admissions: -1, weeklyRate: 0
                    });
                });
            }
        });

        // Combine existing and placeholder data, sort them by date
        const combinedData = [...groundTruthData, ...placeholderData];
        const sortedData = combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Sort the combined data by date
        return {
            data: sortedData, earliestDate, latestDate
        };
    }

    function generateSeasonOptions(processedData: ProcessedDataWithDateRange): SeasonOption[] {
        const options: SeasonOption[] = [];
        const {earliestDate, latestDate} = processedData;

        if (!earliestDate || !latestDate) {
            return options;
        }

        const getSeasonEnd = (year: number) => setDate(setMonth(new Date(year, 0, 1), 6), 31); // July 31st
        const getSeasonStart = (year: number) => setDate(setMonth(new Date(year - 1, 0, 1), 7), 1); // August 1st of previous year

        let currentYear = getYear(latestDate);
        let currentSeasonEnd = getSeasonEnd(currentYear);
        let optionIndex = 0;

        // Handle the case where latestDate is after July 31st of the current year
        if (isAfter(latestDate, currentSeasonEnd)) {
            const nextSeasonStart = getSeasonStart(currentYear + 1);
            options.push({
                index: optionIndex++,
                displayString: `${currentYear}-${currentYear + 1} (Ongoing)`,
                timeValue: `${format(nextSeasonStart, 'yyyy-MM-dd')}/${format(latestDate, 'yyyy-MM-dd')}`,
                startDate: nextSeasonStart,
                endDate: latestDate
            });
        }

        while (isAfter(currentSeasonEnd, earliestDate) || isSameDay(currentSeasonEnd, earliestDate)) {
            const seasonStart = getSeasonStart(currentYear);
            const adjustedStart = isBefore(seasonStart, earliestDate) ? earliestDate : seasonStart;
            const adjustedEnd = isBefore(latestDate, currentSeasonEnd) ? latestDate : currentSeasonEnd;

            let displayString = `${currentYear - 1}-${currentYear}`;
            if (isSameDay(adjustedEnd, latestDate) && isBefore(latestDate, currentSeasonEnd)) {
                displayString += " (Ongoing)";
            } else if (isSameDay(adjustedStart, earliestDate) && isAfter(earliestDate, seasonStart)) {
                displayString = `Partial ${displayString}`;
            }

            options.push({
                index: optionIndex++,
                displayString,
                timeValue: `${format(adjustedStart, 'yyyy-MM-dd')}/${format(adjustedEnd, 'yyyy-MM-dd')}`,
                startDate: adjustedStart,
                endDate: adjustedEnd
            });

            currentYear--;
            currentSeasonEnd = getSeasonEnd(currentYear);
        }

        return options.reverse();
    }

    return (
        <div className="layout-grid-forecasts-page w-full h-full pl-4">
        <div className="nowcast-header">
            <NowcastHeader/>
        </div>
        {!loadingStates.groundTruth && !loadingStates.thresholds && (<div className="nowcast-thermo">
            <NowcastStateThermo/>
        </div>)}
        <div className="vertical-separator">
            <svg width="100%" height="100%">
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#5d636a" strokeWidth="1"/>
            </svg>
        </div>
        {!loadingStates.groundTruth && !loadingStates.thresholds && (<div className="nowcast-gauge">
            <NowcastGauge riskLevel="US"/>
            {/*<NowcastGaugeOval riskLevel="US"/>*/}
        </div>)}
        {!loadingStates.locations && (<div className="settings-panel">
            <SettingsPanel/>
        </div>)}
        <div className="horizontal-separator">
            <svg width="100%" height="100%">
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#5d636a" strokeWidth="1"/>
            </svg>
        </div>
        {!loadingStates.groundTruth && !loadingStates.predictions && (<>
            <div className="chart-header">
                <ForecastChartHeader/>
            </div>
            <div className="forecast-graph">
                <ForecastChart/>
            </div>
        </>)}
        {!isFullyLoaded && (<div className="loading-indicator">
            Loading remaining data...
        </div>)}
    </div>);
}

export default Page;
