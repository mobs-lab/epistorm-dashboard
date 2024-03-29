export interface DataPoint {
    date: Date;
    stateNum: string;
    stateName: string;
    admissions: number;
}

export interface PredictionDataPoint {
    referenceDate: string;
    targetEndDate: string;
    stateNum: string;
    confidence025: number;
    confidence250: number;
    confidence500: number;
    confidence750: number;
    confidence975: number;
}

export interface LocationData {
    stateNum: string; // state numbers
    state: string; // state abbreviations
    stateName: string; // state full names
}

export interface ModelPrediction{
    modelName: string;
    predictionData: PredictionDataPoint[];
}
