// src/store/selector/forecastSelectors.ts

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { StateThresholds, SurveillanceSingleWeekDataPoint } from "@/types/domains/forecasting";

// Selector for thresholds - handles dictionary format
export const selectThresholds = createSelector(
  [(state: RootState) => state.coreData.auxiliaryData],
  (auxiliaryData) => {
    const thresholds = auxiliaryData?.thresholds;
    if (!thresholds) {
      console.debug("DEBUG: selectThresholds: No thresholds data available");
      return [];
    }
    
    // Convert dictionary to array format expected by components
    const thresholdArray: StateThresholds[] = Object.entries(thresholds).map(
      ([location, data]: [string, any]) => ({
        location,
        medium: data.medium,
        high: data.high,
        veryHigh: data.veryHigh,
      })
    );
    
    console.debug("DEBUG: selectThresholds: Converted dictionary to array", {
      count: thresholdArray.length,
      sample: thresholdArray[0]
    });
    
    return thresholdArray;
  }
);

// Selector for a specific state's thresholds
export const selectStateThresholds = createSelector(
  [(state: RootState) => state.coreData.auxiliaryData,
   (state: RootState, stateNum: string) => stateNum],
  (auxiliaryData, stateNum) => {
    const thresholds = auxiliaryData?.thresholds;
    if (!thresholds || !thresholds[stateNum]) {
      console.debug(`DEBUG: selectStateThresholds: No thresholds for state ${stateNum}`);
      return null;
    }
    
    return {
      location: stateNum,
      ...thresholds[stateNum]
    };
  }
);

// Selector for locations
export const selectLocationData = createSelector(
  [(state: RootState) => state.coreData.auxiliaryData],
  (auxiliaryData) => {
    if (!auxiliaryData?.locations) {
      console.debug("DEBUG: selectLocationData: No location data available");
      return [];
    }
    console.debug("DEBUG: selectLocationData: Locations found", auxiliaryData.locations.length);
    return auxiliaryData.locations;
  }
);

// Selector for nowcast trends - simpler direct access
export const selectNowcastTrends = createSelector(
  [(state: RootState) => state.coreData.mainData],
  (mainData) => {
    if (!mainData?.nowcastTrends) {
      console.debug("DEBUG: selectNowcastTrends: No nowcast trends available");
      return [];
    }
    
    // Transform nested structure to array format expected by components
    const nowcastData = Object.entries(mainData.nowcastTrends).map(
      ([modelName, modelData]) => ({
        modelName,
        data: Object.entries(modelData as any).flatMap(([dateISO, statesData]) =>
          Object.entries(statesData as any).map(([stateNum, trends]) => ({
            location: stateNum,
            reference_date: new Date(dateISO),
            ...(trends as any)
          }))
        )
      })
    );
    
    console.debug("DEBUG: selectNowcastTrends: Transformed trends for models", {
      modelCount: nowcastData.length,
      models: nowcastData.map(d => d.modelName)
    });
    
    return nowcastData;
  }
);

