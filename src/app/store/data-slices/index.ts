// src/store/data-slices/index.ts
// Export Data Slice
export { default as coreDataReducer } from "./coreDataSlice";
export { default as evaluationDataReducer } from "./evaluationDataSlice";
// Export Settings Variables Slice
export { default as forecastSettingsReducer } from "./SettingsSliceForecastNowcast";
export { default as evaluationsSeasonOverviewSettingsReducer } from "./SettingsSliceEvaluationSeasonOverview";
export { default as evaluationsSingleModelSettingsReducer } from "./SettingsSliceEvaluationSingleModel";
