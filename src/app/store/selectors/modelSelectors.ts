import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";

// Import model config to get the canonical order
import modelConfig from "../../../../model_config.json";

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

// Selector to get the canonical model order from config
export const selectModelOrder = (): string[] => {
  return modelConfig.models.map((model: any) => model.name);
};

// Helper function to sort models with disabled ones at the bottom
export const sortModelsWithDisabledAtBottom = (
  modelNames: string[],
  disabledModels: Set<string>
): string[] => {
  const canonicalOrder = modelConfig.models.map((model: any) => model.name);
  
  // Create a map for O(1) lookup of model position
  const orderMap = new Map(canonicalOrder.map((name: string, index: number) => [name, index]));
  
  // Separate enabled and disabled models
  const enabled: string[] = [];
  const disabled: string[] = [];
  
  modelNames.forEach((modelName) => {
    if (disabledModels.has(modelName)) {
      disabled.push(modelName);
    } else {
      enabled.push(modelName);
    }
  });
  
  // Sort both arrays by canonical order
  const sortByCanonicalOrder = (a: string, b: string) => {
    const aIndex = orderMap.get(a) ?? 999;
    const bIndex = orderMap.get(b) ?? 999;
    return (aIndex as number) - (bIndex as number);
  };
  
  enabled.sort(sortByCanonicalOrder);
  disabled.sort(sortByCanonicalOrder);
  
  // Return enabled models first, then disabled
  return [...enabled, ...disabled];
};

// Selector for sorted model names (base order without considering disabled status)
export const selectSortedModelNames = createSelector(
  [selectModelNames],
  (modelNames) => {
    const canonicalOrder = modelConfig.models.map((model: any) => model.name);
    const orderMap = new Map(canonicalOrder.map((name: string, index: number) => [name, index]));
    
    return [...modelNames].sort((a, b) => {
      const aIndex = orderMap.get(a) ?? 999;
      const bIndex = orderMap.get(b) ?? 999;
      return (aIndex as number) - (bIndex as number);
    });
  }
);
