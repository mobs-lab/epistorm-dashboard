// src/app/store/predictionsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModelPrediction } from '@/interfaces/forecast-interfaces';

interface PredictionsState {
    data: ModelPrediction[];
}

const initialState: PredictionsState = {
    data: [],
};

const predictionsSlice = createSlice({
    name: 'predictions',
    initialState,
    reducers: {
        setPredictionsData: (state, action: PayloadAction<ModelPrediction[]>) => {
            state.data = action.payload;
        },
    },
});

export const { setPredictionsData } = predictionsSlice.actions;

export default predictionsSlice.reducer;