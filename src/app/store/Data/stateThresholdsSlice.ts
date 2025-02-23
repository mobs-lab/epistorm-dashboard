// src/app/store/stateThresholdsSlice.ts

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {StateThresholds} from '../../interfaces/forecast-interfaces';

interface StateThresholdsState {
    data: StateThresholds[];
}

const initialState: StateThresholdsState = {
    data: [],
};

const stateThresholdsSlice = createSlice({
    name: 'stateThresholds',
    initialState,
    reducers: {
        setStateThresholdsData: (state, action: PayloadAction<StateThresholds[]>) => {
            state.data = action.payload;
        },
    },
});

export const {setStateThresholdsData} = stateThresholdsSlice.actions;

export default stateThresholdsSlice.reducer;