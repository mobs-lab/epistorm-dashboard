// src/app/types/common.ts
export type StateNum = string; // "US" or "01".."56"
export type IsoDate = string; // "YYYY-MM-DD"
export type SeasonId = string; // "season-2023-2024" | "last-2-weeks" etc.
export type ModelName = (typeof modelNames)[number];

// Color Mapping for each model
export const modelColorMap: Record<string, string> = {
  "MOBS-GLEAM_FLUH": "#9CEB94",
  "MIGHTE-Nsemble": "#95F4C9",
  "MIGHTE-Joint": "#3FC49E",
  "NU_UCSD-GLEAM_AI_FLUH": "#45CDED",
  "CEPH-Rtrend_fluH": "#0292D1",
  "NEU_ISI-FluBcast": "#7BB1FF",
  "NEU_ISI-AdaptiveEnsemble": "#5F5FD6",
  "FluSight-ensemble": "#D36F54",
};

// Model Names Full List
export const modelNames: string[] = [
  "MOBS-GLEAM_FLUH",
  "MIGHTE-Nsemble",
  "MIGHTE-Joint",
  "NU_UCSD-GLEAM_AI_FLUH",
  "CEPH-Rtrend_fluH",
  "NEU_ISI-FluBcast",
  "NEU_ISI-AdaptiveEnsemble",
  "FluSight-ensemble",
];

// Models with nowcast production
export const nowcastModelNames: string[] = [
  "MOBS-GLEAM_FLUH",
  "MIGHTE-Nsemble",
  "MIGHTE-Joint",
  "NU_UCSD-GLEAM_AI_FLUH",
  "CEPH-Rtrend_fluH",
  "FluSight-ensemble",
];

export const nowcastRiskLevels = ["No Data", "Low", "Medium", "High"];
export const nowcastRiskColors = ["#363b43", "#7cd8c9", "#2bafe2", "#435fce"];
