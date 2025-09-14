import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GroundTruthData, PredictionData, NowcastTrendsData, SeasonOption } from "@/types/domains/forecasting";

interface CoreDataState {
  isLoaded: boolean;
  loadedSeasons: string[]; // Track which seasons have been loaded

  mainData: {
    groundTruthData: GroundTruthData;
    predictionData: PredictionData;
    nowcastTrends: NowcastTrendsData;
  };
}

const initialState: CoreDataState = {
  isLoaded: false,
  loadedSeasons: [],

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
    // New reducer for incremental season loading
    addSeasonData: (state, action: PayloadAction<{
      seasonId: string;
      groundTruthData?: any;
      predictionsData?: any;
      nowcastTrendsData?: any;
    }>) => {
      const { seasonId, groundTruthData, predictionsData, nowcastTrendsData } = action.payload;
      
      // Add ground truth data for this season
      if (groundTruthData) {
        state.mainData.groundTruthData[seasonId] = groundTruthData;
      }
      
      // Add predictions data for this season
      if (predictionsData) {
        state.mainData.predictionData[seasonId] = predictionsData;
      }
      
      // Merge nowcast trends (they're keyed by model, not season)
      if (nowcastTrendsData) {
        Object.entries(nowcastTrendsData).forEach(([modelName, modelData]) => {
          if (!state.mainData.nowcastTrends[modelName]) {
            state.mainData.nowcastTrends[modelName] = {};
          }
          Object.assign(state.mainData.nowcastTrends[modelName], modelData);
        });
      }
      
      // Track that this season has been loaded
      if (!state.loadedSeasons.includes(seasonId)) {
        state.loadedSeasons.push(seasonId);
      }
      
      // Mark as loaded if at least one season is loaded
      if (state.loadedSeasons.length > 0) {
        state.isLoaded = true;
      }
    },
    clearCoreData: (state) => {
      state.mainData = {
        groundTruthData: {},
        predictionData: {},
        nowcastTrends: {},
      };
      state.loadedSeasons = [];
      state.isLoaded = false;
    },
  },
});

export const { setCoreJsonData, addSeasonData, clearCoreData } = coreDataSlice.actions;
export default coreDataSlice.reducer;
