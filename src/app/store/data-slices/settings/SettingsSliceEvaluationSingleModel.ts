// src/app/store/forecastSettingsSlice.ts
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { SeasonOption } from '@/types/domains/forecasting';
import {parseISO} from "date-fns";

interface EvaluationsSettingsState {
    /* Location Related */
    evaluationsSingleModelViewSelectedStateName: string; // Single model view's selected U.S. State code "US" or something like "05"
    evaluationsSingleModelViewSelectedStateCode: string;

    /* Model Related*/
    evaluationsSingleModelViewModel: string; //Single Model view page allows only 1 model to be selected at a time
    evaluationSingleModelViewHorizon: number; //how many weeks ahead from reference date (matching surveillance week's number) should we look for as target_end_date in predictions to draw the intervals
    evaluationSingleModelViewScoresOption: any; 

    /* Time Range Related */
    evaluationsSingleModelViewDateStart: Date;
    evaluationSingleModelViewDateEnd: Date;
    evaluationsSingleModelViewSeasonId: string;
    evaluationSingleModelViewSeasonOptions: SeasonOption[];
}

const initialState: EvaluationsSettingsState = {
    /* Location Defaults */
    evaluationsSingleModelViewSelectedStateName: "US",
    evaluationsSingleModelViewSelectedStateCode: "US",

    /* Model Defaults*/
    evaluationsSingleModelViewModel: "MOBS-GLEAM_FLUH",
    evaluationSingleModelViewHorizon: 0,
    evaluationSingleModelViewScoresOption: "MAPE",

    /* Time Range Defaults*/
    evaluationsSingleModelViewSeasonId: "", // <-- Changed from dateRange, will be set by DataProvider
    evaluationsSingleModelViewDateStart: parseISO("2023-08-01T12:00:00Z"),
    evaluationSingleModelViewDateEnd: parseISO("2024-05-04T12:00:00Z"),
    evaluationSingleModelViewSeasonOptions: [],
};

const evaluationsSingleModelSettingsSlice = createSlice({
    name: 'evaluations-single-model-settings-slice',
    initialState,
    reducers: {
        updateEvaluationSingleModelViewSelectedState: (state, action: PayloadAction<{
            stateName: string;
            stateNum: string
        }>) => {
            state.evaluationsSingleModelViewSelectedStateName = action.payload.stateName;
            state.evaluationsSingleModelViewSelectedStateCode = action.payload.stateNum;
        },
        updateEvaluationsSingleModelViewModel: (state, action: PayloadAction<string>) => {
            state.evaluationsSingleModelViewModel = action.payload;
        },
        updateEvaluationSingleModelViewHorizon: (state, action: PayloadAction<number>) => {
            state.evaluationSingleModelViewHorizon = action.payload;
        },
        updateEvaluationSingleModelViewSeasonOptions: (state, action: PayloadAction<SeasonOption[]>) => {
            state.evaluationSingleModelViewSeasonOptions = action.payload;
        },
        updateEvaluationSingleModelViewDateStart: (state, action: PayloadAction<Date>) => {
            state.evaluationsSingleModelViewDateStart = action.payload;
        },
        updateEvaluationSingleModelViewDateEnd: (state, action: PayloadAction<Date>) => {
            state.evaluationSingleModelViewDateEnd = action.payload;
        },
        updateEvaluationsSingleModelViewSeasonId: (state, action: PayloadAction<string>) => { // <-- Renamed from updateEvaluationsSingleModelViewDateRange
            state.evaluationsSingleModelViewSeasonId = action.payload;
        },

        /*TODO: Implement reducer for scores once discussed*/
        updateEvaluationScores: (state, action: PayloadAction<any>) => {

            state.evaluationSingleModelViewScoresOption = action.payload;
        },
    },
});

export const {
    updateEvaluationsSingleModelViewModel,
    updateEvaluationSingleModelViewHorizon,
    updateEvaluationSingleModelViewSeasonOptions,
    updateEvaluationSingleModelViewSelectedState,
    updateEvaluationSingleModelViewDateStart,
    updateEvaluationSingleModelViewDateEnd,
    updateEvaluationsSingleModelViewSeasonId, // <-- Renamed
    /* TODO: uncomment this after scores options are implemented */
    updateEvaluationScores
} = evaluationsSingleModelSettingsSlice.actions;

export default evaluationsSingleModelSettingsSlice.reducer;