/* In raw data-slices, state number, state's full name are given as strings (even though state number is coded as numbers)
 *  Date is string, so convert to Date, NOTE: leap year issue in 2024 February is not automatically handled
 *  Admissions are cast into number from string */
export interface DataPoint {
    date: Date;
    stateNum: string;
    stateName: string;
    admissions: number;
    weeklyRate: number;
  }
  
  export interface ModelPrediction {
    modelName: string;
    predictionData: PredictionDataPoint[];
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
  
  export interface LocationData {
    stateNum: string; // state numbers
    state: string; // state abbreviations
    stateName: string; // state full names
    population: number; // used in nowcast threshold calculation
  }
  
  export interface NowcastTrend {
    location: string;
    reference_date: Date;
    decrease: number;
    increase: number;
    stable: number;
  }
  
  export interface NowcastTrendByModel {
    modelName: string;
    data: NowcastTrend[];
  }
  
  export interface NowcastTrendsCollection {
    allData: NowcastTrendByModel[];
  }
  
  export interface SeasonOption {
    index: number;
    displayString: string;
    timeValue: string;
    startDate: Date;
    endDate: Date;
  }
  
  export interface StateThresholds {
    location: string;
    medium: number;
    high: number;
    veryHigh: number;
  }
  
  /* Associated Date is used since for date X, its historical associated date should be X-1 week's */
  export interface HistoricalDataEntry {
    associatedDate: Date;
    historicalData: DataPoint[];
  }
  
  /* For DataProvider.ts to signal when each aspect of data is loaded */
  export interface LoadingStates {
    groundTruth: boolean;
    predictions: boolean;
    locations: boolean;
    nowcastTrends: boolean;
    thresholds: boolean;
    historicalGroundTruth: boolean;
    seasonOptions: boolean;
    evaluationScores: boolean;
  }
  
  /* NOTE: For data-slices provider to pass processed fetched data-slices into helper functions*/
  export interface ProcessedDataWithDateRange {
    data: DataPoint[];
    earliestDate: Date;
    latestDate: Date;
  }
  
  export const isUTCDateEqual = (a: Date, b: Date) => {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate()
    );
  };
  
  /* Evaluations */
  /* Scoring Options data  */
  export interface EvaluationsScoreDataCollection {
    modelName: string;
    scoreMetric: string; // In our case, "WIS_Ratio" and "MAPE"
    scoreData: EvaluationsScoreData[];
  }
  
  export interface EvaluationsScoreData {
    referenceDate: Date;
    score: number;
    location: string; // Using US state code
    horizon: number;
  }
  
  /* Season Aggregation Options, used by Season Overview Page */
  export interface EvaluationsSeasonOverviewSeasonOption {
      displayString: string;
      startDate: Date;
      endDate: Date;
  }
  /* Aggregated format for Evals-Season-Overview-SettingsPanel to use */
  export interface AggregationPeriod {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    isDynamic?: boolean;
  }
  