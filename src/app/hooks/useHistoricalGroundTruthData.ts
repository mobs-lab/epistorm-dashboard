// Custom hook for lazy loading historical ground truth data
import { useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useDataContext } from "@/providers/DataProvider";
import { 
  setHistoricalGroundTruthJsonData, 
  clearHistoricalGroundTruthData 
} from "@/store/data-slices/domains/historicalGroundTruthDataSlice";
import { fetchHistoricalGroundTruthData } from "@/utils/dataLoader";

interface UseHistoricalGroundTruthDataReturn {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  loadData: () => Promise<void>;
}

export const useHistoricalGroundTruthData = (): UseHistoricalGroundTruthDataReturn => {
  const dispatch = useAppDispatch();
  const { updateLoadingState } = useDataContext();
  const { isLoaded } = useAppSelector((state) => state.historicalGroundTruthData);
  
  const isLoadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    // Prevent duplicate loading attempts
    if (isLoadingRef.current || isLoaded) {
      return;
    }

    isLoadingRef.current = true;
    errorRef.current = null;
    updateLoadingState("historicalGroundTruth", true);

    try {
      console.log("Loading historical ground truth data...");
      const historicalData = await fetchHistoricalGroundTruthData();
      
      dispatch(setHistoricalGroundTruthJsonData({
        historicalDataMap: historicalData,
      }));
      updateLoadingState("historicalGroundTruth", false);
      console.log("Historical ground truth data loaded successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to load historical ground truth data:", errorMessage);
      errorRef.current = errorMessage;
      dispatch(clearHistoricalGroundTruthData());
      updateLoadingState("historicalGroundTruth", false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [dispatch, isLoaded, updateLoadingState]);

  return {
    isLoading: isLoadingRef.current,
    isLoaded,
    error: errorRef.current,
    loadData,
  };
};
