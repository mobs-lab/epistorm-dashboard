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
  updateUserSelectedWeek,
} from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch } from "@/store/hooks";

// Core data Actions and Reducers (evaluations and historical data moved to lazy loading hooks)
import { clearAuxiliaryData, setAuxiliaryJsonData } from "@/store/data-slices/domains/auxiliaryDataSlice";
import { clearCoreData, addSeasonData } from "@/store/data-slices/domains/coreDataSlice";

// Import optimized data loader utilities
import { fetchAuxiliaryData, fetchSeasonData } from "@/utils/dataLoader";

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
  loadBackgroundSeasons: () => Promise<void>;
  currentSeasonId: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const dataFetchStartedRef = useRef(false); // Use ref instead of state
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);
  const backgroundLoadingRef = useRef(false);

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

  // Load background seasons (called after initial load)
  const loadBackgroundSeasons = useCallback(async () => {
    if (backgroundLoadingRef.current || !currentSeasonId) {
      return;
    }
    
    backgroundLoadingRef.current = true;
    console.log("Starting background loading of previous seasons...");
    
    try {
      // Get season metadata from auxiliary data (should be loaded already)
      const auxiliaryData = await fetchAuxiliaryData();
      
      if (auxiliaryData.metadata?.seasons?.fullRangeSeasons) {
        const allSeasons = auxiliaryData.metadata.seasons.fullRangeSeasons;
        
        // Filter out the current season (already loaded)
        const previousSeasons = allSeasons.filter((s: any) => s.seasonId !== currentSeasonId);
        
        // Load previous seasons one by one (could also batch)
        for (const season of previousSeasons) {
          try {
            console.log(`Background loading season: ${season.seasonId}`);
            const seasonData = await fetchSeasonData(
              season.seasonId,
              false,
              ["groundTruthData", "predictionsData", "nowcastTrendsData"]
            );
            
            dispatch(addSeasonData({
              seasonId: season.seasonId,
              ...seasonData,
            }));
          } catch (error) {
            console.warn(`Failed to background load season ${season.seasonId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in background season loading:", error);
    } finally {
      backgroundLoadingRef.current = false;
      console.log("Background season loading completed");
    }
  }, [dispatch, currentSeasonId]);

  const loadJsonAuxiliaryData = useCallback(async () => {
    try {
      console.log("Loading auxiliary data with caching...");
      const auxiliaryData = await fetchAuxiliaryData();
      
      // Dispatch to Redux store
      dispatch(setAuxiliaryJsonData(auxiliaryData));
      // Extract and process metadata
      if (auxiliaryData.metadata) {
        // Initialize the list of time range options for season overview page
        let evalSOTimeRangeOptions: EvaluationSeasonOverviewTimeRangeOption[] = [];
        let numOfFullRangeSeasons = 0;
        let mostCurrentSeasonId: string | null = null;
        
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
            }) => {
              // Check if this is the ongoing/current season
              if (season.displayString.includes("Ongoing")) {
                mostCurrentSeasonId = season.seasonId;
              }
              return {
                ...season,
                startDate: parseISO(season.startDate),
                endDate: parseISO(season.endDate),
              };
            }
          );
          
          // Store the current season ID for later use
          if (mostCurrentSeasonId) {
            setCurrentSeasonId(mostCurrentSeasonId);
          }
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

        // Set default selected week of `Forecast` page if provided
        if (auxiliaryData.metadata.defaultSelectedDate) {
          const defaultPredDate = parseISO(auxiliaryData.metadata.defaultSelectedDate);
          dispatch(updateUserSelectedWeek(defaultPredDate));
          console.log("Set default selected week for `ForecastChart`: ", defaultPredDate);
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to load JSON auxiliary data:", error);
      dispatch(clearAuxiliaryData());
      return false;
    }
  }, [dispatch]);

  // Load current season data for Forecast page
  const loadCurrentSeasonData = useCallback(async (seasonId: string) => {
    try {
      console.log(`Loading current season data: ${seasonId}`);
      
      const seasonData = await fetchSeasonData(
        seasonId,
        true, // It's the current season, use "current_" prefix
        ["groundTruthData", "predictionsData", "nowcastTrendsData"]
      );
      
      // Dispatch to Redux
      dispatch(addSeasonData({
        seasonId,
        ...seasonData,
      }));
      
      // Update loading states
      updateLoadingState("groundTruth", false);
      updateLoadingState("predictions", false);
      updateLoadingState("nowcastTrends", false);
      
      return true;
    } catch (error) {
      console.error("Failed to load current season data:", error);
      return false;
    }
  }, [dispatch, updateLoadingState]);

  const fetchAndProcessData = useCallback(async () => {
    // Use ref to prevent multiple runs
    if (dataFetchStartedRef.current) {
      console.warn("DataProvider: Fetch already started, skipping");
      return;
    }
    dataFetchStartedRef.current = true;

    console.log("DataProvider: Starting optimized data fetch process");

    try {
      // Step 1: Load auxiliary data (with caching)
      const auxiliarySuccess = await loadJsonAuxiliaryData();
      
      if (auxiliarySuccess) {
        updateLoadingState("locations", false);
        updateLoadingState("thresholds", false);
        updateLoadingState("seasonOptions", false);
        
        // Step 2: Load current season data if we identified it
        if (currentSeasonId) {
          const currentSeasonSuccess = await loadCurrentSeasonData(currentSeasonId);
          
          if (currentSeasonSuccess) {
            // Step 3: Start background loading of previous seasons
            // This runs asynchronously without blocking
            setTimeout(() => {
              loadBackgroundSeasons();
            }, 1000); // Small delay to ensure page is interactive first
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchAndProcessData:", error);
    }
  }, [loadJsonAuxiliaryData, currentSeasonId, loadCurrentSeasonData, loadBackgroundSeasons, updateLoadingState]);

  useEffect(() => {
    fetchAndProcessData();
  }, [fetchAndProcessData]);

  const isFullyLoaded = Object.values(loadingStates).every((state) => !state);

  return (
    <DataContext.Provider value={{ loadingStates, isFullyLoaded, updateLoadingState, loadBackgroundSeasons, currentSeasonId }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};
