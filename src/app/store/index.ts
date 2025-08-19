import { configureStore } from "@reduxjs/toolkit";

import groundTruthReducer from "./data-slices/groundTruthSlice";
import predictionsReducer from "./data-slices/predictionsSlice";
import locationReducer from "./data-slices/locationSlice";
import nowcastTrendsReducer from "./data-slices/nowcastTrendsSlice";
import stateThresholdsReducer from "./data-slices/stateThresholdsSlice";
import historicalGroundTruthReducer from "./data-slices/historicalGroundTruthSlice";
import evaluationsSingleModelScoreDataReducer from "./data-slices/evaluationsScoreDataSlice";

// Import settings reducers
import forecastSettingsReducer from "./forecast-settings-slice";
import evaluationsSeasonOverviewSettingsReducer from "./evaluations-season-overview-settings-slice";
import evaluationsSingleModelSettingsReducer from "./evaluations-single-model-settings-slice";

// REFACTOR:
// Import All-in-one new Evaluation Data Slice
import evaluationDataReducer from "./data-slices/evaluationDataSlice";
// Import All-in-one new Core Data Slice (containing ground-truth, historical ground-truth, forecast, nowcast, location, thresholds)
import coreDataReducer from "./data-slices/coreDataSlice";

const store = configureStore({
  reducer: {
    groundTruth: groundTruthReducer,
    predictions: predictionsReducer,
    location: locationReducer,
    nowcastTrends: nowcastTrendsReducer,
    stateThresholds: stateThresholdsReducer,
    historicalGroundTruth: historicalGroundTruthReducer,

    forecastSettings: forecastSettingsReducer,

    evaluationData: evaluationDataReducer,
    coreData: coreDataReducer,

    evaluationsSingleModelScoreData: evaluationsSingleModelScoreDataReducer,

    evaluationsSeasonOverviewSettings: evaluationsSeasonOverviewSettingsReducer,
    evaluationsSingleModelSettings: evaluationsSingleModelSettingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export * from "./selector/evaluationSelectors";
export * from "./selector/singleModelSelectors";

export default store;
