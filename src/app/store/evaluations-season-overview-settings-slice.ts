// src/app/store/forecastSettingsSlice.ts
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {SeasonOption} from '../interfaces/forecast-interfaces';
import {parseISO} from "date-fns";

interface EvaluationsSeasonOverviewSettingsState {
    /* Location Related */
    evaluationsSeasonOverviewViewSelectedStateName: string; // Single model view's selected U.S. State code "US" or something like "05"
    evaluationsSeasonOverviewViewSelectedStateCode: string;

    /* Model Related*/
    evaluationsSeasonOverviewViewModel: string; //Single Model view page allows only 1 model to be selected at a time
    evaluationSeasonOverviewViewHorizon: number; //how many weeks ahead from reference date (matching surveillance week's number) should we look for as target_end_date in predictions to draw the intervals
    evaluationSeasonOverviewViewScoresOption: any; //TODO: Implement after discussion

    /* Time Range Related */
    evaluationsSeasonOverviewViewDateStart: Date;
    evaluationSeasonOverviewViewDateEnd: Date;
    evaluationsSeasonOverviewViewDateRange: string;
    evaluationSeasonOverviewViewSeasonOptions: SeasonOption[];
}

const initialState: EvaluationsSeasonOverviewSettingsState = {
    /* Location Defaults */
    evaluationsSeasonOverviewViewSelectedStateName: "US",
    evaluationsSeasonOverviewViewSelectedStateCode: "US",

    /* Model Defaults*/
    evaluationsSeasonOverviewViewModel: "MOBS-GLEAM_FLUH",
    evaluationSeasonOverviewViewHorizon: 0,
    evaluationSeasonOverviewViewScoresOption: "MAPE",

    /* Time Range Defaults*/
    evaluationsSeasonOverviewViewDateRange: "2023-08-01/2024-05-18",
    evaluationsSeasonOverviewViewDateStart: parseISO("2023-08-01T12:00:00Z"),
    evaluationSeasonOverviewViewDateEnd: parseISO("2024-05-04T12:00:00Z"),
    evaluationSeasonOverviewViewSeasonOptions: [],
};

const evaluationsSeasonOverviewSettingsSlice = createSlice({
    name: 'evaluations-single-model-settings-slice',
    initialState,
    reducers: {
        updateEvaluationSeasonOverviewViewSelectedState: (state, action: PayloadAction<{
            stateName: string;
            stateNum: string
        }>) => {
            state.evaluationsSeasonOverviewViewSelectedStateName = action.payload.stateName;
            state.evaluationsSeasonOverviewViewSelectedStateCode = action.payload.stateNum;
        },
        updateEvaluationsSeasonOverviewViewModel: (state, action: PayloadAction<string>) => {
            state.evaluationsSeasonOverviewViewModel = action.payload;
        },
        updateEvaluationSeasonOverviewViewHorizon: (state, action: PayloadAction<number>) => {
            state.evaluationSeasonOverviewViewHorizon = action.payload;
        },
        updateEvaluationSeasonOverviewViewSeasonOptions: (state, action: PayloadAction<SeasonOption[]>) => {
            state.evaluationSeasonOverviewViewSeasonOptions = action.payload;
        },
        updateEvaluationSeasonOverviewViewDateStart: (state, action: PayloadAction<Date>) => {
            state.evaluationsSeasonOverviewViewDateStart = action.payload;
        },
        updateEvaluationSeasonOverviewViewDateEnd: (state, action: PayloadAction<Date>) => {
            state.evaluationSeasonOverviewViewDateEnd = action.payload;
        },
        updateEvaluationsSeasonOverviewViewDateRange: (state, action: PayloadAction<string>) => {
            // console.debug("DEBUG: Redux: evaluations-single-model-settings-slice.ts: updateEvaluationsSeasonOverviewViewDateRange", action.payload);
            state.evaluationsSeasonOverviewViewDateRange = action.payload;
        },

        /*TODO: Implement reducer for scores once discussed*/
        updateEvaluationScores: (state, action: PayloadAction<any>) => {
            console.debug("DEBUG: Redux: evaluations-single-model-settings-slice.ts: updateEvaluationScores", action.payload);
            state.evaluationSeasonOverviewViewScoresOption = action.payload;
        },
    },
});

export const {
    updateEvaluationsSeasonOverviewViewModel,
    updateEvaluationSeasonOverviewViewHorizon,
    updateEvaluationSeasonOverviewViewSeasonOptions,
    updateEvaluationSeasonOverviewViewSelectedState,
    updateEvaluationSeasonOverviewViewDateStart,
    updateEvaluationSeasonOverviewViewDateEnd,
    updateEvaluationsSeasonOverviewViewDateRange,
    /* TODO: uncomment this after scores options are implemented */
    updateEvaluationScores
} = evaluationsSeasonOverviewSettingsSlice.actions;

export default evaluationsSeasonOverviewSettingsSlice.reducer;


