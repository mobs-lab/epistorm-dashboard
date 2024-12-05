// src/app/store/locationSlice.ts
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {LocationData} from '../../Interfaces/forecast-interfaces';

interface LocationState {
    data: LocationData[];
}

const initialState: LocationState = {
    data: [],
};

const locationSlice = createSlice({
    name: 'location',
    initialState,
    reducers: {
        setLocationData: (state, action: PayloadAction<LocationData[]>) => {
            state.data = action.payload;
        },
    },
});

export const {setLocationData} = locationSlice.actions;

export default locationSlice.reducer;