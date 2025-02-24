import {configureStore} from '@reduxjs/toolkit';

// Import Data Reducers
import groundTruthReducer from './data-slices/groundTruthSlice';
import predictionsReducer from './data-slices/predictionsSlice';
import locationReducer from './data-slices/locationSlice';
import nowcastTrendsReducer from './data-slices/nowcastTrendsSlice';
import stateThresholdsReducer from "./data-slices/stateThresholdsSlice";
import historicalGroundTruthReducer from './data-slices/historicalGroundTruthSlice';
import evaluationsSingleModelScoreDataReducer from "./data-slices/evaluationsSingleModelScoreDataSlice";

// Import Settings Reducers
import forecastSettingsReducer from './forecast-settings-slice';
import evaluationsSingleModelSettingsReducer from './evaluations-single-model-settings-slice';


const store = configureStore({
    reducer: {
        groundTruth: groundTruthReducer,
        predictions: predictionsReducer,
        location: locationReducer,
        forecastSettings: forecastSettingsReducer,
        nowcastTrends: nowcastTrendsReducer,
        stateThresholds: stateThresholdsReducer,
        historicalGroundTruth: historicalGroundTruthReducer,
        evaluationsSingleModelSettings: evaluationsSingleModelSettingsReducer,
        evaluationsSingleModelScoreData: evaluationsSingleModelScoreDataReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;