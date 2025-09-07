// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";

import {
  forecastSettingsReducer,
  evaluationsSeasonOverviewSettingsReducer,
  evaluationsSingleModelSettingsReducer,
  evaluationDataReducer,
  coreDataReducer,
  auxiliaryDataReducer,
  historicalGroundTruthDataReducer,
} from "./data-slices";

const store = configureStore({
  reducer: {
    coreData: coreDataReducer,
    evaluationData: evaluationDataReducer,
    auxiliaryData: auxiliaryDataReducer,
    historicalGroundTruthData: historicalGroundTruthDataReducer,
    forecastSettings: forecastSettingsReducer,
    evaluationsSeasonOverviewSettings: evaluationsSeasonOverviewSettingsReducer,
    evaluationsSingleModelSettings: evaluationsSingleModelSettingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
