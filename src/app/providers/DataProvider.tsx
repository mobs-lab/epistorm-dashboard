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

import { clearAuxiliaryData, setAuxiliaryJsonData } from "@/store/data-slices/domains/auxiliaryDataSlice";
import { clearCoreData, setCoreJsonData } from "@/store/data-slices/domains/coreDataSlice";
import {
  clearHistoricalGroundTruthData,
  setHistoricalGroundTruthJsonData,
} from "@/store/data-slices/domains/historicalGroundTruthDataSlice";

// Evaluation Single Model Settings Slice
import { updateEvaluationSeasonOverviewTimeRangeOptions } from "@/store/data-slices/settings/SettingsSliceEvaluationSeasonOverview";
import {
  updateEvaluationSingleModelViewDateEnd,
  updateEvaluationSingleModelViewDateStart,
  updateEvaluationSingleModelViewSeasonOptions,
  updateEvaluationsSingleModelViewDateRange,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSingleModel";
import { EvaluationSeasonOverviewTimeRangeOption } from "@/types/domains/evaluations";
import { SeasonOption } from "@/types/domains/forecasting";

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

  // Fetch app_data_evaluations.json and populate the new evaluationData slice.
  const loadJsonEvaluationData = useCallback(async () => {
    try {
      console.log("Loading JSON evaluation data...");
      const response = await fetch("/data/app_data_evaluations.json");

      if (!response.ok) {
        throw new Error(`Failed to fetch evaluation JSON: ${response.status}`);
      }

      const evalData = await response.json();

      // Dispatch to Redux store
      dispatch(setEvaluationJsonData(evalData));
      return true;
    } catch (error) {
      console.warn("Failed to load JSON evaluation data, falling back to CSV:", error);
      dispatch(clearEvaluationJsonData());
      return false;
    }
  }, [dispatch]);

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
      // Dispatch to Redux store
      dispatch(setAuxiliaryJsonData(auxiliaryData));
      // Extract and process metadata
      if (auxiliaryData.metadata) {
        // Initialize the list of time range options for season overview page
        let evalSOTimeRangeOptions: EvaluationSeasonOverviewTimeRangeOption[] = [];
        let numOfFullRangeSeasons = 0;
        // Process season options for forecast and single-model page
        if (auxiliaryData.metadata.seasons?.fullRangeSeasons) {
          const seasonOptions = auxiliaryData.metadata.seasons.fullRangeSeasons.map(
            (season: { index: number; displayString: string; timeValue: string; startDate: string; endDate: string }) => ({
              ...season,
              startDate: parseISO(season.startDate),
              endDate: parseISO(season.endDate),
            })
          );
          dispatch(setSeasonOptions(seasonOptions));
          dispatch(updateEvaluationSingleModelViewSeasonOptions(seasonOptions));

          // Process full range season options for season overview page, into EvaluationSeasonOverviewTimeRangeOption, filling some fields with placeholder values
          const fullRangeSeasonOptionsForEvalSO: EvaluationSeasonOverviewTimeRangeOption[] = seasonOptions.map((season: SeasonOption) => ({
            // "name" for full range season need to be in the shape of "season-{year}-{year}", so we need to parse it using available fields
            name: `season-${season.startDate.getFullYear()}-${season.endDate.getFullYear()}`,
            displayString: season.displayString,
            isDynamic: false,
            startDate: season.startDate,
            endDate: season.endDate,
            subDisplayValue: undefined,
          }));
          // Add these full season options to the final list for season overview page
          evalSOTimeRangeOptions = [...evalSOTimeRangeOptions, ...fullRangeSeasonOptionsForEvalSO];
          // Update the number of full range seasons
          numOfFullRangeSeasons = fullRangeSeasonOptionsForEvalSO.length;
        }

        // Check if metadata has dynamic time periods, and put them into redux slice if any (they should already be in perfect shape for settings panel to display)
        if (auxiliaryData.metadata.seasons?.dynamicTimePeriod) {
          const dynamicTimePeriods: EvaluationSeasonOverviewTimeRangeOption[] = auxiliaryData.metadata.seasons.dynamicTimePeriod.map(
            (tp: {
              index: number;
              label: string;
              displayString: string;
              isDynamic: boolean;
              subDisplayValue: string;
              startDate: string;
              endDate: string;
            }) => ({
              name: tp.label,
              displayString: tp.displayString,
              isDynamic: tp.isDynamic,
              subDisplayValue: tp.subDisplayValue,
              startDate: parseISO(tp.startDate),
              endDate: parseISO(tp.endDate),
            })
          );
          // Add the dynamic time periods options to the entire options list as well
          evalSOTimeRangeOptions = [...evalSOTimeRangeOptions, ...dynamicTimePeriods];
          // Dispatch the entire list of time range options to the redux slice
          dispatch(updateEvaluationSeasonOverviewTimeRangeOptions(evalSOTimeRangeOptions));
        }

        // Set default date range if provided
        if (auxiliaryData.metadata.defaultSeasonTimeValue) {
          const defaultOption = auxiliaryData.metadata.seasons?.fullRangeSeasons?.find(
            (s: { timeValue: any }) => s.timeValue === auxiliaryData.metadata.defaultSeasonTimeValue
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
      console.error("Failed to load JSON auxiliary data:", error);
      dispatch(clearAuxiliaryData());
      return false;
    }
  }, [dispatch]);

  const loadJsonHistoricalGroundTruthData = useCallback(async () => {
    try {
      const response = await fetch("/data/app_data_historical.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch historical ground truth JSON: ${response.status}`);
      }
      const historicalGroundTruthData = await response.json();
      dispatch(setHistoricalGroundTruthJsonData(historicalGroundTruthData));
      return true;
    } catch (error) {
      console.error("Failed to load JSON historical ground truth data:", error);
      dispatch(clearHistoricalGroundTruthData());
      return false;
    }
  }, [dispatch]);

  const fetchAndProcessData = useCallback(async () => {
    // Use ref to prevent multiple runs
    if (dataFetchStartedRef.current) {
      console.warn("DataProvider: Fetch already started, skipping");
      return;
    }
    dataFetchStartedRef.current = true;

    console.log("DataProvider: Starting data fetch process");

    try {
      // Load all JSON files in parallel for better performance
      const [jsonCoreLoaded, jsonEvaluationLoaded, jsonAuxiliaryLoaded] = await Promise.allSettled([
        loadJsonCoreData(),
        loadJsonAuxiliaryData(),
        // TODO: Make these two lazy-loaded
        // Evaluations should be loaded when loading /evaluations pages
        // Historical Ground Truth data should be fetched when user toggles on Historical ground truth data mode
        loadJsonEvaluationData(),
        loadJsonHistoricalGroundTruthData(),
      ]);

      // Check results and handle any failures gracefully
      const coreSuccess = jsonCoreLoaded.status === "fulfilled" && jsonCoreLoaded.value;
      const evalSuccess = jsonEvaluationLoaded.status === "fulfilled" && jsonEvaluationLoaded.value;
      const auxiliarySuccess = jsonAuxiliaryLoaded.status === "fulfilled" && jsonAuxiliaryLoaded.value;

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
  }, [loadJsonCoreData, loadJsonAuxiliaryData, loadJsonEvaluationData, loadJsonHistoricalGroundTruthData, updateLoadingState]);

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
