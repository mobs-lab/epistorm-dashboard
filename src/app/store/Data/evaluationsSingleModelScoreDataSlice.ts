// src/app/store/Data/evaluationsSingleModelScoreDataSlice.ts

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
    EvaluationsSingleModelScoreDataCollection,
} from '../../interfaces/forecast-interfaces';

interface EvaluationsSingleModelScoreDataState {
    data: EvaluationsSingleModelScoreDataCollection[];
}

const initialState: EvaluationsSingleModelScoreDataState = {
    data: [],
};

const evaluationsSingleModelScoreDataSlice = createSlice({
    name: 'evaluationsSingleModelScoreData',
    initialState,
    reducers: {
        setEvaluationsSingleModelScoreData: (state, action: PayloadAction<EvaluationsSingleModelScoreDataCollection[]>) => {
            state.data = action.payload;
        },
    },
});

export const {setEvaluationsSingleModelScoreData} = evaluationsSingleModelScoreDataSlice.actions;

export default evaluationsSingleModelScoreDataSlice.reducer;