/**
 * Data loading utilities for optimized season-based fetching
 * Implements the strategy outlined in DataLoadingOptimizationStrategy.md
 */

// Cache for auxiliary data to prevent re-fetching
let auxiliaryDataCache: any = null;

// Cache for loaded season data
const seasonDataCache: Map<string, any> = new Map();

/**
 * Fetch auxiliary data with caching
 */
export async function fetchAuxiliaryData() {
  if (auxiliaryDataCache) {
    console.log("Returning cached auxiliary data");
    return auxiliaryDataCache;
  }

  console.log("Fetching auxiliary data...");

  try {
    const [locationsRes, thresholdsRes, metadataRes] = await Promise.all([
      fetch("/data/auxiliary/locationsData.json"),
      fetch("/data/auxiliary/thresholdsData.json"),
      fetch("/data/auxiliary/seasonMetadata.json"),
    ]);

    if (!locationsRes.ok || !thresholdsRes.ok || !metadataRes.ok) {
      throw new Error("Failed to fetch auxiliary data");
    }

    const [locations, thresholds, metadata] = await Promise.all([locationsRes.json(), thresholdsRes.json(), metadataRes.json()]);

    console.log("Season metadata peek:", metadata);

    auxiliaryDataCache = {
      locations,
      thresholds,
      metadata,
    };

    return auxiliaryDataCache;
  } catch (error) {
    console.error("Error fetching auxiliary data:", error);
    throw error;
  }
}

/**
 * Fetch data for a specific season
 * @param seasonId - The season identifier (e.g., "season-2024-2025")
 * @param isCurrentSeason - Whether this is the current season (uses "current_" prefix)
 * @param dataTypes - Array of data types to fetch (e.g., ["groundTruthData", "predictionsData"])
 */
export async function fetchSeasonData(
  seasonId: string,
  isCurrentSeason: boolean = false,
  dataTypes: string[] = ["groundTruthData", "predictionsData", "nowcastTrendsData"]
) {
  const cacheKey = `${seasonId}-${dataTypes.join("-")}`;

  if (seasonDataCache.has(cacheKey)) {
    console.log(`Returning cached data for ${seasonId}`);
    return seasonDataCache.get(cacheKey);
  }

  const folderName = isCurrentSeason ? `current_${seasonId}` : seasonId;
  console.log(`Fetching ${dataTypes.join(", ")} for ${folderName}...`);

  try {
    const fetchPromises = dataTypes.map((dataType) =>
      fetch(`/data/${folderName}/${dataType}.json`)
        .then((res) => {
          if (!res.ok) {
            console.warn(`Failed to fetch ${dataType} for ${seasonId}`);
            return null;
          }
          return res.json();
        })
        .catch((err) => {
          console.warn(`Error fetching ${dataType} for ${seasonId}:`, err);
          return null;
        })
    );

    const results = await Promise.all(fetchPromises);

    const seasonData = {};
    dataTypes.forEach((dataType, index) => {
      if (results[index] !== null) {
        seasonData[dataType] = results[index];
      }
    });

    if (Object.keys(seasonData).length > 0) {
      seasonDataCache.set(cacheKey, seasonData);
    }

    return seasonData;
  } catch (error) {
    console.error(`Error fetching season data for ${seasonId}:`, error);
    throw error;
  }
}

/**
 * Fetch evaluation precalculated data for a specific season
 */
