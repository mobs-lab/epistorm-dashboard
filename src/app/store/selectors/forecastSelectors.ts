// src/store/selector/forecastSelectors.ts

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { StateThresholds, SurveillanceSingleWeekDataPoint } from "@/types/domains/forecasting";

// Selector for thresholds - handles dictionary format
// TODO: Get rid of this after changing the component to use Dictionary instead for faster access, less find() operations
export const selectThresholds = createSelector([(state: RootState) => state.auxiliaryData], (auxiliaryData) => {
  const thresholds = auxiliaryData?.thresholds;
  if (!thresholds) {
    console.warn("Warning: selectThresholds: No thresholds data available");
    return [];
  }

  // Convert dictionary to array format expected by components
  const thresholdArray: StateThresholds[] = Object.entries(thresholds).map(([location, data]: [string, any]) => ({
    location,
    medium: data.medium,
    high: data.high,
    veryHigh: data.veryHigh,
  }));

  return thresholdArray;
});

// Selector for a specific state's thresholds
export const selectStateThresholds = createSelector(
  [(state: RootState) => state.auxiliaryData, (state: RootState, stateNum: string) => stateNum],
  (auxiliaryData, stateNum) => {
    const thresholds = auxiliaryData?.thresholds;
    if (!thresholds || !thresholds[stateNum]) {
      console.warn(`Warning: selectStateThresholds: No thresholds for state ${stateNum}`);
      return null;
    }

    return {
      location: stateNum,
      ...thresholds[stateNum],
    };
  }
);

// Selector for locations
export const selectLocationData = createSelector([(state: RootState) => state.auxiliaryData], (auxiliaryData) => {
  if (!auxiliaryData?.locations) {
    console.warn("Warning: selectLocationData: No location data available");
    return [];
  }
  return auxiliaryData.locations;
});

// Selector for nowcast trends - simpler direct access
export const selectNowcastTrends = createSelector([(state: RootState) => state.coreData.mainData?.nowcastTrends], (nowcastTrends) => {
  if (!nowcastTrends) {
    console.warn("Warning: selectNowcastTrends: No nowcast trends available");
    return {};
  }
  return nowcastTrends;
});

export const selectNowcastTrendsForModelAndDate = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.nowcastTrends,
    (state: RootState, modelName: string) => modelName,
    (state: RootState, modelName: string, date: Date) => date,
    (state: RootState, modelName: string, date: Date, stateNum: string) => stateNum,
  ],
  (nowcastTrends, modelName, date, stateNum) => {
    if (!nowcastTrends || !nowcastTrends[modelName]) {
      return null;
    }

    const dateISO = date.toISOString().split("T")[0];
    const dateData = nowcastTrends[modelName][dateISO];
    if (!dateData) {
      return null;
    }

    return dateData[stateNum] || null;
  }
);

// Find ground truth within a date range, by examining across seasons and find potential partitions, then filter
export const selectGroundTruthInRange = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.groundTruthData,
    (state: RootState) => state.auxiliaryData.metadata,
    (state: RootState, startDate: Date, endDate: Date) => ({ startDate, endDate }),
    (state: RootState, startDate: Date, endDate: Date, stateNum: string) => stateNum,
  ],
  (groundTruthData, metadata, { startDate, endDate }, stateNum) => {
    if (!groundTruthData || !metadata?.fullRangeSeasons) {
      // Changed check
      console.warn("Warning: selectGroundTruthInRange: Missing required data");
      return [];
    }

    // Find which season contains our date range
    const relevantSeasons = findRelevantSeasons(metadata.fullRangeSeasons, startDate, endDate);

    if (relevantSeasons.length === 0) {
      console.warn("Warning: selectGroundTruthInRange: No relevant seasons found");
      return [];
    }

    const groundTruthPoints: SurveillanceSingleWeekDataPoint[] = [];

    // For each relevant season, extract ground truth from centralized collection
    for (const seasonId of relevantSeasons) {
      const seasonData = groundTruthData[seasonId];
      if (!seasonData) continue;

      // Iterate through all reference dates in this season
      Object.entries(seasonData).forEach(([dateISO, statesData]) => {
        const date = new Date(dateISO);

        // Check if date is within our range
        if (date >= startDate && date <= endDate) {
          const stateData = statesData[stateNum];
          if (stateData) {
            groundTruthPoints.push({
              date,
              stateNum,
              stateName: "", // Would need location data for full name, skip for now
              admissions: stateData.admissions,
              weeklyRate: stateData.weeklyRate,
            });
          }
        }
      });
    }

    // Sort by date and remove duplicates
    const uniquePoints = Array.from(new Map(groundTruthPoints.map((p) => [p.date.toISOString(), p])).values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return uniquePoints;
  }
);

