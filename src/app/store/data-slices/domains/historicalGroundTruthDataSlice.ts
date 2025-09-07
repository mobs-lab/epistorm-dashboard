import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { HistoricalDataMap } from "@/types/domains/forecasting";

interface HistoricalGroundTruthDataState {
  isLoaded: boolean;
  historicalDataMap: HistoricalDataMap;
}

const initialState: HistoricalGroundTruthDataState = {
  isLoaded: false,

  historicalDataMap: {},
};

const historicalGroundTruthDataSlice = createSlice({
  name: "historicalGroundTruthData",
  initialState,
  reducers: {
    setHistoricalGroundTruthJsonData: (state, action: PayloadAction<any>) => {
      state.historicalDataMap = action.payload.historicalDataMap || {};
      state.isLoaded = true;
    },
    clearHistoricalGroundTruthData: (state) => {
      state.historicalDataMap = {};
      state.isLoaded = false;
    },
  },
});

export const { setHistoricalGroundTruthJsonData, clearHistoricalGroundTruthData } = historicalGroundTruthDataSlice.actions;
export default historicalGroundTruthDataSlice.reducer;
