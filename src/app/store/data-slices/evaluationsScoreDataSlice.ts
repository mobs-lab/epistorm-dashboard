import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { DetailedCoverageCollection, EvaluationsScoreDataCollection } from '@/types/domains/evaluations';

interface EvaluationsSingleModelScoreDataState {
    data: EvaluationsScoreDataCollection[];
    detailedCoverage: DetailedCoverageCollection[];
}

const initialState: EvaluationsSingleModelScoreDataState = {
    data: [],
    detailedCoverage: [],
};

const evaluationsSingleModelScoreDataSlice = createSlice({
    name: 'evaluationsSingleModelScoreData',
    initialState,
    reducers: {
        setEvaluationsSingleModelScoreData: (state, action: PayloadAction<EvaluationsScoreDataCollection[]>) => {
            state.data = action.payload;
        },
        setDetailedCoverageData: (state, action: PayloadAction<DetailedCoverageCollection[]>) => {
            state.detailedCoverage = action.payload;
        },
        // This action allows adding new coverage data for a single model
        addDetailedCoverageForModel: (state, action: PayloadAction<DetailedCoverageCollection>) => {
            const { modelName } = action.payload;
            const existingIndex = state.detailedCoverage.findIndex(item => item.modelName === modelName);
            
            if (existingIndex >= 0) {
                // Replace existing data for this model
                state.detailedCoverage[existingIndex] = action.payload;
            } else {
                // Add new model data
                state.detailedCoverage.push(action.payload);
            }
        },
        // Clear all detailed coverage data
        clearDetailedCoverage: (state) => {
            state.detailedCoverage = [];
        }
    },
});

export const {
    setEvaluationsSingleModelScoreData,
    setDetailedCoverageData,
    addDetailedCoverageForModel,
    clearDetailedCoverage
} = evaluationsSingleModelScoreDataSlice.actions;

export default evaluationsSingleModelScoreDataSlice.reducer;