// src/app/store/filterSlice.ts
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {SeasonOption} from '../Interfaces/forecast-interfaces';

interface FilterState {
    selectedStateName: string;
    USStateNum: string;
    forecastModel: string[];
    numOfWeeksAhead: number;
    dateStart: Date;
    dateEnd: Date;
    dateRange: string;
    yAxisScale: string;
    confidenceInterval: string[];
    displayMode: string;
    seasonOptions: SeasonOption[]; // Add this line
}

const initialState: FilterState = {
    selectedStateName: "US",
    USStateNum: "US",
    forecastModel: ["MOBS-GLEAM_FLUH"],
    numOfWeeksAhead: 3,
    dateRange: "2023-2024",
    dateStart: new Date("2023-08-02T00:00:00.000Z"),
    dateEnd: new Date("2024-08-01T00:00:00.000Z"),
    yAxisScale: "linear",
    confidenceInterval: ["90"],
    displayMode: "byDate",
    seasonOptions: [], // Add this line
};

const filterSlice = createSlice({
    name: 'filter',
    initialState,
    reducers: {
        updateSelectedState: (state, action: PayloadAction<{ stateName: string; stateNum: string }>) => {
            state.selectedStateName = action.payload.stateName;
            state.USStateNum = action.payload.stateNum;
        },
        updateForecastModel: (state, action: PayloadAction<string[]>) => {
            state.forecastModel = action.payload;
        },
        updateNumOfWeeksAhead: (state, action: PayloadAction<number>) => {
            state.numOfWeeksAhead = action.payload;
        },
        updateDateStart: (state, action: PayloadAction<Date>) => {
            state.dateStart = action.payload;
        },
        updateDateEnd: (state, action: PayloadAction<Date>) => {
            state.dateEnd = action.payload;
        },
        updateYScale: (state, action: PayloadAction<string>) => {
            state.yAxisScale = action.payload;
        },
        updateConfidenceInterval: (state, action: PayloadAction<string[]>) => {
            state.confidenceInterval = action.payload;
        },
        updateDisplayMode: (state, action: PayloadAction<string>) => {
            state.displayMode = action.payload;
        },
        setSeasonOptions: (state, action: PayloadAction<SeasonOption[]>) => {
            state.seasonOptions = action.payload;
        },
        updateDateRange: (state, action: PayloadAction<{ dateStart: Date; dateEnd: Date }>) => {
            state.dateStart = action.payload.dateStart;
            state.dateEnd = action.payload.dateEnd;
        }
    },
});

export const {
    updateSelectedState,
    updateForecastModel,
    updateNumOfWeeksAhead,
    updateDateStart,
    updateDateEnd,
    updateYScale,
    updateConfidenceInterval,
    updateDisplayMode,
    updateDateRange,
    setSeasonOptions
} = filterSlice.actions;

export default filterSlice.reducer;