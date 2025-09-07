// src/store/selectors/singleModelSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { addWeeks } from "date-fns";

// Selector for core data loading status
export const selectIsCoreDataLoaded = (state: RootState) => state.coreData.isLoaded;

// Helper function to calculate display time range based on metadata and horizon
function calculateDisplayTimeRange(
  firstPredRefDate: string | undefined,
  lastPredRefDate: string | undefined,
  horizon: number
): { startDate: Date; endDate: Date } | null {
  if (!firstPredRefDate || !lastPredRefDate) {
    console.debug("Missing metadata dates for time range calculation");
    return null;
  }

  const startDate = new Date(firstPredRefDate);
  const baseEndDate = new Date(lastPredRefDate);
  // Extend end date by horizon weeks to show forecast-tail predictions
  const endDate = addWeeks(baseEndDate, horizon);

  return { startDate, endDate };
}

// Main selector for time series data
export const selectSingleModelTimeSeriesData = createSelector(
  [
    (state: RootState) => state.coreData.isLoaded,
    (state: RootState) => state.coreData.mainData?.predictionData,
    (state: RootState) => state.coreData.mainData?.groundTruthData,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewSeasonId, // <-- Use seasonId
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewModel,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewSelectedStateCode,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationSingleModelViewHorizon,
  ],
  (isLoaded, predictionData, groundTruthData, seasonId, modelName, stateCode, horizon) => {
    // <-- Use seasonId
    if (!isLoaded || !predictionData || !groundTruthData || !seasonId || !modelName) {
      // <-- Use seasonId
      return {
        data: [],
        metadata: {
          firstPredRefDate: null,
          lastPredRefDate: null,
          lastPredTargetDate: null,
          displayStartDate: new Date(),
          displayEndDate: new Date(),
        },
      };
    }

    const seasonData = predictionData[seasonId];
    if (!seasonData) {
      console.warn("No data for season:", seasonId);
      return {
        data: [],
        metadata: {
          firstPredRefDate: null,
          lastPredRefDate: null,
          lastPredTargetDate: null,
          displayStartDate: new Date(),
          displayEndDate: new Date(),
        },
      };
    }

    const modelData = seasonData[modelName];
    if (!modelData) {
      console.warn("No data for model in season:", modelName, seasonId);
      return {
        data: [],
        metadata: {
          firstPredRefDate: null,
          lastPredRefDate: null,
          lastPredTargetDate: null,
          displayStartDate: new Date(),
          displayEndDate: new Date(),
        },
      };
    }

    // Calculate display time range based on metadata
    const timeRange = calculateDisplayTimeRange(modelData.firstPredRefDate, modelData.lastPredRefDate, horizon);

    if (!timeRange) {
      console.error("Could not calculate display time range");
      return {
        data: [],
        metadata: {
          firstPredRefDate: null,
          lastPredRefDate: null,
          lastPredTargetDate: null,
          displayStartDate: new Date(),
          displayEndDate: new Date(),
        },
      };
    }

    const combinedData = combinePartitionsForStateAndHorizon(
      modelData.partitions,
      groundTruthData[seasonId],
      stateCode,
      horizon,
      timeRange.startDate,
      timeRange.endDate
    );

    return {
      data: combinedData,
      metadata: {
        firstPredRefDate: modelData.firstPredRefDate ? new Date(modelData.firstPredRefDate) : null,
        lastPredRefDate: modelData.lastPredRefDate ? new Date(modelData.lastPredRefDate) : null,
        lastPredTargetDate: modelData.lastPredTargetDate ? new Date(modelData.lastPredTargetDate) : null,
        displayStartDate: timeRange.startDate,
        displayEndDate: timeRange.endDate,
      },
    };
  }
);

