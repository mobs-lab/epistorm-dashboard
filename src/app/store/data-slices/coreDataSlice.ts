import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CoreDataState {
  isLoaded: boolean;
  metadata: any;
  mainData: any;
  auxiliaryData: any;
}

const initialState: CoreDataState = {
  isLoaded: false,
  metadata: null,
  mainData: null,
  auxiliaryData: null
};

const coreDataSlice = createSlice({
  name: "coreData",
  initialState,
  reducers: {
    setCoreJsonData: (state, action: PayloadAction<any>) => {
      state.metadata = action.payload.metadata;
      state.mainData = action.payload.mainData;
      state.auxiliaryData = action.payload.auxiliaryData || action.payload["auxiliary-data"];
      state.isLoaded = true;
    },
    clearCoreData: (state) => {
      state.metadata = null;
      state.mainData = null;
      state.auxiliaryData = null;
      state.isLoaded = false;
    }
  }
});

export const { setCoreJsonData, clearCoreData } = coreDataSlice.actions;
export default coreDataSlice.reducer;