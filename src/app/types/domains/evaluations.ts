export interface EvaluationsScoreDataEntry {
  referenceDate: Date;
  score: number;
  location: string;
  horizon: number;
}

export interface EvaluationsScoreDataCollection {
  modelName: string;
  scoreMetric: string;
  scoreData: EvaluationsScoreDataEntry[];
}

export interface CoverageScoreDataEntry {
  referenceDate: Date;
  location: string;
  horizon: number;
  coverage10: number;
  coverage20: number;
  coverage30: number;
  coverage40: number;
  coverage50: number;
  coverage60: number;
  coverage70: number;
  coverage80: number;
  coverage90: number;
  coverage95: number;
  coverage98: number;
}

export interface CoverageScoreDataCollectionByModel {
  modelName: string;
  coverageData: CoverageScoreDataEntry[];
}

export interface EvaluationsSeasonOption {
  displayString: string;
  startDate: Date;
  endDate: Date;
}

export interface AggregationPeriod {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isDynamic?: boolean;
}

// Centralized data contract for pre-aggregated evaluation JSON
export interface BoxplotStats {
  q05: number;
  q25: number;
  median: number;
  q75: number;
  q95: number;
  min: number;
  max: number;
  mean: number;
  count: number;
  scores: number[];
}

export interface AppDataEvaluationsPrecalculated {
  iqr: {
    [seasonId: string]: {
      [metric: string]: {
        [model: string]: {
          [horizonKey: number]: BoxplotStats;
        };
      };
    };
  };
  stateMap_aggregates: {
    [seasonId: string]: {
      [metric: string]: {
        [model: string]: {
          [stateNum: string]: {
            [horizon: number]: { sum: number; count: number };
          };
        };
      };
    };
  };
  detailedCoverage_aggregates: {
    [seasonId: string]: {
      [model: string]: {
        [horizon: number]: {
          [pi_level: number]: { sum: number; count: number };
        };
      };
    };
  };
}

// For single model page score line chart matching targetEndDate
export interface AppDataEvaluationsSingleModelRawScores {
  // Keyed by seasonId -> metric -> model -> stateNum -> horizon -> array of scores
  [seasonId: string]: {
    [metric: string]: {
      // "WIS_ratio" | "MAPE"
      [model: string]: {
        [stateNum: string]: {
          [horizon: number]: {
            referenceDate: string; // ISO date string
            targetEndDate: string; // ISO date string
            score: number;
          };
        };
      };
    };
  };
}
