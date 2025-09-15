import * as d3 from "d3";

// src/app/utils/mapDataLoader.ts
let cachedTopoJsonData: any = null;
let loadingPromise: Promise<any> | null = null;

export const loadUSMapData = async (): Promise<any> => {
  // Return cached US state map if exist
  if (cachedTopoJsonData) {
    return cachedTopoJsonData;
  }

  // If we're already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading and cache the promise
  loadingPromise = d3
    .json("/states-10m.json")
    .then((data) => {
      cachedTopoJsonData = data;
      loadingPromise = null; // Clear the promise once resolved
      return data;
    })
    .catch((error) => {
      loadingPromise = null; // Clear the promise on error
      throw error;
    });

  return loadingPromise;
};