// Selector for evaluation scores from JSON that syncs with time series data
export const selectSingleModelScoreDataFromJSON = createSelector(
  [
    (state: RootState) => state.evaluationData.rawScores,
    (state: RootState) => state.coreData.mainData?.predictionData,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewSeasonId, // <-- Use seasonId
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewModel,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewSelectedStateCode,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationSingleModelViewHorizon,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationSingleModelViewScoresOption,
  ],
  (rawScores, timeSeriesData, seasonId, modelName, stateCode, horizon, scoreOption) => {
    // <-- Use seasonId
    if (!rawScores || !timeSeriesData || !seasonId || !modelName) {
      // <-- Use seasonId
      console.debug("Missing required data for score selector");
      return [];
    }

    if (!rawScores[seasonId]) {
      console.debug("No score data for season:", seasonId);
      return [];
    }

    // Get the same time range calculation as time series data
    const modelData = timeSeriesData[seasonId]?.[modelName];
    if (!modelData) {
      console.debug("No model data for time range calculation");
      return [];
    }

    const timeRange = calculateDisplayTimeRange(modelData.firstPredRefDate, modelData.lastPredRefDate, horizon);

    if (!timeRange) {
      console.debug("Could not calculate time range for scores");
      return [];
    }

    const metric = scoreOption === "WIS/Baseline" ? "WIS/Baseline" : "MAPE";

    // Navigate the nested structure
    const scoreData = rawScores[seasonId]?.[metric]?.[modelName]?.[stateCode]?.[horizon];

    if (!scoreData || !Array.isArray(scoreData)) {
      return [];
    }

    console.debug("Found score data entries:", scoreData);

    // Filter scores to match the time range
    const filteredScores = scoreData.filter((entry) => {
      const targetDate = new Date(entry.targetEndDate);
      const isInRange = targetDate >= timeRange.startDate && targetDate <= timeRange.endDate;

      if (!isInRange) {
        console.debug("Filtering out score entry outside time range:", {
          targetDate: entry.targetEndDate,
          timeRange,
        });
      }

      return isInRange;
    });

    // Convert ISO strings back to Date objects for the component
    return filteredScores.map((entry) => ({
      referenceDate: new Date(entry.referenceDate),
      targetEndDate: new Date(entry.targetEndDate),
      score: entry.score,
    }));
  }
);

// Fixed function to combine full-forecast partition with needed forecast-tail weeks
function combinePartitionsForStateAndHorizon(
  partitions: any,
  groundTruth: any,
  stateCode: string,
  horizon: number,
  displayStartDate: Date,
  displayEndDate: Date
): any[] {
  if (!partitions) {
    console.warn("No partitions available");
    return [];
  }

  const result = [];

  const allPartitions = ["full-forecast", "forecast-tail"];

  for (const partitionName of allPartitions) {
    const partition = partitions[partitionName];
    if (!partition) {
      console.debug(`No ${partitionName} partition available`);
      continue;
    }

    for (const [referenceDateISO, statesData] of Object.entries(partition)) {
      if (!statesData || typeof statesData !== "object") continue;

      const stateData = (statesData as any)[stateCode];
      if (!stateData) continue;

      const refDate = new Date(referenceDateISO);

      // Check if reference date is within our display range
      if (refDate < displayStartDate || refDate > displayEndDate) {
        continue;
      }

      // Create data point structure
      const dataPoint: any = {
        referenceDate: refDate,
        groundTruth: null,
        prediction: null,
      };

      // Add ground truth from centralized collection if available
      const groundTruthData = groundTruth[referenceDateISO]?.[stateCode];
      if (groundTruthData && groundTruthData.admissions >= 0) {
        dataPoint.groundTruth = {
          admissions: groundTruthData.admissions,
          weeklyRate: groundTruthData.weeklyRate,
        };
      }

      // Look for predictions that match our horizon
      if (stateData.predictions) {
        for (const [targetDateISO, predData] of Object.entries(stateData.predictions)) {
          if (typeof predData !== "object") continue;
          if (!predData) continue;

          const targetDate = new Date(targetDateISO);

          const predDataTyped = predData as any;
          // Check if this prediction matches our horizon and is within display range
          if (predDataTyped.horizon === horizon && targetDate >= displayStartDate && targetDate <= displayEndDate) {
            // For horizon plot, we position the prediction at its target date
            const predictionPoint = {
              referenceDate: targetDate, // Use target date for x-axis positioning
              groundTruth: null, // Don't show ground truth at prediction position
              prediction: {
                targetDate: targetDate,
                horizon: predDataTyped.horizon,
                median: predDataTyped.median,
                q05: predDataTyped.q05,
                q25: predDataTyped.q25,
                q75: predDataTyped.q75,
                q95: predDataTyped.q95,
              },
            };

            result.push(predictionPoint);
            break; // Only one prediction per reference date for this horizon
          }
        }
      }

      // Add ground truth point if we have it (positioned at reference date)
      if (dataPoint.groundTruth) {
        result.push(dataPoint);
      }
    }
  }

  // Sort by display date and remove duplicates
  const uniqueResults = new Map();
  result.forEach((point) => {
    const key = `${point.referenceDate.toISOString()}-${point.prediction ? "pred" : "gt"}`;
    if (!uniqueResults.has(key) || point.prediction) {
      uniqueResults.set(key, point);
    }
  });

  const finalResult = Array.from(uniqueResults.values()).sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());

  return finalResult;
}
