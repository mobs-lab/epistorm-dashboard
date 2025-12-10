import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";

// Selector for all model names
export const selectModelNames = (state: RootState): string[] => {
  return state.auxiliaryData.metadata.modelNames || [];
};

// Selector for nowcast-capable models
export const selectNowcastModelNames = (state: RootState): string[] => {
  return state.auxiliaryData.metadata.nowcastModelNames || [];
};

// Selector for model metadata
export const selectModelMetadata = (state: RootState) => {
  return state.auxiliaryData.metadata.modelMetadata || {};
};

// Selector to get model color
export const selectModelColor = (state: RootState, modelName: string): string => {
  const metadata = state.auxiliaryData.metadata.modelMetadata;
  return metadata?.[modelName]?.color || "#808080"; // Default gray
};

// Selector to get all model colors as a map
export const selectModelColorMap = createSelector(
  [selectModelMetadata],
  (modelMetadata) => {
    const colorMap: Record<string, string> = {};
    Object.entries(modelMetadata).forEach(([modelName, metadata]) => {
      colorMap[modelName] = metadata.color;
    });
    return colorMap;
  }
);
