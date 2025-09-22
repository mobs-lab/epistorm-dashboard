/* src/app/store/forecast-settings-slice.ts */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SeasonOption } from "@/types/domains/forecasting";
import { parseISO } from "date-fns";

interface ForecastSettingsState {
  selectedStateName: string;
  USStateNum: string;
  selectedForecastModels: string[];
  numOfWeeksAhead: number;
  dateStart: Date;
  dateEnd: Date;
  dateRange: string;
  yAxisScale: string;
  confidenceInterval: string[];
  historicalDataMode: boolean;
  seasonOptions: SeasonOption[];

  //  Note: For RiskLevel Visualization Widgets only, another variable to keep track of the selected Prediction model (a single one) that should only affects the RiskLevel Visualization Widgets themselves.
  userSelectedRiskLevelModel: string;

  //  Note: For ForecastChart to report back the userSelectedWeek to the whole page, for sibling components to use, for example the NowcastGauge and RiskLevelThermometer (inside NowcastStateThermo.tsx)
  userSelectedWeek: Date;
}

const initialState: ForecastSettingsState = {
  selectedStateName: "United States",
  USStateNum: "US",
  selectedForecastModels: [
    "MOBS-GLEAM_FLUH",
    "MIGHTE-Nsemble",
    "MIGHTE-Joint",
    "NU_UCSD-GLEAM_AI_FLUH",
    "CEPH-Rtrend_fluH",
    "NEU_ISI-FluBcast",
    "NEU_ISI-AdaptiveEnsemble",
    "FluSight-ensemble",
  ],
  numOfWeeksAhead: 3,
  dateRange: "2023-08-01/2024-05-18",
  dateStart: parseISO("2023-08-01T12:00:00Z"),
  dateEnd: parseISO("2024-05-04T12:00:00Z"),
  yAxisScale: "linear",
  confidenceInterval: ["90"],
  historicalDataMode: false,
  seasonOptions: [],
  userSelectedRiskLevelModel: "MOBS-GLEAM_FLUH",
  userSelectedWeek: parseISO("2024-05-04"),
};

const forecastSettingsSlice = createSlice({
  name: "forecast-settings-slice",
  initialState,
  reducers: {
    updateSelectedState: (state, action: PayloadAction<{ stateName: string; stateNum: string }>) => {
      state.selectedStateName = action.payload.stateName;
      state.USStateNum = action.payload.stateNum;
    },
    updateSelectedForecastModels: (state, action: PayloadAction<string[]>) => {
      state.selectedForecastModels = action.payload;
    },
    updateNumOfWeeksAhead: (state, action: PayloadAction<number>) => {
      state.numOfWeeksAhead = action.payload;
    },
    updateDateStart: (state, action: PayloadAction<Date>) => {
      state.dateStart = action.payload;
    },
    updateDateEnd: (state, action: PayloadAction<Date>) => {
      state.dateEnd = action.payload;
    },
    updateYScale: (state, action: PayloadAction<string>) => {
      state.yAxisScale = action.payload;
    },
    updateConfidenceInterval: (state, action: PayloadAction<string[]>) => {
      state.confidenceInterval = action.payload;
    },
    updateHistoricalDataMode: (state, action: PayloadAction<boolean>) => {
      state.historicalDataMode = action.payload;
    },
    setSeasonOptions: (state, action: PayloadAction<SeasonOption[]>) => {
      state.seasonOptions = action.payload;
    },
    updateDateRange: (state, action: PayloadAction<string>) => {
      state.dateRange = action.payload;
    },
    updateUserSelectedRiskLevelModel: (state, action: PayloadAction<string>) => {
      state.userSelectedRiskLevelModel = action.payload;
    },
    updateUserSelectedWeek: (state, action: PayloadAction<Date>) => {
      state.userSelectedWeek = action.payload;
    },
  },
});

export const {
  updateSelectedState,
  updateSelectedForecastModels,
  updateNumOfWeeksAhead,
  updateDateStart,
  updateDateEnd,
  updateYScale,
  updateConfidenceInterval,
  updateHistoricalDataMode,
  updateDateRange,
  setSeasonOptions,
  updateUserSelectedRiskLevelModel,
  updateUserSelectedWeek,
} = forecastSettingsSlice.actions;

export default forecastSettingsSlice.reducer;
