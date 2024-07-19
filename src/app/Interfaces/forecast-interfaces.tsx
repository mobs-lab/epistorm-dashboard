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
}

export interface LocationData {
    stateNum: string; // state numbers
    state: string; // state abbreviations
    stateName: string; // state full names
}

export interface ModelPrediction {
    modelName: string;
    predictionData: PredictionDataPoint[];
}

export interface NowcastTrend {
    nowcast_date: string;
    location: string;
    decrease: number;
    increase: number;
    stable: number;
}

export interface NowcastTrendByModel {
    modelName: string;
    data: NowcastTrend[];
}

export interface NowcastTrendsCollection{
    allData: NowcastTrendByModel[];
}

export interface SeasonOption {
    index: number;
    displayString: string;
    timeValue: string;
    startDate: Date;
    endDate: Date;
}
