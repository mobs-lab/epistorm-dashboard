// src/store/selectors/singleModelSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { addWeeks } from "date-fns";

// Selector for core data loading status
export const selectIsCoreDataLoaded = (state: RootState) => state.coreData.isLoaded;

// Selector for evaluation scores that need raw data points
export const selectSingleModelScoreData = createSelector(
  [
    (state: RootState) => state.evaluationData.precalculated.iqr,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewDateRange,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewModel,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewSelectedStateCode,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationSingleModelViewHorizon,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationSingleModelViewScoresOption
  ],
  (iqrData, dateRange, modelName, stateCode, horizon, scoreOption) => {
    if (!iqrData || !dateRange || !modelName) return null;
    
    const seasonId = mapDateRangeToSeasonId(dateRange);
    if (!seasonId || !iqrData[seasonId]) return null;
    
    const metric = scoreOption === "WIS/Baseline" ? "WIS_ratio" : "MAPE";
    const modelData = iqrData[seasonId]?.[metric]?.[modelName]?.[horizon];
    
    if (!modelData || !modelData.scores) return null;
    
    // Extract raw scores from BoxplotStats
    // Note: These scores need to be mapped back to dates for the line chart
    // This requires additional metadata that should be included in the JSON
    return {
      scores: modelData.scores,
      stats: {
        q05: modelData.q05,
        q25: modelData.q25,
        median: modelData.median,
        q75: modelData.q75,
        q95: modelData.q95,
        min: modelData.min,
        max: modelData.max,
        mean: modelData.mean
      }
    };
  }
);

// Main selector for time series data
export const selectSingleModelTimeSeriesData = createSelector(
  [
    (state: RootState) => state.coreData.isLoaded,
    (state: RootState) => state.coreData.mainData?.timeSeriesData,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewDateRange,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewModel,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationsSingleModelViewSelectedStateCode,
    (state: RootState) => state.evaluationsSingleModelSettings.evaluationSingleModelViewHorizon
  ],
  (isLoaded, timeSeriesData, dateRange, modelName, stateCode, horizon) => {
    if (!isLoaded || !timeSeriesData || !dateRange || !modelName) {
      console.debug("Missing required data for time series selector", {
        isLoaded, 
        hasTimeSeriesData: !!timeSeriesData, 
        dateRange, 
        modelName
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

    // Combine all partitions and extract data for the specific state and horizon
    const combinedData = combinePartitionsForStateAndHorizon(
      modelData.partitions,
      stateCode,
      horizon
    );

    return {
      data: combinedData,
      metadata: {
        firstPredRefDate: modelData.firstPredRefDate ? new Date(modelData.firstPredRefDate) : null,
        lastPredRefDate: modelData.lastPredRefDate ? new Date(modelData.lastPredRefDate) : null,
        lastPredTargetDate: modelData.lastPredTargetDate ? new Date(modelData.lastPredTargetDate) : null
      }
    };
  }
);

// Corrected helper function to map date range to season ID
function mapDateRangeToSeasonId(dateRange: string): string | null {
  // Handle dynamic periods first
  if (dateRange.includes("last") || dateRange.includes("week")) {
    // Extract the number of weeks from the date range
    if (dateRange.includes("2") || dateRange.includes("two")) return "last-2-weeks";
    if (dateRange.includes("4") || dateRange.includes("four")) return "last-4-weeks";
    if (dateRange.includes("8") || dateRange.includes("eight")) return "last-8-weeks";
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

// Improved partition combination function
function combinePartitionsForStateAndHorizon(
  partitions: any,
  stateCode: string,
  horizon: number
): any[] {
  if (!partitions) return [];
  
  const result = [];
  const partitionOrder = ["pre-forecast", "full-forecast", "forecast-tail", "post-forecast"];
  
  for (const partitionName of partitionOrder) {
    const partition = partitions[partitionName];
    if (!partition) continue;
    
    for (const [referenceDateISO, statesData] of Object.entries(partition)) {
      if (!statesData || typeof statesData !== 'object') continue;
      
      const stateData = statesData[stateCode];
      if (!stateData) continue;
      
      const dataPoint: any = {
        referenceDate: new Date(referenceDateISO),
        groundTruth: null,
        prediction: null
      };
      
      // Add ground truth if available
      if (stateData.groundTruth) {
        dataPoint.groundTruth = {
          admissions: stateData.groundTruth.admissions,
          weeklyRate: stateData.groundTruth.weeklyRate
        };
      }
      
      // Add prediction for the specific horizon
      if (stateData.predictions) {
        // Calculate expected target date for this horizon
        const referenceDate = new Date(referenceDateISO);
        const expectedTargetDate = addWeeks(referenceDate, horizon);
        
        // Find matching prediction by checking all target dates
        for (const [targetDateISO, predData] of Object.entries(stateData.predictions)) {
          if (typeof predData !== 'object') continue;
          
          const targetDate = new Date(targetDateISO);
          // Check if this prediction matches our horizon
          if (predData.horizon === horizon || 
              Math.abs(targetDate.getTime() - expectedTargetDate.getTime()) < 86400000) {
            dataPoint.prediction = {
              targetDate: targetDate,
              horizon: predData.horizon,
              median: predData.median,
              q05: predData.q05,
              q25: predData.q25,
              q75: predData.q75,
              q95: predData.q95
            };
            break;
          }
        }
      }
      
      result.push(dataPoint);
    }
  }
  
  return result.sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());
}