// Complex selector for ground truth within a date range
export const selectGroundTruthInRange = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.timeSeriesData,
    (state: RootState) => state.coreData.metadata?.seasons,
    (state: RootState, startDate: Date, endDate: Date) => ({ startDate, endDate }),
    (state: RootState, startDate: Date, endDate: Date, stateNum: string) => stateNum
  ],
  (timeSeriesData, seasons, { startDate, endDate }, stateNum) => {
    if (!timeSeriesData || !seasons) {
      console.debug("DEBUG: selectGroundTruthInRange: Missing required data");
      return [];
    }

    console.debug("DEBUG: selectGroundTruthInRange: Searching for ground truth", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      stateNum
    });

    // Find which season contains our date range
    const relevantSeasons = findRelevantSeasons(seasons, startDate, endDate);
    
    if (relevantSeasons.length === 0) {
      console.debug("DEBUG: selectGroundTruthInRange: No relevant seasons found");
      return [];
    }

    const groundTruthPoints: SurveillanceSingleWeekDataPoint[] = [];
    
    // For each relevant season, extract ground truth from partitions
    for (const seasonId of relevantSeasons) {
      const seasonData = timeSeriesData[seasonId];
      if (!seasonData) continue;

      // Get any model's data (ground truth is same across all models)
      const firstModel = Object.keys(seasonData).find(key => key !== 'firstPredRefDate' && 
                                                                 key !== 'lastPredRefDate' && 
                                                                 key !== 'lastPredTargetDate');
      if (!firstModel) continue;

      const modelData = seasonData[firstModel];
      const partitions = modelData.partitions;

      // Check all partitions for ground truth data
      ['pre-forecast', 'full-forecast', 'forecast-tail', 'post-forecast'].forEach(partitionName => {
        const partition = partitions[partitionName];
        if (!partition) return;

        Object.entries(partition).forEach(([dateISO, statesData]: [string, any]) => {
          const date = new Date(dateISO);
          
          // Check if date is within our range
          if (date >= startDate && date <= endDate) {
            const stateData = statesData[stateNum];
            if (stateData?.groundTruth) {
              groundTruthPoints.push({
                date,
                stateNum,
                stateName: "", // Would need location data for full name
                admissions: stateData.groundTruth.admissions,
                weeklyRate: stateData.groundTruth.weeklyRate
              });
            }
          }
        });
      });
    }

    // Sort by date and remove duplicates
    const uniquePoints = Array.from(
      new Map(groundTruthPoints.map(p => [p.date.toISOString(), p])).values()
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    console.debug("DEBUG: selectGroundTruthInRange: Found ground truth points", {
      count: uniquePoints.length,
      firstDate: uniquePoints[0]?.date,
      lastDate: uniquePoints[uniquePoints.length - 1]?.date
    });

    return uniquePoints;
  }
);

// Selector for predictions from a specific model
export const selectPredictionsForModelAndWeek = createSelector(
  [
    (state: RootState) => state.coreData.mainData?.timeSeriesData,
    (state: RootState) => state.coreData.metadata?.seasons,
    (state: RootState, modelName: string) => modelName,
    (state: RootState, modelName: string, stateNum: string) => stateNum,
    (state: RootState, modelName: string, stateNum: string, referenceDate: Date) => referenceDate
  ],
  (timeSeriesData, seasons, modelName, stateNum, referenceDate) => {
    if (!timeSeriesData || !seasons) {
      console.debug("DEBUG: selectPredictionsForModelAndWeek: Missing data");
      return null;
    }

    const dateISO = referenceDate.toISOString().split('T')[0];
    
    // Find relevant season
    const seasonId = findSeasonForDate(seasons, referenceDate);
    if (!seasonId) {
      console.debug("DEBUG: selectPredictionsForModelAndWeek: No season found for date", dateISO);
      return null;
    }

    const modelData = timeSeriesData[seasonId]?.[modelName];
    if (!modelData) {
      console.debug("DEBUG: selectPredictionsForModelAndWeek: No model data", { seasonId, modelName });
      return null;
    }

    // Check each partition for this date
    for (const partitionName of ['full-forecast', 'forecast-tail']) {
      const partition = modelData.partitions[partitionName];
      if (!partition || !partition[dateISO]) continue;

      const stateData = partition[dateISO][stateNum];
      if (stateData?.predictions) {
        console.debug("DEBUG: selectPredictionsForModelAndWeek: Found predictions", {
          modelName,
          dateISO,
          stateNum,
          predictionCount: Object.keys(stateData.predictions).length
        });
        return stateData.predictions;
      }
    }

    console.debug("DEBUG: selectPredictionsForModelAndWeek: No predictions found");
    return null;
  }
);

// Helper functions
function findRelevantSeasons(seasons: any, startDate: Date, endDate: Date): string[] {
  const relevantSeasons: string[] = [];
  
  // Check full range seasons
  if (seasons.fullRangeSeasons) {
    seasons.fullRangeSeasons.forEach((season: any) => {
      const seasonStart = new Date(season.startDate);
      const seasonEnd = new Date(season.endDate);
      
      // Check if date ranges overlap
      if (!(endDate < seasonStart || startDate > seasonEnd)) {
        const seasonId = `season-${seasonStart.getFullYear()}-${seasonEnd.getFullYear()}`;
        relevantSeasons.push(seasonId);
      }
    });
  }

  return relevantSeasons;
}

function findSeasonForDate(seasons: any, date: Date): string | null {
  if (!seasons.fullRangeSeasons) return null;
  
  for (const season of seasons.fullRangeSeasons) {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);
    
    if (date >= seasonStart && date <= seasonEnd) {
      return `season-${seasonStart.getFullYear()}-${seasonEnd.getFullYear()}`;
    }
  }
  
  return null;
}