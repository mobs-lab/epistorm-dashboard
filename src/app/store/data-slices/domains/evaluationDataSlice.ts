import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDataEvaluationsPrecalculated, AppDataEvaluationsSingleModelRawScores } from "@/types/domains/evaluations";

// Evaluation data structure matching DataContract.md
interface EvaluationDataState {
  // Flag to track if JSON data is loaded
  isJsonDataLoaded: boolean;
  loadedPeriods: string[]; // Track which periods/seasons have been loaded
  loadedRawScoreSeasons: string[]; // Track which seasons have raw scores loaded

  // Pre-calculated evaluation data
  precalculated: AppDataEvaluationsPrecalculated;
  rawScores: AppDataEvaluationsSingleModelRawScores;
}

const initialState: EvaluationDataState = {
  isJsonDataLoaded: false,
  loadedPeriods: [],
  loadedRawScoreSeasons: [],
  precalculated: {
    iqr: {},
    stateMap_aggregates: {},
    detailedCoverage_aggregates: {},
  },
  rawScores: {},
};

const evaluationDataSlice = createSlice({
  name: "evaluationData",
  initialState,
  reducers: {
    setEvaluationJsonData: (state, action: PayloadAction<any>) => {
      state.precalculated = action.payload.precalculated || action.payload;
      state.rawScores = action.payload.rawScores || {};
      state.isJsonDataLoaded = true;
    },
    // Add precalculated data for a specific period/season
    addPrecalculatedData: (state, action: PayloadAction<{
      periodId: string;
      data: any;
    }>) => {
      const { periodId, data } = action.payload;
      
      if (data.precalculated) {
        // Merge IQR data
        if (data.precalculated.iqr) {
          state.precalculated.iqr[periodId] = data.precalculated.iqr[periodId] || data.precalculated.iqr;
        }
        
        // Merge state map aggregates
        if (data.precalculated.stateMap_aggregates) {
          state.precalculated.stateMap_aggregates[periodId] = 
            data.precalculated.stateMap_aggregates[periodId] || data.precalculated.stateMap_aggregates;
        }
        
        // Merge coverage aggregates
        if (data.precalculated.detailedCoverage_aggregates) {
          state.precalculated.detailedCoverage_aggregates[periodId] = 
            data.precalculated.detailedCoverage_aggregates[periodId] || data.precalculated.detailedCoverage_aggregates;
        }
      }
      
      // Track that this period has been loaded
      if (!state.loadedPeriods.includes(periodId)) {
        state.loadedPeriods.push(periodId);
      }
      
      // Mark as loaded if at least one period is loaded
      if (state.loadedPeriods.length > 0) {
        state.isJsonDataLoaded = true;
      }
    },
    // Add raw scores for a specific season
    addRawScores: (state, action: PayloadAction<{
      seasonId: string;
      data: any;
    }>) => {
      const { seasonId, data } = action.payload;
      
      if (data.rawScores) {
        state.rawScores[seasonId] = data.rawScores[seasonId] || data.rawScores;
      }
      
      // Track that this season's raw scores have been loaded
      if (!state.loadedRawScoreSeasons.includes(seasonId)) {
        state.loadedRawScoreSeasons.push(seasonId);
      }
    },
    clearEvaluationJsonData: (state) => {
      state.precalculated = {
        iqr: {},
        stateMap_aggregates: {},
        detailedCoverage_aggregates: {},
      };
      state.rawScores = {};
      state.loadedPeriods = [];
      state.loadedRawScoreSeasons = [];
      state.isJsonDataLoaded = false;
    },
  },
});

export const { setEvaluationJsonData, addPrecalculatedData, addRawScores, clearEvaluationJsonData } = evaluationDataSlice.actions;

export default evaluationDataSlice.reducer;
