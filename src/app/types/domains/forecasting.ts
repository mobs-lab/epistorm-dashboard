export interface DataPoint {
  date: Date;
  stateNum: string;
  stateName: string;
  admissions: number;
  weeklyRate: number;
}

export interface PredictionDataPoint {
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

export interface ModelPrediction {
  modelName: string;
  predictionData: PredictionDataPoint[];
}

export interface SeasonOption {
  index: number;
  displayString: string;
  timeValue: string;
  startDate: Date;
  endDate: Date;
}

export interface DynamicSeasonOption {
  index: number;
  label: string;
  displayString: string;
  isDynamic: boolean;
  subDisplayValue: string;
  startDate: Date;
  endDate: Date;
}

export interface ProcessedDataWithDateRange {
  data: DataPoint[];
  earliestDate: Date;
  latestDate: Date;
}

export interface HistoricalDataEntry {
  associatedDate: Date;
  historicalData: DataPoint[];
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


