// Custom hook for lazy loading evaluations data
import { useCallback, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useDataContext } from "@/providers/DataProvider";
import { 
  setEvaluationJsonData, 
  clearEvaluationJsonData 
} from "@/store/data-slices/domains/evaluationDataSlice";

interface UseEvaluationsDataReturn {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  loadData: () => Promise<void>;
}

export const useEvaluationsData = (): UseEvaluationsDataReturn => {
  const dispatch = useAppDispatch();
  const { updateLoadingState } = useDataContext();
  const { isJsonDataLoaded } = useAppSelector((state) => state.evaluationData);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingAttemptedRef = useRef(false);

  const loadData = useCallback(async () => {
    // Prevent duplicate loading attempts
    if (isLoading || isJsonDataLoaded || loadingAttemptedRef.current) {
      return;
    }

    loadingAttemptedRef.current = true;
    setIsLoading(true);
    setError(null);
    
    // Update global loading states
    updateLoadingState("evaluationScores", true);
    updateLoadingState("evaluationDetailedCoverage", true);

    try {
      console.log("Loading evaluations data...");
      const response = await fetch("/data/app_data_evaluations.json");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch evaluation JSON: ${response.status}`);
      }
      
      const evalData = await response.json();
      dispatch(setEvaluationJsonData(evalData));
      
      // Update global loading states on success
      updateLoadingState("evaluationScores", false);
      updateLoadingState("evaluationDetailedCoverage", false);
      
      console.log("Evaluations data loaded successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.warn("Failed to load JSON evaluation data:", errorMessage);
      setError(errorMessage);
      dispatch(clearEvaluationJsonData());
      
      // Update global loading states on failure
      updateLoadingState("evaluationScores", false);
      updateLoadingState("evaluationDetailedCoverage", false);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, isLoading, isJsonDataLoaded, updateLoadingState]);

  return {
    isLoading,
    isLoaded: isJsonDataLoaded,
    error,
    loadData,
  };
};
