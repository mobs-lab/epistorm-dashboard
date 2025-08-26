import { configureStore } from "@reduxjs/toolkit";

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
    coreData: coreDataReducer,
    evaluationData: evaluationDataReducer,
    forecastSettings: forecastSettingsReducer,
    evaluationsSeasonOverviewSettings: evaluationsSeasonOverviewSettingsReducer,
    evaluationsSingleModelSettings: evaluationsSingleModelSettingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
