// Custom hook for lazy loading evaluations data
import { useDataContext } from "@/providers/DataProvider";
import {
  addPrecalculatedData,
  addRawScores,
  clearEvaluationJsonData
} from "@/store/data-slices/domains/evaluationDataSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAuxiliaryData,
  fetchDynamicTimePeriodData,
  fetchSeasonEvaluationData,
  fetchSeasonRawScores
} from "@/utils/dataLoader";
import { useCallback, useRef, useState } from "react";

interface UseEvaluationsDataReturn {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  loadSingleModelData: (seasonId: string) => Promise<void>;
}

export const useEvaluationsData = (): UseEvaluationsDataReturn => {
  const dispatch = useAppDispatch();
  const { updateLoadingState, currentSeasonId } = useDataContext();
  const { isJsonDataLoaded, loadedPeriods, loadedRawScoreSeasons } = useAppSelector((state) => state.evaluationData);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingAttemptedRef = useRef(false);
  const backgroundLoadingRef = useRef(false);

  // Load full-range season evaluations in background
  const loadBackgroundSeasonEvaluations = useCallback(async () => {
    if (backgroundLoadingRef.current) return;
    
    backgroundLoadingRef.current = true;
    console.log("Starting background loading of season evaluations...");
    
    try {
      const auxiliaryData = await fetchAuxiliaryData();
      
      if (auxiliaryData.metadata?.fullRangeSeasons) {
        for (const season of auxiliaryData.metadata.fullRangeSeasons) {
          // Skip if already loaded
          if (loadedPeriods.includes(season.seasonId)) continue;
          
          try {
            const evalData = await fetchSeasonEvaluationData(
              season.seasonId,
              season.seasonId === currentSeasonId
            );
            
            if (evalData) {
              dispatch(addPrecalculatedData({
                periodId: season.seasonId,
                data: evalData,
              }));
            }
          } catch (error) {
            console.warn(`Failed to load evaluation data for ${season.seasonId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading background season evaluations:", error);
    } finally {
      backgroundLoadingRef.current = false;
    }
  }, [dispatch, loadedPeriods, currentSeasonId]);

  // Main load function for Season Overview (loads dynamic periods first)
  const loadData = useCallback(async () => {
    // Prevent duplicate loading attempts
    if (isLoading || (loadedPeriods.length > 0 && loadingAttemptedRef.current)) {
      return;
    }

    loadingAttemptedRef.current = true;
    setIsLoading(true);
    setError(null);
    
    // Update global loading states
    updateLoadingState("evaluationScores", true);
    updateLoadingState("evaluationDetailedCoverage", true);

    try {
      console.log("Loading evaluation data with optimized strategy...");
      
      // Step 1: Load dynamic time periods first (for Season Overview default)
      const dynamicPeriods = ["last-2-weeks", "last-4-weeks", "last-8-weeks"];
      
      // Load "last-2-weeks" first (the default), then others
      const defaultPeriodData = await fetchDynamicTimePeriodData("last-2-weeks");
      if (defaultPeriodData) {
        dispatch(addPrecalculatedData({
          periodId: "last-2-weeks",
          data: defaultPeriodData,
        }));
      }
      
      // Update loading states - page can be interactive now
      updateLoadingState("evaluationScores", false);
      updateLoadingState("evaluationDetailedCoverage", false);
      
      // Step 2: Load other dynamic periods in background
      setTimeout(async () => {
        for (const periodId of ["last-4-weeks", "last-8-weeks"]) {
          try {
            const periodData = await fetchDynamicTimePeriodData(periodId);
            if (periodData) {
              dispatch(addPrecalculatedData({
                periodId,
                data: periodData,
              }));
            }
          } catch (error) {
            console.warn(`Failed to load dynamic period ${periodId}:`, error);
          }
        }
        
        // Step 3: Load full-range seasons in background
        loadBackgroundSeasonEvaluations();
      }, 500);
      
      console.log("Initial evaluations data loaded successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.warn("Failed to load evaluation data:", errorMessage);
      setError(errorMessage);
      dispatch(clearEvaluationJsonData());
      
      // Update global loading states on failure
      updateLoadingState("evaluationScores", false);
      updateLoadingState("evaluationDetailedCoverage", false);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, isLoading, loadedPeriods, updateLoadingState, loadBackgroundSeasonEvaluations]);

  // Load Single Model data (raw scores)
  const loadSingleModelData = useCallback(async (seasonId: string) => {
    // Check if already loaded
    if (loadedRawScoreSeasons.includes(seasonId)) {
      console.log(`Raw scores for ${seasonId} already loaded`);
      return;
    }
    
    try {
      console.log(`Loading raw scores for season: ${seasonId}`);
      
      const rawScoresData = await fetchSeasonRawScores(
        seasonId,
        seasonId === currentSeasonId
      );
      
      if (rawScoresData) {
        dispatch(addRawScores({
          seasonId,
          data: rawScoresData,
        }));
      }
      
      // Load other seasons in background if this is the current season
      if (seasonId === currentSeasonId) {
        setTimeout(async () => {
          const auxiliaryData = await fetchAuxiliaryData();
          
          if (auxiliaryData.metadata?.fullRangeSeasons) {
            for (const season of auxiliaryData.metadata.fullRangeSeasons) {
              if (season.seasonId !== seasonId && !loadedRawScoreSeasons.includes(season.seasonId)) {
                try {
                  const otherSeasonData = await fetchSeasonRawScores(season.seasonId, false);
                  if (otherSeasonData) {
                    dispatch(addRawScores({
                      seasonId: season.seasonId,
                      data: otherSeasonData,
                    }));
                  }
                } catch (error) {
                  console.warn(`Failed to load raw scores for ${season.seasonId}:`, error);
                }
              }
            }
          }
        }, 1000);
      }
    } catch (error) {
      console.error(`Failed to load raw scores for ${seasonId}:`, error);
    }
  }, [dispatch, loadedRawScoreSeasons, currentSeasonId]);

  return {
    isLoading,
    isLoaded: isJsonDataLoaded,
    error,
    loadData,
    loadSingleModelData,
  };
};
