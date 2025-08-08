import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Evaluation data structure matching DataContract.md
interface EvaluationDataState {
  // Flag to track if JSON data is loaded
  isJsonDataLoaded: boolean;

  // Pre-calculated evaluation data
  precalculated: {
    iqr: {
      [seasonId: string]: {
        [metric: string]: {
          // "WIS/Baseline", "MAPE", "Coverage"
          [model: string]: {
            [horizon: number]: {
              q05: number;
              q25: number;
              median: number;
              q75: number;
              q95: number;
              min: number;
              max: number;
              mean: number;
              count: number;
              scores: number[];
            };
          };
        };
      };
    };
    stateMap_aggregates: {
      [seasonId: string]: {
        [metric: string]: {
          [model: string]: {
            [stateNum: string]: {
              [horizon: number]: {
                sum: number;
                count: number;
              };
            };
          };
        };
      };
    };
    detailedCoverage_aggregates: {
      [seasonId: string]: {
        [model: string]: {
          [horizon: number]: {
            [pi_level: number]: {
              // 10, 20, 30, ... 98
              sum: number;
              count: number;
            };
          };
        };
      };
    };
  };
}

const initialState: EvaluationDataState = {
  isJsonDataLoaded: false,
  precalculated: {
    iqr: {},
    stateMap_aggregates: {},
    detailedCoverage_aggregates: {},
  },
};

const evaluationDataSlice = createSlice({
  name: "evaluationData",
  initialState,
  reducers: {
    setEvaluationJsonData: (state, action: PayloadAction<EvaluationDataState["precalculated"]>) => {
      state.precalculated = action.payload;
      state.isJsonDataLoaded = true;
      console.debug("JSON evaluation data loaded successfully");
    },
    clearEvaluationJsonData: (state) => {
      state.precalculated = {
        iqr: {},
        stateMap_aggregates: {},
        detailedCoverage_aggregates: {},
      };
      state.isJsonDataLoaded = false;
      console.debug("Cleared JSON evaluation data, falling back to CSV");
    },
    // DEBUG: Helper methods for debugging
    updateIQRData: (state, action: PayloadAction<any>) => {
      state.precalculated.iqr = action.payload;
    },
    updateStateMapAggregates: (state, action: PayloadAction<any>) => {
      state.precalculated.stateMap_aggregates = action.payload;
    },
    updateDetailedCoverageAggregates: (state, action: PayloadAction<any>) => {
      state.precalculated.detailedCoverage_aggregates = action.payload;
    },
  },
});

export const { setEvaluationJsonData, clearEvaluationJsonData, updateIQRData, updateStateMapAggregates, updateDetailedCoverageAggregates } =
  evaluationDataSlice.actions;

export default evaluationDataSlice.reducer;
