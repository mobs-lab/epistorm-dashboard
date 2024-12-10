/* Interface: DataPoint
*  In raw data, state number, state's full name are given as strings (even though state number is coded as numbers)
*  Date is string, so convert to Date, NOTE: leap year issue in 2024 February is not automatically handled
*  Admissions are cast into number from string
* */
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

export interface LocationData {
    stateNum: string; // state numbers
    state: string; // state abbreviations
    stateName: string; // state full names
    population: number;
}

export interface ModelPrediction {
    modelName: string;
    predictionData: PredictionDataPoint[];
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

export interface HistoricalDataEntry {
    associatedDate: Date;
    historicalData: DataPoint[];
}

// New loading states interface
export interface LoadingStates {
    groundTruth: boolean;
    predictions: boolean;
    locations: boolean;
    nowcastTrends: boolean;
    thresholds: boolean;
    historicalGroundTruth: boolean;
    seasonOptions: boolean;
}

/* NOTE: For data provider to pass processed fetched data into helper functions*/
export interface ProcessedDataWithDateRange {
    data: DataPoint[];
    earliestDate: Date;
    latestDate: Date;
}


export const isUTCDateEqual = (a: Date, b: Date) => {
    return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}