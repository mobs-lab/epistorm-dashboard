'use client'

// File: src/app/providers/DataProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
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
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useAppDispatch } from "@/store/hooks";
import {
  DataPoint,
  LocationData,
  ModelPrediction,
  PredictionDataPoint,
  SeasonOption,
  LoadingStates,
  ProcessedDataWithDateRange,
  EvaluationsScoreDataCollection,
  CoverageScoreData,
  DetailedCoverageCollection,
} from "@/interfaces/forecast-interfaces";
import { modelNames } from "@/interfaces/epistorm-constants";

// Forecast Actions and Reducers
import { setGroundTruthData } from "@/store/data-slices/groundTruthSlice";
import { setPredictionsData } from "@/store/data-slices/predictionsSlice";
import { setLocationData } from "@/store/data-slices/locationSlice";
import { setNowcastTrendsData } from "@/store/data-slices/nowcastTrendsSlice";
import { setStateThresholdsData } from "@/store/data-slices/stateThresholdsSlice";
import { setHistoricalGroundTruthData } from "@/store/data-slices/historicalGroundTruthSlice";
import { setSeasonOptions, updateDateEnd, updateDateRange, updateDateStart, updateUserSelectedWeek } from "@/store/forecast-settings-slice";

// Evaluations Actions and Reducers
import { setDetailedCoverageData, setEvaluationsSingleModelScoreData } from "@/store/data-slices/evaluationsScoreDataSlice";
import {
  updateEvaluationSingleModelViewDateStart,
  updateEvaluationSingleModelViewDateEnd,
  updateEvaluationsSingleModelViewDateRange,
  updateEvaluationSingleModelViewSeasonOptions,
} from "@/store//evaluations-single-model-settings-slice";
import { updateDynamicPeriods } from "@/store/evaluations-season-overview-settings-slice";

