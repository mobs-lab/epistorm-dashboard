import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LocationData, StateThresholdsDict, HistoricalDataMap, SeasonOption } from "@/types/domains/forecasting";

interface AuxiliaryDataState {
  isLoaded: boolean;
  locations: LocationData[];
  thresholds: StateThresholdsDict;
  metadata: {
    fullRangeSeasons?: SeasonOption[];
    dynamicTimePeriod?: SeasonOption[];
    modelNames?: string[];
    defaultSeasonTimeValue?: string;
    defaultSelectedDate?: string;
  };
}

const initialState: AuxiliaryDataState = {
  isLoaded: false,
  locations: [],
  thresholds: {},
  metadata: {},
};

const auxiliaryDataSlice = createSlice({
  name: "auxiliaryData",
  initialState,
  reducers: {
    setAuxiliaryJsonData: (state, action: PayloadAction<any>) => {
      state.locations = action.payload.locations || [];
      state.thresholds = action.payload.thresholds || {};
      state.metadata = action.payload.metadata || {};
      state.isLoaded = true;
    },
    clearAuxiliaryData: (state) => {
      state.locations = [];
      state.thresholds = {};
      state.metadata = {};
      state.isLoaded = false;
    },
  },
});

export const { setAuxiliaryJsonData, clearAuxiliaryData } = auxiliaryDataSlice.actions;
export default auxiliaryDataSlice.reducer;
