// src/app/types/common.ts
export type StateNum = string; // "US" or "01".."56"
export type IsoDate = string; // "YYYY-MM-DD"
export type SeasonId = string; // "season-2023-2024" | "last-2-weeks" etc.
export type ModelName = string;

export const nowcastRiskLevels = ["No Data", "Low", "Medium", "High"];
export const nowcastRiskColors = ["#363b43", "#7cd8c9", "#2bafe2", "#435fce"];
