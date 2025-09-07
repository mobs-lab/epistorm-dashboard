// File Path: src/app/forecasts/page.tsx

"use client";

import React from "react";
import { useDataContext } from "@/providers/DataProvider";
import ForecastChart from "./forecasts-components/ForecastChart";
import SettingsPanel from "./forecasts-components/SettingsPanel";
import NowcastStateThermo from "./forecasts-components/NowcastStateThermo";
import NowcastGauge from "./forecasts-components/NowcastGauge";
import NowcastHeader from "./forecasts-components/NowcastHeader";
import ForecastChartHeader from "./forecasts-components/ForecastChartHeader";
import HistoricalDataLoader from "./forecasts-components/HistoricalDataLoader";

import "../css/component_styles/forecast-page.css";

const ForecastPage: React.FC = () => {
  const { loadingStates, isFullyLoaded } = useDataContext();

  return (
    <HistoricalDataLoader>
      <div className='layout-grid-forecasts-page w-full h-full pl-4'>
        <div className='nowcast-header util-no-sb-length'>
          <NowcastHeader />
        </div>
        {!loadingStates.groundTruth && !loadingStates.thresholds && (
          <div className='nowcast-thermo w-full h-full'>
            <NowcastStateThermo />
          </div>
        )}
        <div className='vertical-separator'>
          <svg width='100%' height='100%'>
            <line x1='50%' y1='0' x2='50%' y2='100%' stroke='#5d636a' strokeWidth='1' />
          </svg>
        </div>
        {!loadingStates.groundTruth && !loadingStates.thresholds && (
          <div className='nowcast-gauge w-full h-full'>
            <NowcastGauge riskLevel='US' />
          </div>
        )}
        {!loadingStates.locations && (
          <div className='settings-panel w-full h-full overflow-scroll util-no-sb-length'>
            <SettingsPanel />
          </div>
        )}
        <div className='horizontal-separator'>
          <svg width='100%' height='100%'>
            <line x1='0' y1='50%' x2='100%' y2='50%' stroke='#5d636a' strokeWidth='1' />
          </svg>
        </div>
        {!loadingStates.groundTruth && !loadingStates.predictions && (
          <>
            <div className='chart-header'>
              <ForecastChartHeader />
            </div>
            <div className='forecast-graph overflow-scroll util-no-sb-length'>
              <ForecastChart />
            </div>
          </>
        )}
        {!isFullyLoaded && (
          <div className='fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md'>Loading additional data...</div>
        )}
      </div>
    </HistoricalDataLoader>
  );
};

export default ForecastPage;
