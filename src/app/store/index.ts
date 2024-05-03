// src/app/store/index.ts
'use client'
import { configureStore } from '@reduxjs/toolkit';
import groundTruthReducer from './groundTruthSlice';
import predictionsReducer from './predictionsSlice';
import locationReducer from './locationSlice';
import filterReducer from './filterSlice';

const store = configureStore({
    reducer: {
        groundTruth: groundTruthReducer,
        predictions: predictionsReducer,
        location: locationReducer,
        filter: filterReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;