export async function fetchSeasonEvaluationData(seasonId: string, isCurrentSeason: boolean = false) {
  const cacheKey = `${seasonId}-evaluations`;

  if (seasonDataCache.has(cacheKey)) {
    console.log(`Returning cached evaluation data for ${seasonId}`);
    return seasonDataCache.get(cacheKey);
  }

  const folderName = isCurrentSeason ? `current_${seasonId}` : seasonId;
  console.log(`Fetching evaluation data for ${folderName}...`);

  try {
    const response = await fetch(`/data/${folderName}/evaluationsPrecalculatedData.json`);

    if (!response.ok) {
      console.warn(`No evaluation data found for ${seasonId}`);
      return null;
    }

    const data = await response.json();
    seasonDataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching evaluation data for ${seasonId}:`, error);
    return null;
  }
}

/**
 * Fetch raw scores for Single Model view
 */
export async function fetchSeasonRawScores(seasonId: string, isCurrentSeason: boolean = false) {
  const cacheKey = `${seasonId}-rawScores`;

  if (seasonDataCache.has(cacheKey)) {
    console.log(`Returning cached raw scores for ${seasonId}`);
    return seasonDataCache.get(cacheKey);
  }

  const folderName = isCurrentSeason ? `current_${seasonId}` : seasonId;
  console.log(`Fetching raw scores for ${folderName}...`);

  try {
    const response = await fetch(`/data/${folderName}/evaluationsRawScoresData.json`);

    if (!response.ok) {
      console.warn(`No raw scores found for ${seasonId}`);
      return null;
    }

    const data = await response.json();
    seasonDataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching raw scores for ${seasonId}:`, error);
    return null;
  }
}

/**
 * Fetch dynamic time period evaluation data
 */
export async function fetchDynamicTimePeriodData(periodId: string) {
  const cacheKey = `dynamic-${periodId}`;

  if (seasonDataCache.has(cacheKey)) {
    console.log(`Returning cached data for dynamic period ${periodId}`);
    return seasonDataCache.get(cacheKey);
  }

  console.log(`Fetching dynamic time period data for ${periodId}...`);

  try {
    const response = await fetch(`/data/dynamic-time-periods/${periodId}.json`);

    if (!response.ok) {
      throw new Error(`Failed to fetch dynamic period ${periodId}`);
    }

    const data = await response.json();
    seasonDataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching dynamic period ${periodId}:`, error);
    throw error;
  }
}

/**
 * Fetch historical ground truth data (lazy loaded)
 */
export async function fetchHistoricalGroundTruthData() {
  const cacheKey = "historical-ground-truth";

  if (seasonDataCache.has(cacheKey)) {
    console.log("Returning cached historical ground truth data");
    return seasonDataCache.get(cacheKey);
  }

  console.log("Fetching historical ground truth data...");

  try {
    const response = await fetch("/data/historical-ground-truth-data/historical-ground-truth-data.json");

    if (!response.ok) {
      throw new Error("Failed to fetch historical ground truth data");
    }

    const data = await response.json();
    seasonDataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching historical ground truth data:", error);
    throw error;
  }
}

export function determineCurrentSeasonId(metadata: any): string | null {
  if (!metadata?.fullRangeSeasons) return null;

  const seasons = metadata.fullRangeSeasons;
  const now = new Date();

  // Method 1: Check for "Ongoing" in displayString
  const ongoingSeason = seasons.find(
    (s: any) => s.displayString?.toLowerCase().includes("ongoing") || s.displayString?.toLowerCase().includes("current")
  );
  if (ongoingSeason) {
    console.log(`Found ongoing season: ${ongoingSeason.seasonId}`);
    return ongoingSeason.seasonId;
  } else {
    // Fallback: Find season that contains current date
    const currentSeason = seasons.find((s: any) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      return now >= start && now <= end;
    });
    if (currentSeason) {
      console.log(`Found current season by date: ${currentSeason.seasonId}`);
      return currentSeason.seasonId;
    }

    // Fallback 2: Get the most recent season (highest index or latest endDate)
    const sortedSeasons = [...seasons].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    if (sortedSeasons[0]) {
      console.log(`Using most recent season as fallback: ${sortedSeasons[0].seasonId}`);
      return sortedSeasons[0].seasonId;
    }
  }

  return null;
}

/**
 * Debugging utility: Clear all caches
 */
export function clearAllCaches() {
  auxiliaryDataCache = null;
  seasonDataCache.clear();
  console.log("All data caches cleared");
}
