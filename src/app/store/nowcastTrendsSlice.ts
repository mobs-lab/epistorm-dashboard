import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NowcastTrend, NowcastTrendsState } from '../Interfaces/forecast-interfaces';


const initialState: NowcastTrendsState = {
    data: [],
};

const nowcastTrendsSlice = createSlice({
    name: 'nowcastTrends',
    initialState,
    reducers: {
        setNowcastTrendsData: (state, action: PayloadAction<NowcastTrend[]>) => {
            state.data = action.payload;
        },
    },
});

export const { setNowcastTrendsData } = nowcastTrendsSlice.actions;

export default nowcastTrendsSlice.reducer;