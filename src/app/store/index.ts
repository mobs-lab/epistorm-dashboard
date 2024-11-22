import {configureStore} from '@reduxjs/toolkit';

// Import Data Reducers
import groundTruthReducer from './Data/groundTruthSlice';
import predictionsReducer from './Data/predictionsSlice';
import locationReducer from './Data/locationSlice';
import nowcastTrendsReducer from './Data/nowcastTrendsSlice';
import stateThresholdsReducer from "./Data/stateThresholdsSlice";
import historicalGroundTruthReducer from './Data/historicalGroundTruthSlice';

// Import Settings Reducers
import forecastSettingsReducer from './forecast-settings-slice';
import evaluationsSettingsReducer from './evaluations-settings-slice';


const store = configureStore({
    reducer: {
        groundTruth: groundTruthReducer,
        predictions: predictionsReducer,
        location: locationReducer,
        forecastSettings: forecastSettingsReducer,
        nowcastTrends: nowcastTrendsReducer,
        stateThresholds: stateThresholdsReducer,
        historicalGroundTruth: historicalGroundTruthReducer,
        evaluationsSettings: evaluationsSettingsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;