export interface SurveillanceSingleWeekDataPoint {
  date: Date;
  stateNum: string;
  stateName: string;
  admissions: number;
  weeklyRate: number;
}

export interface PredictionSingleWeekDataPoint {
  referenceDate: Date;
  targetEndDate: Date;
  stateNum: string;
  confidence025: number;
  confidence050: number;
  confidence250: number;
  confidence500: number;
  confidence750: number;
  confidence950: number;
  confidence975: number;
  confidence_low: number;
  confidence_high: number;
}

export interface PredictionDataGroupedByModel {
  modelName: string;
  predictionData: PredictionSingleWeekDataPoint[];
}

export interface SeasonOption {
  index: number;
  seasonId: string;
  displayString: string;
  timeValue: string;
  startDate: Date;
  endDate: Date;
}

export interface HistoricalDataCollectionByDate {
  associatedDate: Date;
  historicalData: SurveillanceSingleWeekDataPoint[];
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
    [modelName: string]: ModelPredictionData;
  };
}

export interface TimeSeriesPartition {
  [referenceDateISO: string]: {
    [stateNum: string]: {
      predictions?: {
        [targetEndDateISO: string]: {
          horizon: number;
          median: number;
          q25: number;
          q75: number;
          q05: number;
          q95: number;
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