interface DataContextType {
  loadingStates: LoadingStates;
  isFullyLoaded: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    evaluationScores: true,
    groundTruth: true,
    predictions: true,
    locations: true,
    nowcastTrends: true,
    thresholds: true,
    historicalGroundTruth: true,
    seasonOptions: true,
    evaluationDetailedCoverage: true,
  });
  const [dataFetchStarted, setDataFetchStarted] = useState(false);

  const safeCSVFetch = async (url: string) => {
    try {
      return await d3.csv(url);
    } catch (error) {
      console.warn(`File not found or error parsing: ${url}`);
      return null;
    }
  };

  /* const addBackEmptyDatesWithPrediction = (
    groundTruthData: DataPoint[],
    predictionsData: ModelPrediction[],
    locationData: LocationData[]
  ): ProcessedDataWithDateRange => {

    let earliestDate = new Date(8640000000000000);
    let latestDate = new Date(0);

    groundTruthData.forEach((d) => {
      if (d.date < earliestDate) earliestDate = d.date;
      if (d.date > latestDate) latestDate = d.date;
    });

    predictionsData.forEach((model) => {
      model.predictionData.forEach((d) => {
        if (d.referenceDate < earliestDate) earliestDate = d.referenceDate;
        if (d.targetEndDate > latestDate) latestDate = d.targetEndDate;
      });
    });

    const allSaturdays = eachWeekOfInterval(
      {
        start: startOfWeek(earliestDate, { weekStartsOn: 6 }),
        end: endOfWeek(latestDate, { weekStartsOn: 6 }),
      },
      { weekStartsOn: 6 }
    );

    const existingDataMap = new Map(groundTruthData.map((d) => [format(d.date, "yyyy-MM-dd"), d]));
    const placeholderData: DataPoint[] = [];

    allSaturdays.forEach((date) => {
      const dateString = format(date, "yyyy-MM-dd");
      if (!existingDataMap.has(dateString)) {
        locationData.forEach((location) => {
          placeholderData.push({
            date,
            stateNum: location.stateNum,
            stateName: location.stateName,
            admissions: -1,
            weeklyRate: 0,
          });
        });
      }
    });

    const combinedData = [...groundTruthData, ...placeholderData].sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      data: combinedData,
      earliestDate,
      latestDate,
    };
  }; */

  // Optimized version of generateSeasonOptions that doesn't re-iterate through the data
  function generateSeasonOptionsOptimized(earliestDate: Date, latestDate: Date, groundTruthData: DataPoint[]): SeasonOption[] {
    const options: SeasonOption[] = [];

    if (!earliestDate || !latestDate) {
      return options;
    }

    const getSeasonEnd = (year: number) => setDate(setMonth(new Date(year, 0, 1), 6), 31);
    const getSeasonStart = (year: number) => setDate(setMonth(new Date(year - 1, 0, 1), 7), 1);

    let currentYear = getYear(latestDate);
    let currentSeasonEnd = getSeasonEnd(currentYear);
    let optionIndex = 0;

    if (isAfter(latestDate, currentSeasonEnd)) {
      const nextSeasonStart = getSeasonStart(currentYear + 1);
      options.push({
        index: optionIndex++,
        displayString: `${currentYear}-${currentYear + 1} (Ongoing)`,
        timeValue: `${format(nextSeasonStart, "yyyy-MM-dd")}/${format(latestDate, "yyyy-MM-dd")}`,
        startDate: nextSeasonStart,
        endDate: latestDate,
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
        timeValue: `${format(adjustedStart, "yyyy-MM-dd")}/${format(adjustedEnd, "yyyy-MM-dd")}`,
        startDate: adjustedStart,
        endDate: adjustedEnd,
      });

      currentYear--;
      currentSeasonEnd = getSeasonEnd(currentYear);
    }

    return options.reverse();
  }

  const fetchAndProcessData = async () => {
    if (dataFetchStarted) return;
    setDataFetchStarted(true);

    try {
      // Start with location data first
      const locationData = await d3.csv("/data/locations.csv");
      const parsedLocationData = locationData.map((d) => ({
        stateNum: d.location,
        state: d.abbreviation,
        stateName: d.location_name,
        population: +d.population,
      }));
      dispatch(setLocationData(parsedLocationData));
      updateLoadingState("locations", false);

      // Prepare data structures to track everything in a single pass
      const dateInfo = {
        earliestGroundTruthDate: new Date(8640000000000000),
        latestGroundTruthDate: new Date(0),
        earliestPredictionDate: new Date(8640000000000000),
        latestPredictionDate: new Date(0),
        latestValidPredictionRefDate: new Date(0),
        latestValidSurveillanceDate: new Date(0),
        allDates: new Set<string>(), // All unique dates in ISO format
      };

      // Maps for efficient lookups
      const groundTruthByDate = new Map<string, DataPoint[]>(); // Group points by date
      const allParsedGroundTruth: DataPoint[] = [];

      // 1. Process ground truth data - single pass
      const groundTruthData = await d3.csv("/data/ground-truth/target-hospital-admissions.csv");
      groundTruthData.forEach((d) => {
        const date = parseISO(d.date);
        const dateStr = format(date, "yyyy-MM-dd");

        // Create data point
        const dataPoint: DataPoint = {
          date,
          stateNum: d.location,
          stateName: d.location_name,
          admissions: +d.value,
          weeklyRate: +d["weekly_rate"],
        };

        // Track for min/max date calculations
        if (date < dateInfo.earliestGroundTruthDate) dateInfo.earliestGroundTruthDate = date;
        if (date > dateInfo.latestGroundTruthDate) dateInfo.latestGroundTruthDate = date;

        // Update latest surveillance date if this is valid data
        if (dataPoint.admissions >= 0 && date > dateInfo.latestValidSurveillanceDate) {
          dateInfo.latestValidSurveillanceDate = date;
        }

        // Add to our collections
        dateInfo.allDates.add(dateStr);
        allParsedGroundTruth.push(dataPoint);

        // Group by date for efficient lookups later
        if (!groundTruthByDate.has(dateStr)) {
          groundTruthByDate.set(dateStr, []);
        }
        groundTruthByDate.get(dateStr)!.push(dataPoint);
      });

      // 2. Process prediction data - single pass per model
      const allProcessedPredictions: ModelPrediction[] = [];
      const modelPredictionMap = new Map<string, PredictionDataPoint[]>();

      await Promise.all(
        modelNames.map(async (modelName) => {
          const newPredictions = await safeCSVFetch(`/data/processed/${modelName}/predictions.csv`);
          const oldPredictions = await safeCSVFetch(`/data/processed/${modelName}/predictions_older.csv`);

          if (!newPredictions && !oldPredictions) {
            console.warn(`No prediction data found for model: ${modelName}`);
            modelPredictionMap.set(modelName, []);
            return;
          }

          const predictionData: PredictionDataPoint[] = [];

          // Process all predictions in a single pass
          [...(newPredictions || []), ...(oldPredictions || [])].forEach((d) => {
            const refDate = parseISO(d.reference_date);
            const targetDate = parseISO(d.target_end_date);
            const refDateStr = format(refDate, "yyyy-MM-dd");
            const targetDateStr = format(targetDate, "yyyy-MM-dd");

            // Create prediction data point
            const predPoint: PredictionDataPoint = {
              referenceDate: refDate,
              targetEndDate: targetDate,
              stateNum: d.location,
              confidence025: +d["0.025"],
              confidence050: +d["0.05"],
              confidence250: +d["0.25"],
              confidence500: +d["0.5"],
              confidence750: +d["0.75"],
              confidence950: +d["0.95"],
              confidence975: +d["0.975"],
              confidence_low: +d["0.5"],
              confidence_high: +d["0.5"],
            };

            // Track min/max dates in a single pass
            if (refDate < dateInfo.earliestPredictionDate) dateInfo.earliestPredictionDate = refDate;
            if (targetDate > dateInfo.latestPredictionDate) dateInfo.latestPredictionDate = targetDate;

            // Track latest prediction reference date
            if (refDate > dateInfo.latestValidPredictionRefDate) {
              dateInfo.latestValidPredictionRefDate = refDate;
            }

            // Add to our collections
            dateInfo.allDates.add(refDateStr);
            dateInfo.allDates.add(targetDateStr);
            predictionData.push(predPoint);
          });

          modelPredictionMap.set(modelName, predictionData);
        })
      );

      // Convert modelPredictionMap to array format for redux
      modelNames.forEach((modelName) => {
        allProcessedPredictions.push({
          modelName,
          predictionData: modelPredictionMap.get(modelName) || [],
        });
      });

      // 3. Calculate all derived information in ONE go, no more iterations

      // Overall date range
      const trueEarliestDate = new Date(Math.min(dateInfo.earliestGroundTruthDate.getTime(), dateInfo.earliestPredictionDate.getTime()));

      const trueLatestDate = new Date(Math.max(dateInfo.latestGroundTruthDate.getTime(), dateInfo.latestPredictionDate.getTime()));

      // Latest reference date for seasonal calculations
      const latestValidReferenceDate =
        dateInfo.latestValidPredictionRefDate > dateInfo.latestValidSurveillanceDate
          ? dateInfo.latestValidSurveillanceDate
          : dateInfo.latestValidPredictionRefDate;

      // 4. Generate all required Saturdays in one step (using smarter bounds)
      const startWeek = startOfWeek(trueEarliestDate, { weekStartsOn: 6 });
      const endWeek = endOfWeek(trueLatestDate, { weekStartsOn: 6 });

      const allSaturdays = eachWeekOfInterval({ start: startWeek, end: endWeek }, { weekStartsOn: 6 });

      // 5. Generate placeholders efficiently - Knowing which dates need them
      const combinedGroundTruthData: DataPoint[] = [...allParsedGroundTruth];

      // Only add placeholders for dates that don't have data but are in our Saturday range
      allSaturdays.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");

        // Only create placeholders if we don't have data for this date
        if (!groundTruthByDate.has(dateStr)) {
          parsedLocationData.forEach((location) => {
            combinedGroundTruthData.push({
              date,
              stateNum: location.stateNum,
              stateName: location.stateName,
              admissions: -1,
              weeklyRate: 0,
            });
          });
        }
      });

      // Sort once
      combinedGroundTruthData.sort((a, b) => a.date.getTime() - b.date.getTime());

      // 6. Generate season options without re-iterating
      const seasonOptions = generateSeasonOptionsOptimized(trueEarliestDate, trueLatestDate, combinedGroundTruthData);

      // 7. Calculate dynamic periods ONCE
      const dynamicPeriods = {
        last2Weeks: {
          startDate: subWeeks(latestValidReferenceDate, 1),
          endDate: latestValidReferenceDate,
        },
        last4Weeks: {
          startDate: subWeeks(latestValidReferenceDate, 3),
          endDate: latestValidReferenceDate,
        },
        last8Weeks: {
          startDate: subWeeks(latestValidReferenceDate, 7),
          endDate: latestValidReferenceDate,
        },
      };

      // 8. Dispatch all results

      // Store data
      dispatch(setGroundTruthData(combinedGroundTruthData));
      updateLoadingState("groundTruth", false);

      dispatch(setPredictionsData(allProcessedPredictions));
      updateLoadingState("predictions", false);

      // Dispatch settings and options
      dispatch(setSeasonOptions(seasonOptions));
      dispatch(updateEvaluationSingleModelViewSeasonOptions(seasonOptions));

      // Update dynamic periods for evaluations
      dispatch(
        updateDynamicPeriods({
          dynamicPeriods,
        })
      );

      // Update selected periods
      if (seasonOptions.length > 0) {
        const lastSeason = seasonOptions[seasonOptions.length - 1];

        // Update forecast settings
        dispatch(updateDateRange(lastSeason.timeValue));
        dispatch(updateDateStart(lastSeason.startDate));
        dispatch(updateDateEnd(lastSeason.endDate));

        // Update evaluation settings
        dispatch(updateEvaluationsSingleModelViewDateRange(lastSeason.timeValue));
        dispatch(updateEvaluationSingleModelViewDateStart(lastSeason.startDate));
        dispatch(updateEvaluationSingleModelViewDateEnd(lastSeason.endDate));
      }

      // Set user selected week
      const mostRecentDate =
        dateInfo.latestValidPredictionRefDate > dateInfo.latestValidSurveillanceDate
          ? dateInfo.latestValidPredictionRefDate
          : dateInfo.latestValidSurveillanceDate;
      dispatch(updateUserSelectedWeek(mostRecentDate));

      updateLoadingState("seasonOptions", false);

      // Fetch other data in parallel
      await Promise.all([fetchNowcastTrendsData(), fetchThresholdsData(), fetchHistoricalGroundTruthData(), fetchEvaluationsScoreData()]);
    } catch (error) {
      console.error("Error in fetchAndProcessData:", error);
      // Update loading states to false for error cases
      Object.keys(loadingStates).forEach((key) => {
        updateLoadingState(key as keyof LoadingStates, false);
      });
    }
  };

  const fetchNowcastTrendsData = async () => {
    try {
      // Create a Map to store results by model name
      const nowcastResultsMap = new Map<string, any>();

      // Initialize map with empty data arrays for all models
      modelNames.forEach((modelName) => {
        nowcastResultsMap.set(modelName, { modelName, data: [] });
      });

      // Process data for models that have files
      await Promise.all(
        modelNames.map(async (modelName) => {
          try {
            const response = await safeCSVFetch(`/data/processed/${modelName}/nowcast_trends.csv`);
            if (response) {
              const responseParsed = response.map((d) => ({
                location: d.location,
                reference_date: parseISO(d.reference_date),
                decrease: +d.decrease,
                increase: +d.increase,
                stable: +d.stable,
              }));
              // Update the map entry with actual data
              nowcastResultsMap.set(modelName, { modelName, data: responseParsed });
            }
            // If no response, keep the default empty array we initialized earlier
          } catch (error) {
            console.warn(`Error processing nowcast trends for model ${modelName}:`, error);
            // Keep the default empty array in case of error
          }
        })
      );

      // Convert map back to array, ensuring all models are included
      const nowcastTrendsData = Array.from(nowcastResultsMap.values());

      dispatch(setNowcastTrendsData(nowcastTrendsData));
      updateLoadingState("nowcastTrends", false);
    } catch (error) {
      console.error("Error fetching nowcast trends data:", error);

      // Even in case of overall error, provide empty data for all models
      const fallbackData = modelNames.map((modelName) => ({
        modelName,
        data: [],
      }));

      dispatch(setNowcastTrendsData(fallbackData));
      updateLoadingState("nowcastTrends", false);
    }
  };

  const fetchThresholdsData = async () => {
    try {
      const thresholdsData = await d3.csv("/data/thresholds.csv");
      const parsedThresholdsData = thresholdsData.map((d) => ({
        location: d.Location,
        medium: +d.Medium,
        high: +d.High,
        veryHigh: +d["Very High"],
      }));
      dispatch(setStateThresholdsData(parsedThresholdsData));
      updateLoadingState("thresholds", false);
    } catch (error) {
      console.error("Error fetching thresholds data-slices:", error);
      updateLoadingState("thresholds", false);
    }
  };

  const fetchHistoricalGroundTruthData = async () => {
    try {
      const startDate = parseISO("2023-09-23T12:00:00Z");
      const today = new Date();
      const endDate = addWeeks(today, -1);
      const historicalData = [];

      for (let date = startDate; date <= endDate; date = addWeeks(date, 1)) {
        const fileName = `target-hospital-admissions_${format(date, "yyyy-MM-dd")}.csv`;
        const filePath = `/data/ground-truth/historical-data/${fileName}`;

        try {
          const fileContent = await d3.csv(filePath);
          historicalData.push({
            associatedDate: date,
            historicalData: fileContent
              .map((record) => ({
                date: parseISO(record.date),
                stateNum: record.location ?? record["location"],
                stateName: record.location_name ?? record["location_name"],
                admissions: +(record.value ?? record["value"]),
                weeklyRate: +(record.weekly_rate ?? record["weekly_rate"]),
              }))
              .sort((a, b) => a.date.getTime() - b.date.getTime()),
          });
        } catch (error) {
          console.warn(`File not found or error parsing: ${fileName}`);
        }
      }
      dispatch(setHistoricalGroundTruthData(historicalData));
      updateLoadingState("historicalGroundTruth", false);
    } catch (error) {
      console.error("Error fetching historical ground truth data-slices:", error);
      updateLoadingState("historicalGroundTruth", false);
    }
  };

  /* Fetch the `/public/evaluations-score/` path's `WIS_ratio.csv` and `MAPE.csv` asyncly, then organize them into model and metrics respectively;
   *  WIS_ratio.csv produces EvaluationsScoreDataCollection with scoreMetric as "WIS_Ratio", while MAPE.csv produces "MAPE" respectively;
   *  modelName can be found in each CSV files' entries' 'Model' column;
   * in each score data-slices point, (again, consult the custom interfaces), referenceDate is the date of the score, and score is the actual score value:
   *   - MAPE: the column is literally named 'MAPE'
   *   - WIS_Ratio: the column is literally named 'wis_ratio'
   * Note: I am keeping the number float point precision to as much as possible, until the limit of d3.js' precision, which is 16 digits (?)
   *
   * Then in the end we push the data-slices into store using dispatch(setEvaluationsSingleModelScoreData(data-slices));
   *  */
  const fetchEvaluationsScoreData = async () => {
    try {
      const [wisRatioData, mapeData, coverageData] = await Promise.all([
        d3.csv("/data/evaluations-score/WIS_ratio.csv"),
        d3.csv("/data/evaluations-score/MAPE.csv"),
        d3.csv("/data/evaluations-score/coverage.csv"),
      ]);

      // Process WIS Ratio data-slices
      const wisRatioByModel = new Map<
        string,
        {
          referenceDate: Date;
          score: number;
          location: string;
          horizon: number;
        }[]
      >();

      wisRatioData.forEach((entry) => {
        const modelName = entry.Model;
        // Only process models in our modelNames list
        if (!modelNames.includes(modelName)) return;

        /* Filter out needed models here! */
        const scoreData = {
          referenceDate: parseISO(entry.reference_date),
          score: +entry.wis_ratio,
          location: entry.location,
          horizon: +entry.horizon,
        };

        const key = modelName;
        if (!wisRatioByModel.has(key)) {
          wisRatioByModel.set(key, []);
        }
        wisRatioByModel.get(key)?.push(scoreData);
      });

      // Process MAPE data-slices
      const mapeByModel = new Map<
        string,
        {
          referenceDate: Date;
          score: number;
          location: string;
          horizon: number;
        }[]
      >();
      mapeData.forEach((entry) => {
        const modelName = entry.Model;
        if (!modelNames.includes(modelName)) return;
        const scoreData = {
          referenceDate: parseISO(entry.reference_date),
          score: +entry.MAPE * 100, // This is to make it into a percentage
          location: entry.Location, // Changed from entry.location
          horizon: +entry.horizon,
        };

        const key = modelName;
        if (!mapeByModel.has(key)) {
          mapeByModel.set(key, []);
        }
        mapeByModel.get(key)?.push(scoreData);
      });

      // Process Coverage data
      const coverageByModel = new Map<
        string,
        {
          referenceDate: Date;
          score: number; //This will be the 95% coverage score
          location: string;
          horizon: number;
        }[]
      >();

      // Also store detailed coverage data
      const detailedCoverageByModel = new Map<string, CoverageScoreData[]>();

      coverageData.forEach((entry) => {
        const modelName = entry.Model;

        // Only process models in our modelNames list
        if (!modelNames.includes(modelName)) return;

        // Create detailed coverage data entry
        const detailedCoverageData: CoverageScoreData = {
          referenceDate: parseISO(entry.reference_date),
          location: entry.location,
          horizon: +entry.horizon,
          coverage10: +entry["10_cov"] * 100,
          coverage20: +entry["20_cov"] * 100,
          coverage30: +entry["30_cov"] * 100,
          coverage40: +entry["40_cov"] * 100,
          coverage50: +entry["50_cov"] * 100,
          coverage60: +entry["60_cov"] * 100,
          coverage70: +entry["70_cov"] * 100,
          coverage80: +entry["80_cov"] * 100,
          coverage90: +entry["90_cov"] * 100,
          coverage95: +entry["95_cov"] * 100,
          coverage98: +entry["98_cov"] * 100,
        };

        // Create simplified score data entry, for State-specific Model performance map
        const scoreData = {
          referenceDate: parseISO(entry.reference_date),
          /* TODO: 95 column? Confirmation needed */
          score: +entry["95_cov"] * 100,
          location: entry.location,
          horizon: +entry.horizon,
        };

        // Add to simplified map for use with existing components
        const key = modelName;
        if (!coverageByModel.has(key)) {
          coverageByModel.set(key, []);
        }
        coverageByModel.get(key)?.push(scoreData);

        // Add to detailed map for components that need granular data
        if (!detailedCoverageByModel.has(key)) {
          detailedCoverageByModel.set(key, []);
        }
        detailedCoverageByModel.get(key)?.push(detailedCoverageData);
      });

      // Combine into final format
      const evaluationsData: EvaluationsScoreDataCollection[] = [];

      // Add WIS Ratio data
      wisRatioByModel.forEach((scoreData, modelName) => {
        evaluationsData.push({
          modelName,
          scoreMetric: "WIS/Baseline",
          scoreData: scoreData.sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime()),
        });
      });

      // Add MAPE data
      mapeByModel.forEach((scoreData, modelName) => {
        evaluationsData.push({
          modelName,
          scoreMetric: "MAPE",
          scoreData: scoreData.sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime()),
        });
      });

      // Add Coverage data
      coverageByModel.forEach((scoreData, modelName) => {
        evaluationsData.push({
          modelName,
          scoreMetric: "Coverage", // Use "Coverage" as the metric name
          scoreData: scoreData.sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime()),
        });
      });

      dispatch(setEvaluationsSingleModelScoreData(evaluationsData));
      updateLoadingState("evaluationScores", false);

      // Convert the Map to an array of DetailedCoverageCollection
      const detailedCoverageData: DetailedCoverageCollection[] = [];
      detailedCoverageByModel.forEach((coverageData, modelName) => {
        detailedCoverageData.push({
          modelName,
          coverageData: coverageData.sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime()),
        });
      });

      // Store detailed coverage data in Redux
      dispatch(setDetailedCoverageData(detailedCoverageData));
      updateLoadingState("evaluationDetailedCoverage", false);
    } catch (error) {
      console.error("Error fetching evaluation score data:", error);
      updateLoadingState("evaluationScores", false);
    }
  };

  const updateLoadingState = (key: keyof LoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchAndProcessData();
  }, []);

  const isFullyLoaded = Object.values(loadingStates).every((state) => !state);

  return <DataContext.Provider value={{ loadingStates, isFullyLoaded }}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};
