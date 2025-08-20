// src/store/selectors/singleModelSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { addWeeks } from "date-fns";

// Selector for core data loading status
export const selectIsCoreDataLoaded = (state: RootState) =>
  state.coreData.isLoaded;

// Helper function to calculate display time range based on metadata and horizon
function calculateDisplayTimeRange(
  firstPredRefDate: string | undefined,
  lastPredRefDate: string | undefined,
  horizon: number,
): { startDate: Date; endDate: Date } | null {
  if (!firstPredRefDate || !lastPredRefDate) {
    console.debug("Missing metadata dates for time range calculation");
    return null;
  }

  const startDate = new Date(firstPredRefDate);
  const baseEndDate = new Date(lastPredRefDate);
  // Extend end date by horizon weeks to show forecast-tail predictions
  const endDate = addWeeks(baseEndDate, horizon);

  console.debug("Calculated display time range:", {
    firstPredRefDate,
    lastPredRefDate,
    horizon,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  return { startDate, endDate };
}

// Main selector for time series data
export const selectSingleModelTimeSeriesData = createSelector(
  [
    (state: RootState) => state.coreData.isLoaded,
    (state: RootState) => state.coreData.mainData?.timeSeriesData,
    (state: RootState) =>
      state.evaluationsSingleModelSettings.evaluationsSingleModelViewDateRange,
    (state: RootState) =>
      state.evaluationsSingleModelSettings.evaluationsSingleModelViewModel,
    (state: RootState) =>
      state.evaluationsSingleModelSettings
        .evaluationsSingleModelViewSelectedStateCode,
    (state: RootState) =>
      state.evaluationsSingleModelSettings.evaluationSingleModelViewHorizon,
  ],
  (isLoaded, timeSeriesData, dateRange, modelName, stateCode, horizon) => {
    if (!isLoaded || !timeSeriesData || !dateRange || !modelName) {
      console.debug("Missing required data for time series selector", {
        isLoaded,
        hasTimeSeriesData: !!timeSeriesData,
        dateRange,
        modelName,
      });
      return null;
    }

    const seasonId = mapDateRangeToSeasonId(dateRange);
    if (!seasonId) {
      console.warn("Could not map date range to season ID:", dateRange);
      return null;
    }

    const seasonData = timeSeriesData[seasonId];
    if (!seasonData) {
      console.warn("No data for season:", seasonId);
      return null;
    }

    const modelData = seasonData[modelName];
    if (!modelData) {
      console.warn("No data for model in season:", modelName, seasonId);
      return null;
    }

    // Calculate display time range based on metadata
    const timeRange = calculateDisplayTimeRange(
      modelData.firstPredRefDate,
      modelData.lastPredRefDate,
      horizon,
    );

    if (!timeRange) {
      console.warn("Could not calculate display time range");
      return null;
    }

    console.debug("Processing time series data for:", {
      modelName,
      stateCode,
      horizon,
      timeRange,
    });

    const combinedData = combinePartitionsForStateAndHorizon(
      modelData.partitions,
      stateCode,
      horizon,
      timeRange.startDate,
      timeRange.endDate,
    );

    return {
      data: combinedData,
      metadata: {
        firstPredRefDate: modelData.firstPredRefDate
          ? new Date(modelData.firstPredRefDate)
          : null,
        lastPredRefDate: modelData.lastPredRefDate
          ? new Date(modelData.lastPredRefDate)
          : null,
        lastPredTargetDate: modelData.lastPredTargetDate
          ? new Date(modelData.lastPredTargetDate)
          : null,
        displayStartDate: timeRange.startDate,
        displayEndDate: timeRange.endDate,
      },
    };
  },
);

// Selector for evaluation scores from JSON that syncs with time series data
export const selectSingleModelScoreDataFromJSON = createSelector(
  [
    (state: RootState) => state.evaluationData.rawScores,
    (state: RootState) => state.coreData.mainData?.timeSeriesData,
    (state: RootState) =>
      state.evaluationsSingleModelSettings.evaluationsSingleModelViewDateRange,
    (state: RootState) =>
      state.evaluationsSingleModelSettings.evaluationsSingleModelViewModel,
    (state: RootState) =>
      state.evaluationsSingleModelSettings
        .evaluationsSingleModelViewSelectedStateCode,
    (state: RootState) =>
      state.evaluationsSingleModelSettings.evaluationSingleModelViewHorizon,
    (state: RootState) =>
      state.evaluationsSingleModelSettings
        .evaluationSingleModelViewScoresOption,
  ],
  (
    rawScores,
    timeSeriesData,
    dateRange,
    modelName,
    stateCode,
    horizon,
    scoreOption,
  ) => {
    if (!rawScores || !timeSeriesData || !dateRange || !modelName) {
      console.debug("Missing required data for score selector");
      return null;
    }

    const seasonId = mapDateRangeToSeasonId(dateRange);
    if (!seasonId || !rawScores[seasonId]) {
      console.debug("No score data for season:", seasonId);
      return null;
    }

    // Get the same time range calculation as time series data
    const modelData = timeSeriesData[seasonId]?.[modelName];
    if (!modelData) {
      console.debug("No model data for time range calculation");
      return null;
    }

    const timeRange = calculateDisplayTimeRange(
      modelData.firstPredRefDate,
      modelData.lastPredRefDate,
      horizon,
    );

    if (!timeRange) {
      console.debug("Could not calculate time range for scores");
      return null;
    }

    const metric = scoreOption === "WIS/Baseline" ? "WIS_ratio" : "MAPE";

    // Navigate the nested structure
    const scoreData =
      rawScores[seasonId]?.[metric]?.[modelName]?.[stateCode]?.[horizon];

    if (!scoreData || !Array.isArray(scoreData)) {
      console.debug("No score data found for:", {
        seasonId,
        metric,
        modelName,
        stateCode,
        horizon,
      });
      return null;
    }

    console.debug("Found score data entries:", scoreData);

    // Filter scores to match the time range
    const filteredScores = scoreData.filter((entry) => {
      const targetDate = new Date(entry.targetEndDate);
      const isInRange =
        targetDate >= timeRange.startDate && targetDate <= timeRange.endDate;

      if (!isInRange) {
        console.debug("Filtering out score entry outside time range:", {
          targetDate: entry.targetEndDate,
          timeRange,
        });
      }

      return isInRange;
    });

    console.debug("Filtered score data entries:", filteredScores.length);

    // Convert ISO strings back to Date objects for the component
    return filteredScores.map((entry) => ({
      referenceDate: new Date(entry.referenceDate),
      targetEndDate: new Date(entry.targetEndDate),
      score: entry.score,
    }));
  },
);

// Corrected helper function to map date range to season ID
function mapDateRangeToSeasonId(dateRange: string): string | null {
  // Handle dynamic periods first
  if (dateRange.includes("last") || dateRange.includes("week")) {
    // Extract the number of weeks from the date range
    if (dateRange.includes("2") || dateRange.includes("two"))
      return "last-2-weeks";
    if (dateRange.includes("4") || dateRange.includes("four"))
      return "last-4-weeks";
    if (dateRange.includes("8") || dateRange.includes("eight"))
      return "last-8-weeks";
  }

  // Parse static season from date range
  const [startStr] = dateRange.split("/");
  if (!startStr) return null;

  const startYear = parseInt(startStr.substring(0, 4));
  const startMonth = parseInt(startStr.substring(5, 7));

  if (isNaN(startYear) || isNaN(startMonth)) return null;

  // Determine season based on start month
  if (startMonth >= 8) {
    return `season-${startYear}-${startYear + 1}`;
  } else {
    return `season-${startYear - 1}-${startYear}`;
  }
}

// Fixed function to combine full-forecast partition with needed forecast-tail weeks
function combinePartitionsForStateAndHorizon(
  partitions: any,
  stateCode: string,
  horizon: number,
  displayStartDate: Date,
  displayEndDate: Date,
): any[] {
  if (!partitions) {
    console.debug("No partitions available");
    return [];
  }

  console.debug("Combining partitions for:", {
    stateCode,
    horizon,
    displayStartDate: displayStartDate.toISOString(),
    displayEndDate: displayEndDate.toISOString(),
  });

  const result = [];

  const allPartitions = ["full-forecast", "forecast-tail"];

  for (const partitionName of allPartitions) {
    const partition = partitions[partitionName];
    if (!partition) {
      console.debug(`No ${partitionName} partition available`);
      continue;
    }

    console.debug(`Processing ${partitionName} partition`);

    for (const [referenceDateISO, statesData] of Object.entries(partition)) {
      if (!statesData || typeof statesData !== "object") continue;

      const stateData = statesData[stateCode];
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

      // Add ground truth if available and valid
      if (stateData.groundTruth && stateData.groundTruth.admissions >= 0) {
        dataPoint.groundTruth = {
          admissions: stateData.groundTruth.admissions,
          weeklyRate: stateData.groundTruth.weeklyRate,
        };
      }

      // Look for predictions that match our horizon
      if (stateData.predictions) {
        for (const [targetDateISO, predData] of Object.entries(
          stateData.predictions,
        )) {
          if (typeof predData !== "object") continue;

          const targetDate = new Date(targetDateISO);

          // Check if this prediction matches our horizon and is within display range
          if (
            predData.horizon === horizon &&
            targetDate >= displayStartDate &&
            targetDate <= displayEndDate
          ) {
            // For horizon plot, we position the prediction at its target date
            const predictionPoint = {
              referenceDate: targetDate, // Use target date for x-axis positioning
              groundTruth: null, // Don't show ground truth at prediction position
              prediction: {
                targetDate: targetDate,
                horizon: predData.horizon,
                median: predData.median,
                q05: predData.q05,
                q25: predData.q25,
                q75: predData.q75,
                q95: predData.q95,
              },
            };

            result.push(predictionPoint);
            console.debug("Added prediction point:", {
              referenceDate: referenceDateISO,
              targetDate: targetDateISO,
              horizon: predData.horizon,
            });
            break; // Only one prediction per reference date for this horizon
          }
        }
      }

      // Add ground truth point if we have it (positioned at reference date)
      if (dataPoint.groundTruth) {
        result.push(dataPoint);
        console.debug("Added ground truth point:", {
          referenceDate: referenceDateISO,
          admissions: dataPoint.groundTruth.admissions,
        });
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

  const finalResult = Array.from(uniqueResults.values()).sort(
    (a, b) => a.referenceDate.getTime() - b.referenceDate.getTime(),
  );

  console.debug("Final combined data points:", finalResult.length);

  return finalResult;
}