// Extended ground truth selector that includes prediction horizons for tooltip display
export const selectExtendedGroundTruthInRange = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.groundTruthData,
    (state: RootState) => state.auxiliaryData.metadata,
    (state: RootState, startDate: Date, endDate: Date, horizon: number) => ({ startDate, endDate, horizon }),
    (state: RootState, startDate: Date, endDate: Date, horizon: number, stateNum: string) => stateNum,
  ],
  (groundTruthData, metadata, { startDate, endDate, horizon }, stateNum) => {
    if (!groundTruthData || !metadata) {
      console.warn("Warning: selectExtendedGroundTruthInRange: Missing required data");
      return [];
    }

    // Calculate extended end date based on horizon
    const extendedEndDate = new Date(endDate);
    if (horizon > 0) {
      // Add horizon weeks to the end date
      extendedEndDate.setUTCDate(extendedEndDate.getUTCDate() + horizon * 7);
    }

    // Find which season contains our extended date range
    const relevantSeasons = findRelevantSeasons(metadata.fullRangeSeasons || [], startDate, extendedEndDate);

    if (relevantSeasons.length === 0) {
      console.warn("Warning: selectExtendedGroundTruthInRange: No relevant seasons found");
      return [];
    }

    const groundTruthPoints: SurveillanceSingleWeekDataPoint[] = [];

    // For each relevant season, extract ground truth from centralized collection
    for (const seasonId of relevantSeasons) {
      const seasonData = groundTruthData[seasonId];
      if (!seasonData) continue;

      // Iterate through all reference dates in this season
      Object.entries(seasonData).forEach(([dateISO, statesData]) => {
        const date = new Date(dateISO);

        // Check if date is within our extended range
        if (date >= startDate && date <= extendedEndDate) {
          const stateData = (statesData as any)[stateNum];
          if (stateData) {
            groundTruthPoints.push({
              date,
              stateNum,
              stateName: "", // Would need location data for full name, skip for now
              admissions: stateData.admissions,
              weeklyRate: stateData.weeklyRate,
            });
          }
        }
      });
    }

    // Sort by date and remove duplicates
    const uniquePoints = Array.from(new Map(groundTruthPoints.map((p) => [p.date.toISOString(), p])).values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return uniquePoints;
  }
);

// Selector for historical ground truth data for a specific week
export const selectHistoricalDataForWeek = createSelector(
  [
    (state: RootState) => state.historicalGroundTruthData?.historicalDataMap,
    (state: RootState, userSelectedWeek: Date) => userSelectedWeek,
    (state: RootState, userSelectedWeek: Date, stateNum: string) => stateNum,
  ],
  (historicalDataMap, userSelectedWeek, stateNum) => {
    if (!historicalDataMap) {
      console.warn("Warning: selectHistoricalDataForWeek: No historical data available");
      return [];
    }

    // Find the snapshot date that is one week before the user selected week
    const targetSnapshotDate = new Date(userSelectedWeek);
    targetSnapshotDate.setUTCDate(targetSnapshotDate.getUTCDate() - 7);
    const targetSnapshotISO = targetSnapshotDate.toISOString().split("T")[0];

    const snapshotData = historicalDataMap[targetSnapshotISO];
    if (!snapshotData) {
      // console.debug(`DEBUG: No historical snapshot found for ${targetSnapshotISO}`);
      return [];
    }

    // Convert the snapshot data into the SurveillanceSingleWeekDataPoint array format
    const historicalPoints: SurveillanceSingleWeekDataPoint[] = [];
    Object.entries(snapshotData).forEach(([dateISO, statesData]) => {
      const stateData = (statesData as any)[stateNum];
      if (stateData) {
        historicalPoints.push({
          date: new Date(dateISO),
          stateNum,
          stateName: "", // location data needed for full name, skip for now
          admissions: stateData.admissions,
          weeklyRate: stateData.weeklyRate,
        });
      }
    });

    return historicalPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
);

/* For Weekly Hospitalization Chart, select multiple model's prediction data matching date-models-location. Filtering on Horizons & handling of values done in frontend component. */
/* NOTE: This changes how much prediction data is offloaded to Weekly Hospitalization Forecast Chart.
    Previously, all prediction data associated with the date range are selected to be ready to be selected;
    This new one finds matching ones only when `referenceDate` change, so only triggers when user selects some dates. */
export const selectPredictionsForMultipleModels = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.predictionData,
    (state: RootState) => state.auxiliaryData.metadata,
    (state: RootState, modelNames: string[], stateNum: string, referenceDate: Date, horizon: number) => ({
      modelNames,
      stateNum,
      referenceDate,
      horizon,
    }),
  ],
  (predictionData, metadata, { modelNames, stateNum, referenceDate, horizon }) => {
    console.debug("DEBUG: selectPredictionsForMultipleModels: referenceDate", referenceDate);
    if (!predictionData || !metadata) {
      return {};
    }

    const dateISO = referenceDate.toISOString().split("T")[0];
    const seasonId = findSeasonForDate(metadata.fullRangeSeasons || [], referenceDate);
    if (!seasonId) return {};
    console.debug("selectPredictionsForMultipleModels: Using dateISO key", dateISO, "in season", seasonId);

    const predictions: {} = {};

    modelNames.forEach((modelName) => {
      console.debug("DEBUG: selectPredictionsForMultipleModels: Model name", modelName);
      const modelData = predictionData[seasonId]?.[modelName];
      if (!modelData) return;

      for (const partitionName of ["full-forecast", "forecast-tail"]) {
        const partition = modelData.partitions[partitionName as keyof typeof modelData.partitions];
        if (!partition) continue;
        if (!partition[dateISO]) {
          if (partitionName === "full-forecast") {
            // Log only for the main partition to avoid noise
            console.debug(
              `selectPredictionsForMultipleModels: Key ${dateISO} not found in partition ${partitionName} for model ${modelName}. Available keys (sample):`,
              Object.keys(partition).slice(0, 20)
            );
          }
          continue;
        }

        const stateData = partition[dateISO][stateNum];
        if (stateData?.predictions) {
          // Container to put all horizon-matching final single-prediction-points, keyed by targetDateISO
          const filteredPredictions: { [targetDateISO: string]: any } = {};
          Object.entries(stateData.predictions).forEach(([targetDateISO, pred]) => {
            if (pred.horizon <= horizon) {
              filteredPredictions[targetDateISO] = pred;
            }
          });
          if (Object.keys(filteredPredictions).length > 0) {
            (predictions as any)[modelName] = filteredPredictions;
          }
          break;
        }
      }
    });
    return predictions;
  }
);

