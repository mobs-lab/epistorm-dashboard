"use client";

import { clearAuxiliaryData, setAuxiliaryJsonData } from "@/store/data-slices/domains/auxiliaryDataSlice";
import { addSeasonData, clearCoreData } from "@/store/data-slices/domains/coreDataSlice";
import { updateEvaluationSeasonOverviewTimeRangeOptions } from "@/store/data-slices/settings/SettingsSliceEvaluationSeasonOverview";
import {
  updateEvaluationSingleModelViewDateEnd,
  updateEvaluationSingleModelViewDateStart,
  updateEvaluationSingleModelViewSeasonOptions,
  updateEvaluationsSingleModelViewSeasonId,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSingleModel";
import {
  setSeasonOptions,
  updateDateEnd,
  updateDateRange,
  updateDateStart,
  updateUserSelectedWeek,
} from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch } from "@/store/hooks";
import { LoadingStates } from "@/types/app";
import { EvaluationSeasonOverviewTimeRangeOption } from "@/types/domains/evaluations";
import { SeasonOption } from "@/types/domains/forecasting";
import { determineCurrentSeasonId, fetchAuxiliaryData, fetchSeasonData } from "@/utils/dataLoader";
import { loadUSMapData } from "@/utils/mapDataLoader";
import { parseISO } from "date-fns";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface DataContextType {
  loadingStates: LoadingStates;
  isFullyLoaded: boolean;
  updateLoadingState: (key: keyof LoadingStates, value: boolean) => void;
  currentSeasonId: string | null;
  initializationError: string | null;
  mapData: any | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const initStartedRef = useRef(false);
  const backgroundLoadStartedRef = useRef(false);
  const [mapData, setMapData] = useState<any | null>(null);

  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    // Auxiliary Data States
    seasonOptions: true,
    locations: true,
    thresholds: true,
    mapData: true,

    // Default current season states
    groundTruth: true,
    predictions: true,
    nowcastTrends: true,

    // These are lazy-loaded
    evaluationScores: false,
    evaluationDetailedCoverage: false,
    historicalGroundTruth: false,
  });

  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadMapData = useCallback(async () => {
    try {
      console.log("Loading US map data...");
      const data = await loadUSMapData();
      setMapData(data);
      updateLoadingState("mapData", false);
      console.log("US map data loaded successfully");
    } catch (error) {
      console.error("Failed to load US map data:", error);
      updateLoadingState("mapData", false); // Still set to false to not block UI
    }
  }, [updateLoadingState]);

  // Background loading function
  const loadBackgroundSeasons = useCallback(
    async (currentSeasonId: string, metadata: any) => {
      if (backgroundLoadStartedRef.current) return;
      backgroundLoadStartedRef.current = true;

      console.log("Starting background season loading...");

      try {
        if (metadata?.fullRangeSeasons) {
          const previousSeasons = metadata.fullRangeSeasons.filter((s: any) => s.seasonId !== currentSeasonId);

          for (const season of previousSeasons) {
            try {
              const seasonData = await fetchSeasonData(season.seasonId, false, ["groundTruthData", "predictionsData", "nowcastTrendsData"]);

              dispatch(
                addSeasonData({
                  seasonId: season.seasonId,
                  ...seasonData,
                })
              );

              console.log(`Background loaded season: ${season.seasonId}`);
            } catch (error) {
              console.warn(`Failed to background load season ${season.seasonId}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error in background season loading:", error);
      }

      console.log("Background loading complete");
    },
    [dispatch]
  );

  // Main initialization function - called once
  const initializeData = useCallback(async () => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    try {
      console.log("Starting data initialization...");

      // Step 1: Load auxiliary data
      const auxiliaryData = await fetchAuxiliaryData();
      dispatch(setAuxiliaryJsonData(auxiliaryData));

      // Step 2: Determine current season ID using the helper function
      const detectedSeasonId = determineCurrentSeasonId(auxiliaryData.metadata);

      if (!detectedSeasonId) {
        throw new Error("Could not determine current season ID from metadata");
      }

      console.log(`Detected current season: ${detectedSeasonId}`);
      setCurrentSeasonId(detectedSeasonId);

      // Step 3: Process and dispatch metadata
      if (auxiliaryData.metadata) {
        const { metadata } = auxiliaryData;

        // Process season options
        if (metadata.fullRangeSeasons) {
          const seasonOptions = metadata.fullRangeSeasons.map((season: any) => ({
            ...season,
            startDate: parseISO(season.startDate),
            endDate: parseISO(season.endDate),
          }));

          dispatch(setSeasonOptions(seasonOptions));
          dispatch(updateEvaluationSingleModelViewSeasonOptions(seasonOptions));

          // Process evaluation time range options
          const evalSOTimeRangeOptions: EvaluationSeasonOverviewTimeRangeOption[] = [
            ...seasonOptions.map((season: SeasonOption) => ({
              name: season.seasonId,
              displayString: season.displayString,
              isDynamic: false,
              startDate: season.startDate,
              endDate: season.endDate,
              subDisplayValue: undefined,
            })),
            ...(metadata.dynamicTimePeriod?.map((tp: any) => ({
              name: tp.label,
              displayString: tp.displayString,
              isDynamic: tp.isDynamic,
              subDisplayValue: tp.subDisplayValue,
              startDate: parseISO(tp.startDate),
              endDate: parseISO(tp.endDate),
            })) || []),
          ];

          dispatch(updateEvaluationSeasonOverviewTimeRangeOptions(evalSOTimeRangeOptions));
        }

        // Set default date range
        if (metadata.defaultSeasonTimeValue && metadata.fullRangeSeasons) {
          const defaultOption = metadata.fullRangeSeasons.find((s: any) => s.timeValue === metadata.defaultSeasonTimeValue);

          if (defaultOption) {
            dispatch(updateDateRange(defaultOption.timeValue));
            dispatch(updateDateStart(parseISO(defaultOption.startDate)));
            dispatch(updateDateEnd(parseISO(defaultOption.endDate)));
            dispatch(updateEvaluationsSingleModelViewSeasonId(defaultOption.seasonId));
            dispatch(updateEvaluationSingleModelViewDateStart(parseISO(defaultOption.startDate)));
            dispatch(updateEvaluationSingleModelViewDateEnd(parseISO(defaultOption.endDate)));
          }
        }

        // Set default selected week
        if (metadata.defaultSelectedDate) {
          dispatch(updateUserSelectedWeek(new Date(metadata.defaultSelectedDate)));
        }
      }

      // Update loading states for auxiliary data
      updateLoadingState("locations", false);
      updateLoadingState("thresholds", false);
      updateLoadingState("seasonOptions", false);

      // Step 4: Load current season data AND us states map data in parallel
      const seasonDataPromise = fetchSeasonData(
        detectedSeasonId,
        true, // It's the current season
        ["groundTruthData", "predictionsData", "nowcastTrendsData"]
      );
      
      const seasonData = await seasonDataPromise;

      loadMapData();

      dispatch(
        addSeasonData({
          seasonId: detectedSeasonId,
          ...seasonData,
        })
      );

      // Update loading states for season data
      updateLoadingState("groundTruth", false);
      updateLoadingState("predictions", false);
      updateLoadingState("nowcastTrends", false);

      console.log("Initial Critical data load complete");

      // Step 5: Start background loading of other seasons
      setTimeout(() => {
        loadBackgroundSeasons(detectedSeasonId, auxiliaryData.metadata);
      }, 1);
    } catch (error) {
      console.error("Failed to initialize data:", error);
      setInitializationError(error instanceof Error ? error.message : "Unknown error");

      // Reset loading states on error
      Object.keys(loadingStates).forEach((key) => {
        updateLoadingState(key as keyof LoadingStates, false);
      });
    }
  }, [dispatch, updateLoadingState, loadMapData, loadBackgroundSeasons, loadingStates]);

  // Single initialization effect
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const isFullyLoaded = Object.values(loadingStates).every((state) => !state);

  return (
    <DataContext.Provider
      value={{
        loadingStates,
        isFullyLoaded,
        updateLoadingState,
        currentSeasonId,
        initializationError,
        mapData,
      }}>
      {initializationError ? (
        <div className='flex items-center justify-center h-screen text-white'>
          <div className='text-center'>
            <h2 className='text-xl mb-2'>Failed to load application data</h2>
            <p className='text-sm text-gray-400'>{initializationError}</p>
            <button onClick={() => window.location.reload()} className='mt-4 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600'>
              Reload Page
            </button>
          </div>
        </div>
      ) : (
        children
      )}
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
