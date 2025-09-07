// Component to handle lazy loading of historical ground truth data
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useHistoricalGroundTruthData } from "@/hooks/useHistoricalGroundTruthData";

interface HistoricalDataLoaderProps {
  children: React.ReactNode;
}

const HistoricalDataLoader: React.FC<HistoricalDataLoaderProps> = ({ children }) => {
  const { historicalDataMode } = useAppSelector((state) => state.forecastSettings);
  const { isLoading, isLoaded, error, loadData } = useHistoricalGroundTruthData();

  useEffect(() => {
    // Load historical data when historical mode is enabled and data isn't loaded yet
    if (historicalDataMode && !isLoaded && !isLoading) {
      loadData();
    }
  }, [historicalDataMode, isLoaded, isLoading, loadData]);

  if (historicalDataMode && isLoading) {
    console.log("Loading historical ground truth data...");
  }

  if (historicalDataMode && error) {
    console.error("Error loading historical data:", error);
  }

  return <>{children}</>;
};

export default HistoricalDataLoader;