// Selector for predictions from a specific model. Used mainly by NowcastStateThermo for calculating risk level value for a given date-location-nowcastModel. In the frontend it then narrows to horizon-0 parts.
export const selectPredictionsForModelAndWeek = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.predictionData,
    (state: RootState) => state.auxiliaryData.metadata,
    (state: RootState, modelName: string) => modelName,
    (state: RootState, modelName: string, stateNum: string) => stateNum,
    (state: RootState, modelName: string, stateNum: string, referenceDate: Date) => referenceDate,
  ],
  (timeSeriesData, metadata, modelName, stateNum, referenceDate) => {
    if (!timeSeriesData || !metadata) {
      console.debug("Warning: selectPredictionsForModelAndWeek: Missing data");
      return null;
    }

    const dateISO = referenceDate.toISOString().split("T")[0];

    // Find relevant season
    const seasonId = findSeasonForDate(metadata.fullRangeSeasons || [], referenceDate);
    if (!seasonId) {
      console.warn("Warning: selectPredictionsForModelAndWeek: No season found for date", dateISO);
      return null;
    }

    const modelData = timeSeriesData[seasonId]?.[modelName];
    if (!modelData) {
      console.warn("Warning: selectPredictionsForModelAndWeek: No model data", { seasonId, modelName });
      return null;
    }

    // Check each partition for this date
    for (const partitionName of ["full-forecast", "forecast-tail"]) {
      const partition = modelData.partitions[partitionName as keyof typeof modelData.partitions];
      if (!partition || !partition[dateISO]) continue;

      const stateData = partition[dateISO][stateNum];
      if (stateData?.predictions) {
        /* console.debug("DEBUG: selectPredictionsForModelAndWeek: Found predictions", {
          modelName,
          dateISO,
          stateNum,
          predictionCount: Object.keys(stateData.predictions).length,
        }); */
        return stateData.predictions;
      }
    }

    console.warn("Warning: selectPredictionsForModelAndWeek: No predictions found");
    return null;
  }
);

// Helper functions
function findRelevantSeasons(fullRangeSeasons: any[], startDate: Date, endDate: Date): string[] {
  const relevantSeasons: string[] = [];

  fullRangeSeasons.forEach((season: any) => {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    // Check if date ranges overlap
    if (!(endDate < seasonStart || startDate > seasonEnd)) {
      if (season.seasonId) {
        relevantSeasons.push(season.seasonId);
      } else {
        console.warn("Season object is missing a seasonId:", season);
      }
    }
  });

  return relevantSeasons;
}

function findSeasonForDate(fullRangeSeasons: any[], date: Date): string | null {
  for (const season of fullRangeSeasons) {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    if (date >= seasonStart && date <= seasonEnd) {
      return season.seasonId || null;
    }
  }

  return null;
}

// Selector for date constraints from metadata
export const selectDateConstraints = createSelector([(state: RootState) => state.auxiliaryData.metadata], (metadata) => {
  if (!metadata?.fullRangeSeasons || metadata.fullRangeSeasons.length === 0) {
    // Fallback to hardcoded dates if no metadata
    return {
      earliestDate: new Date("2022-08-23T12:00:00.000Z"),
      latestDate: new Date("2024-05-24T12:00:00.000Z"),
    };
  }

  // Find overall earliest and latest dates across all full range seasons
  let earliestDate = new Date(metadata.fullRangeSeasons[0].startDate);
  let latestDate = new Date(metadata.fullRangeSeasons[0].endDate);

  metadata.fullRangeSeasons.forEach((season: any) => {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    if (seasonStart < earliestDate) {
      earliestDate = seasonStart;
    }
    if (seasonEnd > latestDate) {
      latestDate = seasonEnd;
    }
  });

  return { earliestDate, latestDate };
});
