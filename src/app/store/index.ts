// src/app/store/index.ts

/* This file is the entry point for the Redux store. It combines all the reducers into a single reducer object and creates the store.
The store is exported along with the RootState and AppDispatch types. The RootState type is used in the useSelector hooks to get the state of the store.
Multiple different components (each with their own hierarchy) will access this store to get the state and dispatch actions to update the state, asynchronously. */

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