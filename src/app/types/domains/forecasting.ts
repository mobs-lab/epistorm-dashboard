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

export interface TimeSeriesData {
  [seasonId: string]: {
        // Redundantly store the important dates seen across all models, for some components to use
        // Models may vary in actual prediction output, so storing important dates for each model separately, for Evaluations components (especially Single-Model Page)
        [modelName: string]: {
          // Critical dates for this specific season, for this specific model
          firstPredRefDate?: string; // ISO Date string
          lastPredRefDate?: string; // ISO Date string
          lastPredTargetDate?: string; // ISO Date string

          partitions: {
            "pre-forecast": TimeSeriesPartition; //*See Below
            "full-forecast": TimeSeriesPartition;
            "forecast-tail": TimeSeriesPartition;
            "post-forecast": TimeSeriesPartition;
          };
        };
      };
    }
}