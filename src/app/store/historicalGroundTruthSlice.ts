import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataPoint } from '../Interfaces/forecast-interfaces';

export interface HistoricalDataEntry {
    associatedDate: Date;
    historicalData: DataPoint[];
}

interface HistoricalGroundTruthState {
    data: HistoricalDataEntry[];
}

const initialState: HistoricalGroundTruthState = {
    data: [],
};

const historicalGroundTruthSlice = createSlice({
    name: 'historicalGroundTruth',
    initialState,
    reducers: {
        setHistoricalGroundTruthData: (state, action: PayloadAction<HistoricalDataEntry[]>) => {
            state.data = action.payload;
        },
    },
});

export const { setHistoricalGroundTruthData } = historicalGroundTruthSlice.actions;

export default historicalGroundTruthSlice.reducer;