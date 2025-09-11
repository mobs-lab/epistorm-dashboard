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

// Core data Actions and Reducers (evaluations and historical data moved to lazy loading hooks)
import { clearAuxiliaryData, setAuxiliaryJsonData } from "@/store/data-slices/domains/auxiliaryDataSlice";
import { clearCoreData, setCoreJsonData } from "@/store/data-slices/domains/coreDataSlice";

// Evaluation Single Model Settings Slice
import { updateEvaluationSeasonOverviewTimeRangeOptions } from "@/store/data-slices/settings/SettingsSliceEvaluationSeasonOverview";
import {
  updateEvaluationSingleModelViewDateEnd,
  updateEvaluationSingleModelViewDateStart,
  updateEvaluationSingleModelViewSeasonOptions,
  updateEvaluationsSingleModelViewSeasonId,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSingleModel";
import { EvaluationSeasonOverviewTimeRangeOption } from "@/types/domains/evaluations";
import { SeasonOption } from "@/types/domains/forecasting";

interface DataContextType {
  loadingStates: LoadingStates;
  isFullyLoaded: boolean;
  updateLoadingState: (key: keyof LoadingStates, value: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const dataFetchStartedRef = useRef(false); // Use ref instead of state

  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    evaluationScores: false, // Managed by EvaluationsPage lazy loading
    groundTruth: true,
    predictions: true,
    locations: true,
    nowcastTrends: true,
    thresholds: true,
    historicalGroundTruth: false, // Will be managed by HistoricalDataLoader lazy loading
    seasonOptions: true,
    evaluationDetailedCoverage: false, // Managed by EvaluationsPage lazy loading
  });

  // Remove updateLoadingState from inside component to avoid recreating
  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

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
            (season: {
              index: number;
              seasonId: string;
              displayString: string;
              timeValue: string;
              startDate: string;
              endDate: string;
            }) => ({
              ...season,
              startDate: parseISO(season.startDate),
              endDate: parseISO(season.endDate),
            })
          );
          dispatch(setSeasonOptions(seasonOptions));
          dispatch(updateEvaluationSingleModelViewSeasonOptions(seasonOptions));

          // Process full range season options for season overview page, into EvaluationSeasonOverviewTimeRangeOption, filling some fields with placeholder values
          const fullRangeSeasonOptionsForEvalSO: EvaluationSeasonOverviewTimeRangeOption[] = seasonOptions.map((season: SeasonOption) => ({
            // FIX: Use the definitive seasonId from the backend as the 'name'.
            // This makes 'name' the reliable key for data lookups and fixes the bug for partial seasons.
            name: season.seasonId,
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

            // Dispatch the definitive seasonId instead of the ambiguous date range string
            dispatch(updateEvaluationsSingleModelViewSeasonId(defaultOption.seasonId));
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

  // Note: loadJsonHistoricalGroundTruthData has been moved to useHistoricalGroundTruthData hook for lazy loading

  const fetchAndProcessData = useCallback(async () => {
    // Use ref to prevent multiple runs
    if (dataFetchStartedRef.current) {
      console.warn("DataProvider: Fetch already started, skipping");
      return;
    }
    dataFetchStartedRef.current = true;

    console.log("DataProvider: Starting data fetch process");

    try {
      // Load core JSON files in parallel for better performance
      // Historical and evaluations data are now lazy-loaded
      const [jsonCoreLoaded, jsonAuxiliaryLoaded] = await Promise.allSettled([loadJsonCoreData(), loadJsonAuxiliaryData()]);

      // Check results and handle any failures gracefully
      const coreSuccess = jsonCoreLoaded.status === "fulfilled" && jsonCoreLoaded.value;
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
        // Note: historicalGroundTruth and evaluations loading states are now managed by their respective lazy loaders
      }
    } catch (error) {
      console.error("Error in fetchAndProcessData:", error);
    }
  }, [loadJsonCoreData, loadJsonAuxiliaryData, updateLoadingState]);

  useEffect(() => {
    fetchAndProcessData();
  }, [fetchAndProcessData]);

  const isFullyLoaded = Object.values(loadingStates).every((state) => !state);

  return <DataContext.Provider value={{ loadingStates, isFullyLoaded, updateLoadingState }}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};
