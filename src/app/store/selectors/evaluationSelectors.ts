// src/store/selectors/evaluationSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";

// Selector for checking if JSON data is available
export const selectIsJsonDataLoaded = (state: RootState) => {
  const isLoaded = state.evaluationData.isJsonDataLoaded;
  console.debug("JSON data loaded status:", isLoaded);
  return isLoaded;
};

// Combined selector for Season Overview components
export const selectSeasonOverviewData = createSelector(
  [
    selectIsJsonDataLoaded,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.selectedAggregationPeriod,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.aggregationPeriods,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.evaluationSeasonOverviewHorizon,
    (state: RootState) => state.evaluationsSeasonOverviewSettings.evaluationSeasonOverviewSelectedModels,
    (state: RootState) => state.evaluationData.precalculated,
  ],
  (isJsonLoaded, selectedPeriodId, aggregationPeriods, horizons, selectedModels, precalculatedData) => {
    if (!isJsonLoaded) {
      console.debug("JSON data not loaded, returning null");
      return null;
    }

    const selectedPeriod = aggregationPeriods.find((p) => p.id === selectedPeriodId);
    if (!selectedPeriod) {
      console.debug("Selected period not found:", selectedPeriodId);
      return null;
    }

    const seasonId = selectedPeriodId;

    return {
      seasonId,
      selectedPeriod: aggregationPeriods.find((p) => p.id === selectedPeriodId),
      horizons,
      selectedModels,
      iqrData: precalculatedData.iqr[seasonId] || {},
      stateMapData: precalculatedData.stateMap_aggregates[seasonId] || {},
      coverageData: precalculatedData.detailedCoverage_aggregates[seasonId] || {},
    };
  }
);

// Helper selector for checking if we should use JSON or fall back to CSV
export const selectShouldUseJsonData = createSelector([selectIsJsonDataLoaded], (isLoaded) => {
  console.debug("Should use JSON data:", isLoaded);
  return isLoaded;
});
