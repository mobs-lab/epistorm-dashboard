import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDataEvaluationsPrecalculated, AppDataEvaluationsSingleModelRawScores } from "@/types/domains/evaluations";

// Evaluation data structure matching DataContract.md
interface EvaluationDataState {
  // Flag to track if JSON data is loaded
  isJsonDataLoaded: boolean;

  // Pre-calculated evaluation data
  precalculated: AppDataEvaluationsPrecalculated;
  rawScores: AppDataEvaluationsSingleModelRawScores;
}

const initialState: EvaluationDataState = {
  isJsonDataLoaded: false,
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
      console.debug("JSON evaluation data loaded successfully into Redux `evaluationDataSlice`");
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
  },
});

export const { setEvaluationJsonData, clearEvaluationJsonData } =
  evaluationDataSlice.actions;

export default evaluationDataSlice.reducer;
