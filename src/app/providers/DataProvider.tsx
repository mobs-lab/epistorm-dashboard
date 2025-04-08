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
    evaluationDetailedCoverage: true
  });
  const [dataFetchStarted, setDataFetchStarted] = useState(false);

  // Move all your existing data-slices fetching functions here
  // (addBackEmptyDatesWithPrediction, generateSeasonOptions, etc.)

  const safeCSVFetch = async (url: string) => {
    try {
      return await d3.csv(url);
    } catch (error) {
      console.warn(`File not found or error parsing: ${url}`);
      return null;
    }
  };

  const addBackEmptyDatesWithPrediction = (
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
  };

  const generateSeasonOptions = (processedData: ProcessedDataWithDateRange): SeasonOption[] => {
    const options: SeasonOption[] = [];
    const { earliestDate, latestDate } = processedData;

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
  };

  const fetchAndProcessData = async () => {
    if (dataFetchStarted) return;
    setDataFetchStarted(true);

    try {
      {
        // Fetch location data-slices first as it's needed for processing ground truth data-slices
        const locationData = await d3.csv("/data/locations.csv");
        const parsedLocationData = locationData.map((d) => ({
          stateNum: d.location,
          state: d.abbreviation,
          stateName: d.location_name,
          population: +d.population,
        }));
        dispatch(setLocationData(parsedLocationData));
        updateLoadingState("locations", false);

        // Fetch ground truth and predictions data-slices
        const groundTruthData = await d3.csv("/data/ground-truth/target-hospital-admissions.csv");
        const parsedGroundTruthData: DataPoint[] = groundTruthData.map((d) => ({
          date: parseISO(d.date),
          stateNum: d.location,
          stateName: d.location_name,
          admissions: +d.value,
          weeklyRate: +d["weekly_rate"],
        }));

        // console.debug("DataProvider: latestValidSurveillanceDate: ", latestValidSurveillanceDate);

        /*  Keep track of latest valid prediction data-slices point's date info
            NOTE: extract from all avaialble models because that is the initialized default 
            (See `src/app/store/forecast-settings-slice.ts`)
        */
        const predictionsData = await Promise.all(
          modelNames.map(async (team_model) => {
            const newPredictions = await safeCSVFetch(`/data/processed/${team_model}/predictions.csv`);
            const oldPredictions = await safeCSVFetch(`/data/processed/${team_model}/predictions_older.csv`);

            if (!newPredictions && !oldPredictions) {
              console.warn(`No prediction data found for model: ${team_model}`);
              return { modelName: team_model, predictionData: [] };
            }

            const predictionData: PredictionDataPoint[] = [...(newPredictions || []), ...(oldPredictions || [])].map((d) => ({
              referenceDate: parseISO(d.reference_date),
              targetEndDate: parseISO(d.target_end_date),
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
            }));

            return { modelName: team_model, predictionData: predictionData };
          })
        );

        // Find latest valid surveillance date
        const latestValidSurveillanceDate = parsedGroundTruthData.reduce(
          (latest, current) => (isAfter(current.date, latest.date) ? current : latest),
          { date: new Date(0) } as DataPoint
        ).date;

        // Find latest reference date across all models
        const latestValidPredictionDate = predictionsData.reduce((latestDate, model) => {
          if (!model.predictionData.length) return latestDate;
          const modelLatestRef = model.predictionData.reduce(
            (latest, pred) => (isAfter(pred.referenceDate, latest) ? pred.referenceDate : latest),
            new Date(0)
          );
          return isAfter(modelLatestRef, latestDate) ? modelLatestRef : latestDate;
        }, new Date(0));

        // Use the later date between prediction and surveillance
        const latestValidReferenceDate = isBefore(latestValidPredictionDate, latestValidSurveillanceDate)
          ? latestValidPredictionDate
          : latestValidSurveillanceDate;

        // Calculate dynamic periods
        // See the calculation documentation for why its 1,3,7
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
        console.debug("Data Provider: generated dynamic season overview periods:", dynamicPeriods);

        // Initialize dynamic date ranges for Season Overview
        dispatch(
          updateDynamicPeriods({
            latestReferenceDate: latestValidReferenceDate,
            dynamicPeriods,
          })
        );

        const mostRecentDate = isAfter(latestValidPredictionDate, latestValidSurveillanceDate)
          ? latestValidPredictionDate
          : latestValidSurveillanceDate;

        // Update user selected week to the most recent valid date
        dispatch(updateUserSelectedWeek(mostRecentDate));

        const processedData = addBackEmptyDatesWithPrediction(parsedGroundTruthData, predictionsData, parsedLocationData);

        dispatch(setGroundTruthData(processedData.data));
        updateLoadingState("groundTruth", false);

        dispatch(setPredictionsData(predictionsData));
        updateLoadingState("predictions", false);

        const seasonOptions = generateSeasonOptions(processedData);
        dispatch(setSeasonOptions(seasonOptions));
        dispatch(updateEvaluationSingleModelViewSeasonOptions(seasonOptions));
        if (seasonOptions.length > 0) {
          const lastSeason = seasonOptions[seasonOptions.length - 1];

          /* For Forecast Page components */
          dispatch(updateDateRange(lastSeason.timeValue));
          dispatch(updateDateStart(lastSeason.startDate));
          dispatch(updateDateEnd(lastSeason.endDate));

          /* For Evaluations Single Model View components */
          dispatch(updateEvaluationsSingleModelViewDateRange(lastSeason.timeValue));
          dispatch(updateEvaluationSingleModelViewDateStart(lastSeason.startDate));
          dispatch(updateEvaluationSingleModelViewDateEnd(lastSeason.endDate));
        }
        updateLoadingState("seasonOptions", false);

        // Fetch other data-slices in parallel
        await Promise.all([fetchNowcastTrendsData(), fetchThresholdsData(), fetchHistoricalGroundTruthData(), fetchEvaluationsScoreData()]);
      }
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
      const nowcastTrendsData = await Promise.all(
        modelNames.map(async (modelName) => {
          const response = await safeCSVFetch(`/data/processed/${modelName}/nowcast_trends.csv`);
          if (!response) {
            return { modelName, data: [] };
          }
          const responseParsed = response.map((d) => ({
            location: d.location,
            reference_date: parseISO(d.reference_date),
            decrease: +d.decrease,
            increase: +d.increase,
            stable: +d.stable,
          }));
          return { modelName, data: responseParsed };
        })
      );
      dispatch(setNowcastTrendsData(nowcastTrendsData));
      updateLoadingState("nowcastTrends", false);
    } catch (error) {
      console.error("Error fetching nowcast trends data-slices:", error);
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

      // Process MAPE data-slices - Note the capital L in Location
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
          coverage10: +entry["10_cov"],
          coverage20: +entry["20_cov"],
          coverage30: +entry["30_cov"],
          coverage40: +entry["40_cov"],
          coverage50: +entry["50_cov"],
          coverage60: +entry["60_cov"],
          coverage70: +entry["70_cov"],
          coverage80: +entry["80_cov"],
          coverage90: +entry["90_cov"],
          coverage95: +entry["95_cov"],
          coverage98: +entry["98_cov"],
        };

        // Create simplified score data entry, for compatibility with WIS and MAPE
        const scoreData = {
          referenceDate: parseISO(entry.reference_date),
          score: +entry["95_cov"],
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

      //TODO: Store detailed coverage data in a separate store action when implementing PI chart

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
