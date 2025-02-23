// File: src/app/page.tsx
'use client'

import React from "react";
import { useDataContext } from './Providers/DataProvider';
import ForecastPage from "./forecasts/page";

export default function RootPage() {
    const { loadingStates } = useDataContext();

    return <ForecastPage />;
}