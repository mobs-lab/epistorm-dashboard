"use client";

// Import Custom Types
import { LoadingStates } from "@/types/app";

// Import critical libraries
import { parseISO } from "date-fns";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Import Redux
import {
  setSeasonOptions,
  updateDateEnd,
  updateDateRange,
  updateDateStart,
} from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch } from "@/store/hooks";

// Evaluations Actions and Reducers
import { clearEvaluationJsonData, setEvaluationJsonData } from "@/store/data-slices/domains/evaluationDataSlice"; // Stores pre-aggregated JSON per DataContract

import { clearCoreData, setCoreJsonData } from "@/store/data-slices/domains/coreDataSlice";
import { clearAuxiliaryData, setAuxiliaryJsonData } from "@/store/data-slices/domains/auxiliaryDataSlice";

// Evaluation Single Model Settings Slice
import {
  updateEvaluationSingleModelViewDateEnd,
  updateEvaluationSingleModelViewDateStart,
  updateEvaluationSingleModelViewSeasonOptions,
  updateEvaluationsSingleModelViewDateRange,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSingleModel";

interface DataContextType {
  loadingStates: LoadingStates;
  isFullyLoaded: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const dataFetchStartedRef = useRef(false); // Use ref instead of state

  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    evaluationScores: true,
    groundTruth: true,
    predictions: true,
    locations: true,
    nowcastTrends: true,
    thresholds: true,
    historicalGroundTruth: true,
    seasonOptions: true,
    evaluationDetailedCoverage: true,
  });

  // Remove updateLoadingState from inside component to avoid recreating
  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  // When true, prefer pre-aggregated JSON (app_data_evaluations.json) for Season Overview
  // CSV fallback remains in place for older data sources or local testing
  const USE_JSON_EVALUATIONS_DATA = true;

  // Fetch app_data_evaluations.json and populate the new evaluationData slice.
  // If not available, fall back to CSV flow and keep existing slices populated.
  const loadJsonEvaluationData = useCallback(async () => {
    if (!USE_JSON_EVALUATIONS_DATA) {
      console.log("JSON evaluations disabled, using CSV fallback");
      return false;
    }

    try {
      console.log("Loading JSON evaluation data...");
      const response = await fetch("/data/app_data_evaluations.json");

      if (!response.ok) {
        throw new Error(`Failed to fetch evaluation JSON: ${response.status}`);
      }

      const evalData = await response.json();
      /* console.log("JSON evaluation data loaded:", {
        size: JSON.stringify(evalData).length,
        seasons: Object.keys(evalData.precalculated?.iqr || {}).length,
      }); */

      // Dispatch to Redux store
      dispatch(setEvaluationJsonData(evalData));
      return true;
    } catch (error) {
      console.warn("Failed to load JSON evaluation data, falling back to CSV:", error);
      dispatch(clearEvaluationJsonData());
      return false;
    }
  }, [USE_JSON_EVALUATIONS_DATA, dispatch]);

  const loadJsonCoreData = useCallback(async () => {
    try {
      console.log("Loading JSON core data...");
      const response = await fetch("/data/app_data_core.json");

      if (!response.ok) {
        throw new Error(`Failed to fetch core JSON: ${response.status}`);
      }

      const coreData = await response.json();

      // Store the entire core data structure
      dispatch(setCoreJsonData(coreData));

      // Extract and process metadata
      if (coreData.metadata) {
        // Process season options
        if (coreData.metadata.seasons?.fullRangeSeasons) {
          const seasonOptions = coreData.metadata.seasons.fullRangeSeasons.map(
            (season: { index: number; displayString: string; timeValue: string; startDate: string; endDate: string }) => ({
              ...season,
              startDate: parseISO(season.startDate),
              endDate: parseISO(season.endDate),
            })
          );

          dispatch(setSeasonOptions(seasonOptions));
          dispatch(updateEvaluationSingleModelViewSeasonOptions(seasonOptions));
        }

        // Set default date range if provided
        if (coreData.metadata.defaultSeasonTimeValue) {
          const defaultOption = coreData.metadata.seasons?.fullRangeSeasons?.find(
            (s: { timeValue: any }) => s.timeValue === coreData.metadata.defaultSeasonTimeValue
          );

          if (defaultOption) {
            dispatch(updateDateRange(defaultOption.timeValue));
            dispatch(updateDateStart(parseISO(defaultOption.startDate)));
            dispatch(updateDateEnd(parseISO(defaultOption.endDate)));

            dispatch(updateEvaluationsSingleModelViewDateRange(defaultOption.timeValue));
            dispatch(updateEvaluationSingleModelViewDateStart(parseISO(defaultOption.startDate)));
            dispatch(updateEvaluationSingleModelViewDateEnd(parseISO(defaultOption.endDate)));
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to load JSON core data:", error);
      dispatch(clearCoreData());
      return false;
    }
  }, [dispatch]);

  const loadJsonAuxiliaryData = useCallback(async () => {
    try {
      console.log("Loading JSON auxiliary data...");
      const response = await fetch("/data/app_data_auxiliary.json");

      if (!response.ok) {
        throw new Error(`Failed to fetch auxiliary JSON: ${response.status}`);
      }

      const auxiliaryData = await response.json();
      console.log("JSON auxiliary data loaded successfully", {
        hasLocations: !!auxiliaryData.locations,
        hasThresholds: !!auxiliaryData.thresholds,
        hasHistoricalData: !!auxiliaryData.historicalDataMap,
      });

      // Dispatch to Redux store
      dispatch(setAuxiliaryJsonData(auxiliaryData));
      return true;
    } catch (error) {
      console.error("Failed to load JSON auxiliary data:", error);
      dispatch(clearAuxiliaryData());
      return false;
    }
  }, [dispatch]);

  const fetchAndProcessData = useCallback(async () => {
    // Use ref to prevent multiple runs
    if (dataFetchStartedRef.current) {
      console.debug("DEBUG: DataProvider: Fetch already started, skipping");
      return;
    }
    dataFetchStartedRef.current = true;

    console.debug("DEBUG: DataProvider: Starting data fetch process");

    try {
      // Load all JSON files in parallel for better performance
      const [jsonCoreLoaded, jsonEvaluationLoaded, jsonAuxiliaryLoaded] = await Promise.allSettled([
        loadJsonCoreData(),
        loadJsonEvaluationData(),
        loadJsonAuxiliaryData(),
      ]);

      // Check results and handle any failures gracefully
      const coreSuccess = jsonCoreLoaded.status === "fulfilled" && jsonCoreLoaded.value;
      const evalSuccess = jsonEvaluationLoaded.status === "fulfilled" && jsonEvaluationLoaded.value;
      const auxiliarySuccess = jsonAuxiliaryLoaded.status === "fulfilled" && jsonAuxiliaryLoaded.value;

      console.log(
        `Data loading strategy: Core=${coreSuccess ? "JSON" : "CSV"}, Eval=${evalSuccess ? "JSON" : "CSV"}, Auxiliary=${auxiliarySuccess ? "JSON" : "CSV"}`
      );

      // Update loading states based on what was successfully loaded
      if (coreSuccess) {
        updateLoadingState("groundTruth", false);
        updateLoadingState("predictions", false);
        updateLoadingState("nowcastTrends", false);
        updateLoadingState("seasonOptions", false);
      }

      if (auxiliarySuccess) {
        updateLoadingState("locations", false);
        updateLoadingState("thresholds", false);
        updateLoadingState("historicalGroundTruth", false);
      }

      if (evalSuccess) {
        updateLoadingState("evaluationScores", false);
        updateLoadingState("evaluationDetailedCoverage", false);
      }
    } catch (error) {
      console.error("Error in fetchAndProcessData:", error);
    }
  }, [loadJsonEvaluationData, loadJsonCoreData, loadJsonAuxiliaryData, updateLoadingState]);

  useEffect(() => {
    fetchAndProcessData();
  }, [fetchAndProcessData]);

  const isFullyLoaded = Object.values(loadingStates).every((state) => !state);

  return <DataContext.Provider value={{ loadingStates, isFullyLoaded }}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};
