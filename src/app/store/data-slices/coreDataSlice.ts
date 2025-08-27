import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { 
  GroundTruthData, 
  PredictionData, 
  NowcastTrendsData, 
  HistoricalDataMap,
  LocationData,
  StateThresholds,
  SeasonOption
} from "@/types/domains/forecasting";

interface CoreDataState {
  isLoaded: boolean;
  metadata: {
    seasons?: {
      fullRangeSeasons: SeasonOption[];
      dynamicTimePeriod: SeasonOption[];
    };
    modelNames?: string[];
    defaultSeasonTimeValue?: string;
  };
  mainData: {
    groundTruthData: GroundTruthData;
    predictionData: PredictionData;
    nowcastTrends: NowcastTrendsData;
    historicalDataMap: HistoricalDataMap;
  };
  auxiliaryData: {
    locations: LocationData[];
    thresholds: StateThresholds[];
  };
}

const initialState: CoreDataState = {
  isLoaded: false,
  metadata: {},
  mainData: {
    groundTruthData: {},
    predictionData: {},
    nowcastTrends: {},
    historicalDataMap: {},
  },
  auxiliaryData: {
    locations: [],
    thresholds: [],
  },
};

const coreDataSlice = createSlice({
  name: "coreData",
  initialState,
  reducers: {
    setCoreJsonData: (state, action: PayloadAction<any>) => {
      state.metadata = action.payload.metadata || {};
      state.mainData = {
        groundTruthData: action.payload.mainData?.groundTruthData || {},
        predictionData: action.payload.mainData?.predictionData || {},
        nowcastTrends: action.payload.mainData?.nowcastTrends || {},
        historicalDataMap: action.payload.mainData?.historicalDataMap || {},
      };
      state.auxiliaryData = {
        locations: action.payload.auxiliaryData?.locations || action.payload["auxiliary-data"]?.locations || [],
        thresholds: action.payload.auxiliaryData?.thresholds || action.payload["auxiliary-data"]?.thresholds || [],
      };
      state.isLoaded = true;
    },
    clearCoreData: (state) => {
      state.metadata = {};
      state.mainData = {
        groundTruthData: {},
        predictionData: {},
        nowcastTrends: {},
        historicalDataMap: {},
      };
      state.auxiliaryData = {
        locations: [],
        thresholds: [],
      };
      state.isLoaded = false;
    },
  },
});

export const { setCoreJsonData, clearCoreData } = coreDataSlice.actions;
export default coreDataSlice.reducer;