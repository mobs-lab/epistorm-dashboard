// src/app/store/Data/evaluationsSingleModelScoreDataSlice.ts

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
    EvaluationsScoreDataCollection,
} from '../../interfaces/forecast-interfaces';

interface EvaluationsSingleModelScoreDataState {
    data: EvaluationsScoreDataCollection[];
}

const initialState: EvaluationsSingleModelScoreDataState = {
    data: [],
};

const evaluationsSingleModelScoreDataSlice = createSlice({
    name: 'evaluationsSingleModelScoreData',
    initialState,
    reducers: {
        setEvaluationsSingleModelScoreData: (state, action: PayloadAction<EvaluationsScoreDataCollection[]>) => {
            state.data = action.payload;
        },
    },
});

export const {setEvaluationsSingleModelScoreData} = evaluationsSingleModelScoreDataSlice.actions;

export default evaluationsSingleModelScoreDataSlice.reducer;