// src/app/store/forecastSettingsSlice.ts
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {SeasonOption} from '../Interfaces/forecast-interfaces';

interface EvaluationsSettingsState {
    evaluationSingleViewModel: string; //Single Model view page allows only 1 model to be selected at a time
    evaluationHorizon: number; //how many weeks ahead from reference date (matching surveillance week's number) should we look for as target_end_date in predictions to draw the intervals
    evaluationSeasonOptions: SeasonOption[];
    evaluationScores: any; //TODO: Implement after discussion
}

const initialState: EvaluationsSettingsState = {
    evaluationSingleViewModel: "MOBS-GLEAM_FLUH",
    evaluationHorizon: 0,
    evaluationSeasonOptions: [],
    evaluationScores: null
};

const evaluationsSettingsSlice = createSlice({
    name: 'evaluations-settings-slice',
    initialState,
    reducers: {
        updateEvaluationSingleViewModel: (state, action: PayloadAction<string>) => {
            state.evaluationSingleViewModel = action.payload;
        },
        updateEvaluationHorizon: (state, action: PayloadAction<number>) => {
            state.evaluationHorizon = action.payload;
        },
        updateEvaluationSeasonOptions: (state, action: PayloadAction<SeasonOption[]>) => {
            state.evaluationSeasonOptions = action.payload;
        },

        /*TODO: Implement reducer for scores once discussed*/
        /*updateEvaluationScores: (state, action: PayloadAction<any>) => {
            state.evaluationScores = action.payload;
        },*/
    },
});

export const {
    updateEvaluationSingleViewModel,
    updateEvaluationHorizon,
    updateEvaluationSeasonOptions,
    //updateEvaluationScores
} = evaluationsSettingsSlice.actions;

export default evaluationsSettingsSlice.reducer;
