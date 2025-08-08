import { configureStore } from "@reduxjs/toolkit";

// Import existing data reducers (keep ALL of these)
import groundTruthReducer from "./data-slices/groundTruthSlice";
import predictionsReducer from "./data-slices/predictionsSlice";
import locationReducer from "./data-slices/locationSlice";
import nowcastTrendsReducer from "./data-slices/nowcastTrendsSlice";
import stateThresholdsReducer from "./data-slices/stateThresholdsSlice";
import historicalGroundTruthReducer from "./data-slices/historicalGroundTruthSlice";
import evaluationsSingleModelScoreDataReducer from "./data-slices/evaluationsScoreDataSlice";

// Import All-in-one new Evaluation Data Slice
import evaluationDataReducer from "./data-slices/evaluationDataSlice";

// Import settings reducers (unchanged)
import forecastSettingsReducer from "./forecast-settings-slice";
import evaluationsSeasonOverviewSettingsReducer from "./evaluations-season-overview-settings-slice";
import evaluationsSingleModelSettingsReducer from "./evaluations-single-model-settings-slice";

const store = configureStore({
  reducer: {
    // EXISTING: Keep all existing slices unchanged (for backward compatibility)
    groundTruth: groundTruthReducer,
    predictions: predictionsReducer,
    location: locationReducer,
    nowcastTrends: nowcastTrendsReducer,
    stateThresholds: stateThresholdsReducer,
    historicalGroundTruth: historicalGroundTruthReducer,

    forecastSettings: forecastSettingsReducer,

    evaluationData: evaluationDataReducer,

    evaluationsSingleModelScoreData: evaluationsSingleModelScoreDataReducer,

    evaluationsSeasonOverviewSettings: evaluationsSeasonOverviewSettingsReducer,
    evaluationsSingleModelSettings: evaluationsSingleModelSettingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
