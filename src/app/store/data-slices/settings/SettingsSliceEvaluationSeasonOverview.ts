// src/app/store/forecastSettingsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EvaluationSeasonOverviewTimeRangeOption } from "@/types/domains/evaluations";

interface EvaluationsSeasonOverviewSettingsState {
  /* Model Related*/
  evaluationSeasonOverviewHorizon: number[]; //how many weeks ahead from reference date (matching surveillance week's number) should we look for as target_end_date in predictions to draw the intervals
  evaluationSeasonOverviewSelectedModels: String[];

  /* Time Range Related */
  evalSOTimeRangeOptions: EvaluationSeasonOverviewTimeRangeOption[];
  selectedDynamicTimePeriod: string;

  /* Map selection panel related */
  mapSelectedModel: string;
  mapSelectedScoringOption: "WIS/Baseline" | "MAPE" | "Coverage";
  useLogColorScale: boolean;

  /* For Aggregated Box Plots, toggling linear/log mode display */
  wisChartScaleType: "linear" | "log";
  mapeChartScaleType: "linear" | "log";
}

const initialState: EvaluationsSeasonOverviewSettingsState = {
  /* Model Defaults*/
  evaluationSeasonOverviewHorizon: [0, 1],
  evaluationSeasonOverviewSelectedModels: [], // Will be initialized from metadata

  /* Time Range Defaults*/
  evalSOTimeRangeOptions: [],
  selectedDynamicTimePeriod: "last-2-weeks",

  mapSelectedModel: "", // Will be initialized from metadata
  mapSelectedScoringOption: "WIS/Baseline", // Default scoring option
  useLogColorScale: false,

  wisChartScaleType: "linear",
  mapeChartScaleType: "linear",
};

const evaluationsSeasonOverviewSettingsSlice = createSlice({
  name: "evaluations-season-overview-settings-slice",
  initialState,
  reducers: {
    setEvaluationSeasonOverviewHorizon: (state, action: PayloadAction<number[]>) => {
      state.evaluationSeasonOverviewHorizon = action.payload;
    },
    updateEvaluationSeasonOverviewTimeRangeOptions: (state, action: PayloadAction<EvaluationSeasonOverviewTimeRangeOption[]>) => {
      state.evalSOTimeRangeOptions = action.payload;
    },
    updateSelectedDynamicTimePeriod: (state, action: PayloadAction<string>) => {
      state.selectedDynamicTimePeriod = action.payload;
    },
    setMapSelectedModel: (state, action: PayloadAction<string>) => {
      state.mapSelectedModel = action.payload;
    },
    setMapSelectedScoringOption: (state, action: PayloadAction<"WIS/Baseline" | "MAPE" | "Coverage">) => {
      state.mapSelectedScoringOption = action.payload;
    },
    setUseLogColorScale: (state, action: PayloadAction<boolean>) => {
      state.useLogColorScale = action.payload;
    },
    toggleModelSelection: (state, action: PayloadAction<string>) => {
      const modelName = action.payload;
      const index = state.evaluationSeasonOverviewSelectedModels.indexOf(modelName);
      if (index === -1) {
        // Model not currently selected, add it
        state.evaluationSeasonOverviewSelectedModels.push(modelName);
      } else {
        // Model currently selected, remove it
        state.evaluationSeasonOverviewSelectedModels.splice(index, 1);
      }
    },
    selectAllModels: (state, action: PayloadAction<string[]>) => {
      state.evaluationSeasonOverviewSelectedModels = [...action.payload];
    },
    // Initialize models from metadata (only sets if not already initialized)
    initializeModelsFromMetadata: (state, action: PayloadAction<string[]>) => {
      if (state.evaluationSeasonOverviewSelectedModels.length === 0) {
        state.evaluationSeasonOverviewSelectedModels = action.payload;
        // Set default map selected model to first model if not set
        if (!state.mapSelectedModel && action.payload.length > 0) {
          state.mapSelectedModel = action.payload[0];
        }
      }
    },
    setWisChartScaleType: (state, action: PayloadAction<"linear" | "log">) => {
      state.wisChartScaleType = action.payload;
    },
    setMapeChartScaleType: (state, action: PayloadAction<"linear" | "log">) => {
      state.mapeChartScaleType = action.payload;
    },
  },
});

export const {
  setEvaluationSeasonOverviewHorizon,
  updateEvaluationSeasonOverviewTimeRangeOptions,
  updateSelectedDynamicTimePeriod,
  setMapSelectedModel,
  setMapSelectedScoringOption,
  setUseLogColorScale,
  toggleModelSelection,
  selectAllModels,
  setWisChartScaleType,
  setMapeChartScaleType,
  initializeModelsFromMetadata,
} = evaluationsSeasonOverviewSettingsSlice.actions;

export default evaluationsSeasonOverviewSettingsSlice.reducer;
