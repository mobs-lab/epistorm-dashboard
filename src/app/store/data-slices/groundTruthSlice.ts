// src/app/store/groundTruthSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataPoint } from '@/types/domains/forecasting';

interface GroundTruthState {
    data: DataPoint[];
}

const initialState: GroundTruthState = {
    data: [],
};

const groundTruthSlice = createSlice({
    name: 'groundTruth',
    initialState,
    reducers: {
        setGroundTruthData: (state, action: PayloadAction<DataPoint[]>) => {
            state.data = action.payload;
        },
    },
});

export const { setGroundTruthData } = groundTruthSlice.actions;

export default groundTruthSlice.reducer;