import { ModelName } from "../common";

export interface SurveillanceSingleWeekDataPoint {
  date: Date;
  stateNum: string;
  stateName: string;
  admissions: number;
  weeklyRate: number;
}

export interface SeasonOption {
  index: number;
  seasonId: string;
  displayString: string;
  timeValue: string;
  startDate: Date;
  endDate: Date;
}

export interface LocationData {
  stateNum: string;
  state: string;
  stateName: string;
  population: number;
}

export interface StateThresholds {
  location: string;
  medium: number;
  high: number;
  veryHigh: number;
}

// Dictionary format for thresholds as provided by the backend
export interface StateThresholdsDict {
  [stateNum: string]: {
    medium: number;
    high: number;
    veryHigh: number;
  };
}

// Following interfaces are for Redux Data Slice to validate fetched JSON data
export interface GroundTruthData {
  [seasonId: string]: {
    [referenceDateISO: string]: {
      [stateNum: string]: { admissions: number; weeklyRate: number };
    };
  };
}

export interface ModelPredictionData {
  firstPredRefDate?: string;
  lastPredRefDate?: string;
  lastPredTargetDate?: string;
  partitions: {
    "pre-forecast": TimeSeriesPartition;
    "full-forecast": TimeSeriesPartition;
    "forecast-tail": TimeSeriesPartition;
    "post-forecast": TimeSeriesPartition;
  };
}

export interface PredictionData {
  [seasonId: string]: {
    firstPredRefDate?: string;
    lastPredRefDate?: string;
    lastPredTargetDate?: string;
  } & {
    [modelName: ModelName]: ModelPredictionData;
  };
}

export interface TimeSeriesPartition {
  [referenceDateISO: string]: {
    [stateNum: string]: {
      predictions?: {
        [targetEndDateISO: string]: {
          horizon: number;
          median: number;
          PI50: { low: number; high: number };
          PI90: { low: number; high: number };
          PI95: { low: number; high: number };
        };
      };
    };
  };
}

export interface NowcastTrendsData {
  [modelName: string]: {
    [isoDate: string]: {
      [stateNum: string]: { decrease: number; increase: number; stable: number };
    };
  };
}

export interface HistoricalDataMap {
  [isoDateMatchingUserSelected: string]: {
    [referenceDateHistorical: string]: {
      [stateNum: string]: { admissions: number; weeklyRate: number };
    };
  };
}
