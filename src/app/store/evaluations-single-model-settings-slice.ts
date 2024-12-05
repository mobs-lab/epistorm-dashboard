// src/app/store/forecastSettingsSlice.ts
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {SeasonOption} from '../Interfaces/forecast-interfaces';
import {parseISO} from "date-fns";

interface EvaluationsSettingsState {
    /* Location Related */
    evaluationSingleModelViewSelectedStateName: string; // Single model view's selected U.S. State code "US" or something like "05"
    evaluationsSingleModelViewSelectedStateCode: string;

    /* Model Related*/
    evaluationSingleModelViewModel: string; //Single Model view page allows only 1 model to be selected at a time
    evaluationSingleModelViewHorizon: number; //how many weeks ahead from reference date (matching surveillance week's number) should we look for as target_end_date in predictions to draw the intervals
    evaluationSingleModelViewScores: any; //TODO: Implement after discussion

    /* Time Range Related */
    evaluationsSingleModelViewDateStart: Date;
    evaluationSingleModelViewDateEnd: Date;
    evaluationsSingleModelViewDateRange: string;
    evaluationSingleModelViewSeasonOptions: SeasonOption[];
}

const initialState: EvaluationsSettingsState = {
    /* Location Defaults */
    evaluationSingleModelViewSelectedStateName: "US",
    evaluationsSingleModelViewSelectedStateCode: "US",

    /* Model Defaults*/
    evaluationSingleModelViewModel: "MOBS-GLEAM_FLUH",
    evaluationSingleModelViewHorizon: 0,
    evaluationSingleModelViewScores: null,

    /* Time Range Defaults*/
    evaluationsSingleModelViewDateRange: "2023-08-01/2024-05-18",
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
            state.evaluationSingleModelViewSelectedStateName = action.payload.stateName;
            state.evaluationsSingleModelViewSelectedStateCode = action.payload.stateNum;
        },
        updateEvaluationSingleModelViewModel: (state, action: PayloadAction<string>) => {
            state.evaluationSingleModelViewModel = action.payload;
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
        updateEvaluationsSingleModelViewDateRange: (state, action: PayloadAction<string>) => {
            console.debug("DEBUG: Redux: evaluations-single-model-settings-slice.ts: updateEvaluationsSingleModelViewDateRange", action.payload);
            state.evaluationsSingleModelViewDateRange = action.payload;
        },

        /*TODO: Implement reducer for scores once discussed*/
        /*updateEvaluationScores: (state, action: PayloadAction<any>) => {
            state.evaluationSingleModelViewScores = action.payload;
        },*/
    },
});

export const {
    updateEvaluationSingleModelViewModel,
    updateEvaluationSingleModelViewHorizon,
    updateEvaluationSingleModelViewSeasonOptions,
    updateEvaluationSingleModelViewSelectedState,
    updateEvaluationSingleModelViewDateStart,
    updateEvaluationSingleModelViewDateEnd,
    updateEvaluationsSingleModelViewDateRange
    /* TODO: uncomment this after scores options are implemented */
    //updateEvaluationScores
} = evaluationsSingleModelSettingsSlice.actions;

export default evaluationsSingleModelSettingsSlice.reducer;


