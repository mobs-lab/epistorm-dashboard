// File Path: /src/app/evaluations/page.tsx
/* Page Component for displaying tab layout for:
 *   - Season Overview
 *   - Single Model
 * */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDataContext } from "../providers/DataProvider";
import { Card } from "../css/material-tailwind-wrapper";

import SeasonOverviewLocationAggregatedScoreChart, {
  TooltipDirection,
} from "./evaluations-components/SeasonOverview/SeasonOverviewLocationAggregatedScoreChart";
import SeasonOverviewPIChart from "./evaluations-components/SeasonOverview/SeasonOverviewPIChart";
import SeasonOverviewUSStateMap from "./evaluations-components/SeasonOverview/SeasonOverviewUSStateMap";
import { SeasonOverviewSettings } from "./evaluations-components/SeasonOverview/SeasonOverviewSettingsPanel";

import SingleModelSettingsPanel from "./evaluations-components/SingleModel/SingleModelSettingsPanel";
import SingleModelHorizonPlot from "./evaluations-components/SingleModel/SingleModelHorizonPlot";
import SingleModelScoreLineChart from "./evaluations-components/SingleModel/SingleModelScoreLineChart";

const SeasonOverviewContent: React.FC = () => {
  const { loadingStates } = useDataContext();

  if (loadingStates.groundTruth || loadingStates.predictions) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-white'>Loading data...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full px-4 py-2 gap-4 overflow-y-auto overflow-x-hidden util-no-sb-length'>
      {/* Top charts section - 3 charts in a row */}
      <div className='grid grid-cols-3 gap-4 min-h-[480px]'>
        <Card className='bg-mobs-lab-color text-white overflow-hidden'>
          <div className='p-1 border-b border-gray-700'>
            <h3 className='text-lg font-medium'>WIS/Baseline</h3>
          </div>
          <div className='w-full h-[92%]'>
            <SeasonOverviewLocationAggregatedScoreChart
              type='wis'
              tooltipDirection={TooltipDirection.BOTTOM}
            />
          </div>
        </Card>

        <Card className='bg-mobs-lab-color text-white overflow-hidden'>
          <div className='p-1 border-b border-gray-700'>
            <h3 className='text-lg font-medium'>MAPE</h3>
          </div>
          <div className='w-full h-[92%]'>
            {/* TODO: Figure out which layout is acceptable: 1. restrain height of the chart; 2. Shrink the map down below to make way for charts on top */}
            {/* Right now this alternative chart shows the 1st kind of layout; map's space is already quite small */}
            <SeasonOverviewLocationAggregatedScoreChart type='mape' />
          </div>
        </Card>

        <Card className='bg-mobs-lab-color text-white overflow-hidden'>
          <div className='p-1 border-b border-gray-700'>
            <h3 className='text-lg font-medium'>PI</h3>
          </div>
          <div className='w-full h-[92%]'>
            <SeasonOverviewPIChart />
          </div>
        </Card>
      </div>

      {/* US Map section - full width */}
      <Card className='bg-mobs-lab-color text-white mt-4'>
        <div className='px-4 py-2 border-t border-gray-700'>
          <h3 className='text-lg font-medium'>Title</h3>
        </div>
        <div className='w-full aspect-[16/9] min-h-[360px] max-h-[480px]'>
          <SeasonOverviewUSStateMap />
        </div>
      </Card>
    </div>
  );
};

const SingleModelContent = () => {
  const { loadingStates } = useDataContext();

  if (!loadingStates.groundTruth || !loadingStates.predictions) {
    return (
      <div className='eval-single-model-chart-grid-container'>
        <div className='chart-container'>
          <SingleModelHorizonPlot />
        </div>
        <div className='chart-container'>
          <SingleModelScoreLineChart />
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center h-full'>
      <p className='text-white'>Loading data...</p>
    </div>
  );
};

const EvaluationsPage = () => {
  const [activeTab, setActiveTab] = useState("season-overview");
  const { loadingStates, isFullyLoaded } = useDataContext();

  // Determine which data-slices is needed for each tab
  const seasonOverviewReady =
    !loadingStates.groundTruth && !loadingStates.predictions;
  const singleModelReady =
    !loadingStates.groundTruth && !loadingStates.predictions;

  const renderContent = () => {
    if (activeTab === "season-overview") {
      if (!seasonOverviewReady) {
        return (
          <div className='text-white p-4'>Loading season overview data...</div>
        );
      }
      return <SeasonOverviewContent />;
    } else {
      if (!singleModelReady) {
        return (
          <div className='text-white p-4'>Loading single model data...</div>
        );
      }
      return <SingleModelContent />;
    }
  };

  return (
    <div className='evaluations-page'>
      <div className='evaluations-settings'>
        {!loadingStates.locations &&
          (activeTab === "season-overview" ? (
            <SeasonOverviewSettings />
          ) : (
            <SingleModelSettingsPanel />
          ))}
      </div>

      <div className='evaluations-content'>
        <div>
          <div className='flex bg-gray-800 border-b border-gray-700'>
            <button
              onClick={() => setActiveTab("season-overview")}
              className={`px-6 py-2 text-sm relative ${
                activeTab === "season-overview"
                  ? "text-white hover:text-white bg-mobs-lab-color border-t border-l border-r border-gray-700"
                  : "text-gray-300 hover:text-white"
              }`}
              style={{
                marginBottom: activeTab === "season-overview" ? "-1px" : "0",
                zIndex: activeTab === "season-overview" ? 1 : 0,
              }}>
              Season Overview
            </button>
            <button
              onClick={() => setActiveTab("single-model")}
              className={`px-6 py-2 text-sm relative ${
                activeTab === "single-model"
                  ? "text-white hover:text-white bg-mobs-lab-color border-t border-l border-r border-gray-700"
                  : "text-gray-300 hover:text-white border-r border-gray-700"
              }`}
              style={{
                marginBottom: activeTab === "single-model" ? "-1px" : "0",
                zIndex: activeTab === "single-model" ? 1 : 0,
              }}>
              Single Model
            </button>
          </div>
        </div>

        <div className='tab-container'>
          <Card className='p-4 flex-1 bg-mobs-lab-color text-white min-h-0'>
            {renderContent()}
          </Card>
        </div>
      </div>

      {!isFullyLoaded && (
        <div className='fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md'>
          Loading additional data...
        </div>
      )}
    </div>
  );
};

export default EvaluationsPage;
