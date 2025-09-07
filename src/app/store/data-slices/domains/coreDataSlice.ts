import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GroundTruthData, PredictionData, NowcastTrendsData, SeasonOption } from "@/types/domains/forecasting";

interface CoreDataState {
  isLoaded: boolean;

  mainData: {
    groundTruthData: GroundTruthData;
    predictionData: PredictionData;
    nowcastTrends: NowcastTrendsData;
  };
}

const initialState: CoreDataState = {
  isLoaded: false,

  mainData: {
    groundTruthData: {},
    predictionData: {},
    nowcastTrends: {},
  },
};

const coreDataSlice = createSlice({
  name: "coreData",
  initialState,
  reducers: {
    setCoreJsonData: (state, action: PayloadAction<any>) => {
      state.mainData = {
        groundTruthData: action.payload.mainData?.groundTruthData || {},
        predictionData: action.payload.mainData?.predictionData || {},
        nowcastTrends: action.payload.mainData?.nowcastTrends || {},
      };
      state.isLoaded = true;
    },
    clearCoreData: (state) => {
      state.mainData = {
        groundTruthData: {},
        predictionData: {},
        nowcastTrends: {},
      };
      state.isLoaded = false;
    },
  },
});

export const { setCoreJsonData, clearCoreData } = coreDataSlice.actions;
export default coreDataSlice.reducer;
