// src/app/store/forecastSettingsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EvaluationsSeasonOverviewSeasonOption } from "../interfaces/forecast-interfaces";

interface EvaluationsSeasonOverviewSettingsState {
  /* Model Related*/
  evaluationSeasonOverviewHorizon: number; //how many weeks ahead from reference date (matching surveillance week's number) should we look for as target_end_date in predictions to draw the intervals

  /* Time Range Related */
  evaluationSeasonOverviewSeasonOptions: EvaluationsSeasonOverviewSeasonOption[];
}

const initialState: EvaluationsSeasonOverviewSettingsState = {
  /* Model Defaults*/
  evaluationSeasonOverviewHorizon: 0,

  /* Time Range Defaults*/
  evaluationSeasonOverviewSeasonOptions: [],
};

const evaluationsSeasonOverviewSettingsSlice = createSlice({
  name: "evaluations-single-model-settings-slice",
  initialState,
  reducers: {
    updateEvaluationSeasonOverviewViewHorizon: (
      state,
      action: PayloadAction<number>
    ) => {
      state.evaluationSeasonOverviewHorizon = action.payload;
    },
    updateEvaluationSeasonOverviewViewSeasonOptions: (
      state,
      action: PayloadAction<EvaluationsSeasonOverviewSeasonOption[]>
    ) => {
      state.evaluationSeasonOverviewSeasonOptions = action.payload;
    },
  },
});

export const {
  updateEvaluationSeasonOverviewViewHorizon,
  updateEvaluationSeasonOverviewViewSeasonOptions,
} = evaluationsSeasonOverviewSettingsSlice.actions;

export default evaluationsSeasonOverviewSettingsSlice.reducer;
