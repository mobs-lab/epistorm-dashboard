import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LocationData, StateThresholdsDict, HistoricalDataMap } from "@/types/domains/forecasting";

interface AuxiliaryDataState {
  isLoaded: boolean;
  locations: LocationData[];
  thresholds: StateThresholdsDict;
  historicalDataMap: HistoricalDataMap;
}

const initialState: AuxiliaryDataState = {
  isLoaded: false,
  locations: [],
  thresholds: {},
  historicalDataMap: {},
};

const auxiliaryDataSlice = createSlice({
  name: "auxiliaryData",
  initialState,
  reducers: {
    setAuxiliaryJsonData: (state, action: PayloadAction<any>) => {
      state.locations = action.payload.locations || [];
      state.thresholds = action.payload.thresholds || {};
      state.historicalDataMap = action.payload.historicalDataMap || {};
      state.isLoaded = true;
    },
    clearAuxiliaryData: (state) => {
      state.locations = [];
      state.thresholds = {};
      state.historicalDataMap = {};
      state.isLoaded = false;
    },
  },
});

export const { setAuxiliaryJsonData, clearAuxiliaryData } = auxiliaryDataSlice.actions;
export default auxiliaryDataSlice.reducer;
