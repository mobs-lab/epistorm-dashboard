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
    historicalDataMode: boolean;
    seasonOptions: SeasonOption[];

//  Note: For RiskLevel Visualization Widgets only, another variable to keep track of the selected Prediction model (a single one) that should only affects the RiskLevel Visualization Widgets themselves.
    userSelectedRiskLevelModel: string;
//  Note: For ForecastChart to report back the userSelectedWeek to the whole page, for sibling components to use, for example the NowcastGauge and RiskLevelThermometer (inside NowcastStateThermo.tsx)
    userSelectedWeek: Date;
}

const initialState: FilterState = {
    selectedStateName: "United States",
    USStateNum: "US",
    forecastModel: ["MOBS-GLEAM_FLUH"],
    numOfWeeksAhead: 3,
    dateRange: "2023-2024",
    dateStart: new Date("2023-08-02T12:00:00Z"),
    dateEnd: new Date("2024-08-01T12:00:00Z"),
    yAxisScale: "linear",
    confidenceInterval: ["90"],
    historicalDataMode: false,
    seasonOptions: [],
    userSelectedRiskLevelModel: "MOBS-GLEAM_FLUH",
    userSelectedWeek: new Date("2024-05-04T12:00:00.000Z")
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
        updateHistoricalDataMode: (state, action: PayloadAction<boolean>) => {
            state.historicalDataMode = action.payload;
        },
        setSeasonOptions: (state, action: PayloadAction<SeasonOption[]>) => {
            state.seasonOptions = action.payload;
        },
        updateDateRange: (state, action: PayloadAction<{ dateStart: Date; dateEnd: Date }>) => {
            console.log("updateDateRange", action.payload);
            state.dateStart = action.payload.dateStart;
            state.dateEnd = action.payload.dateEnd;
        },
        updateUserSelectedRiskLevelModel: (state, action: PayloadAction<string>) => {
            state.userSelectedRiskLevelModel = action.payload;
        },
        updateUserSelectedWeek: (state, action: PayloadAction<Date>) => {
            state.userSelectedWeek = action.payload;
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
    updateHistoricalDataMode,
    updateDateRange,
    setSeasonOptions,
    updateUserSelectedRiskLevelModel,
    updateUserSelectedWeek
} = filterSlice.actions;

export default filterSlice.reducer;