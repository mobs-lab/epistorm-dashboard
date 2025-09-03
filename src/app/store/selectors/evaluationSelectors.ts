// src/store/selectors/evaluationSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";

// Selector for checking if JSON data is available
export const selectIsJsonDataLoaded = (state: RootState) => {
  const isLoaded = state.evaluationData.isJsonDataLoaded;
  return isLoaded;
};

// Combined selector for Season Overview components
export const selectSeasonOverviewData = createSelector(
  [
    selectIsJsonDataLoaded,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.selectedDynamicTimePeriod,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.evalSOTimeRangeOptions,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.evaluationSeasonOverviewHorizon,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.evaluationSeasonOverviewSelectedModels,
    (state: RootState) => state.evaluationData.precalculated,
  ],
  (isJsonLoaded, selectedPeriodName, evalSOTimeRangeOptions, horizons, selectedModels, precalculatedData) => {
    // Always return a valid structure, even if data is not loaded
    const defaultReturn = {
      seasonId: selectedPeriodName || "",
      selectedPeriod: null,
      horizons: horizons || [],
      selectedModels: selectedModels || [],
      iqrData: {},
      stateMapData: {},
      coverageData: {},
    };

    if (!isJsonLoaded) {
      return defaultReturn;
    }

    const selectedPeriod = evalSOTimeRangeOptions.find((p) => p.name === selectedPeriodName);
    if (!selectedPeriod) {
      console.debug("Selected period not found:", selectedPeriodName);
      return defaultReturn;
    }

    const seasonId = selectedPeriodName;

    return {
      seasonId,
      selectedPeriod,
      horizons,
      selectedModels,
      iqrData: precalculatedData?.iqr?.[seasonId] || {},
      stateMapData: precalculatedData?.stateMap_aggregates?.[seasonId] || {},
      coverageData: precalculatedData?.detailedCoverage_aggregates?.[seasonId] || {},
    };
  }
);

// Helper selector for checking if we should use JSON or fall back to CSV
export const selectShouldUseJsonData = createSelector([selectIsJsonDataLoaded], (isLoaded) => {
  return isLoaded;
});

// Selector for checking if season overview has valid data structure
export const selectHasSeasonOverviewData = createSelector([selectSeasonOverviewData], (seasonOverviewData) => {
  return seasonOverviewData && Object.keys(seasonOverviewData.iqrData).length > 0 && seasonOverviewData.selectedModels.length > 0;
});
