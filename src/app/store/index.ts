import {configureStore} from '@reduxjs/toolkit';
import groundTruthReducer from './groundTruthSlice';
import predictionsReducer from './predictionsSlice';
import locationReducer from './locationSlice';
import filterReducer from './filterSlice';
import nowcastTrendsReducer from './nowcastTrendsSlice';
import stateThresholdsReducer from "./stateThresholdsSlice";

const store = configureStore({
    reducer: {
        groundTruth: groundTruthReducer,
        predictions: predictionsReducer,
        location: locationReducer,
        filter: filterReducer,
        nowcastTrends: nowcastTrendsReducer,
        stateThresholds: stateThresholdsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;