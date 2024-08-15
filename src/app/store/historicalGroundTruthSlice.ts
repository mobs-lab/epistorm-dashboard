import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { HistoricalDataEntry} from '../Interfaces/forecast-interfaces';


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

export const {setHistoricalGroundTruthData} = historicalGroundTruthSlice.actions;

export default historicalGroundTruthSlice.reducer;