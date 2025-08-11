// File Path: /src/app/evaluations/page.tsx
/* Page Component for displaying tab layout for:
 *   - Season Overview
 *   - Single Model
 * */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/styles/material-tailwind-wrapper";
import { isFeatureEnabled } from "@/utils/featureFlag";
import { useDataContext } from "@/providers/DataProvider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import SeasonOverviewLocationAggregatedScoreChart, {
  TooltipDirection,
} from "./evaluations-components/SeasonOverview/SeasonOverviewLocationAggregatedScoreChart";
import SeasonOverviewPIChart from "./evaluations-components/SeasonOverview/SeasonOverviewPIChart";
import SeasonOverviewUSStateMap from "./evaluations-components/SeasonOverview/SeasonOverviewUSStateMap";
import { SeasonOverviewSettings } from "./evaluations-components/SeasonOverview/SeasonOverviewSettingsPanel";

import SingleModelSettingsPanel from "./evaluations-components/SingleModel/SingleModelSettingsPanel";
import SingleModelHorizonPlot from "./evaluations-components/SingleModel/SingleModelHorizonPlot";
import SingleModelScoreLineChart from "./evaluations-components/SingleModel/SingleModelScoreLineChart";
import { setMapeChartScaleType, setWisChartScaleType } from "@/store/evaluations-season-overview-settings-slice";
import InfoButton from "@/shared-components/InfoButton";
import { seasonOverviewInfo, singleModelInfo } from "@/interfaces/infobutton-content";

const SeasonOverviewContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loadingStates } = useDataContext();
  const { wisChartScaleType, mapeChartScaleType } = useAppSelector((state) => state.evaluationsSeasonOverviewSettings);

  if (loadingStates.groundTruth || loadingStates.predictions) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-white'>Loading data...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full gap-4 overflow-y-auto overflow-x-hidden util-no-sb-length'>
      <div className='items-center self-end'>
        <InfoButton content={seasonOverviewInfo} title='Season Overview' displayStyle='icon' size='md' dialogSize='lg'></InfoButton>
      </div>
      {/* Top charts section - 3 charts in a row */}
      <div className='grid grid-cols-3 gap-4 min-h-[480px]'>
        <Card className='bg-mobs-lab-color text-white overflow-hidden'>
          <div className='p-1 border-b border-gray-700 flex justify-between items-center'>
            <h3 className='text-lg font-medium'> Weighted Interval Score / Baseline </h3>
            <button
              onClick={() => dispatch(setWisChartScaleType(wisChartScaleType === "log" ? "linear" : "log"))}
              className='bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded'>
              {wisChartScaleType === "log" ? "Use Linear Scale" : "Use Log Scale"}
            </button>
          </div>
          <div className='w-full h-[92%]'>
            <SeasonOverviewLocationAggregatedScoreChart type='wis' />
          </div>
        </Card>

        <Card className='bg-mobs-lab-color text-white overflow-hidden'>
          <div className='p-1 border-b border-gray-700 flex justify-between items-center'>
            <h3 className='text-lg font-medium'>Mean Absolute Percentage Error</h3>
            <button
              onClick={() => dispatch(setMapeChartScaleType(mapeChartScaleType === "log" ? "linear" : "log"))}
              className='bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded'>
              {mapeChartScaleType === "log" ? "Use Linear Scale" : "Use Log Scale"}
            </button>
          </div>
          <div className='w-full h-[92%]'>
            <SeasonOverviewLocationAggregatedScoreChart type='mape' />
          </div>
        </Card>

        {/* TODO: Use updated InfoButton implementation in the form of a rectangle button here */}
        <Card className='bg-mobs-lab-color text-white overflow-hidden'>
          <div className='p-1 border-b border-gray-700 flex-row flex-nowrap align-end justify-center items-center'>
            <h3 className='text-lg font-medium flex-shrink'>Coverage</h3>
          </div>
          <div className='w-full h-[92%]'>
            <SeasonOverviewPIChart />
          </div>
        </Card>
      </div>

      {/* US Map section - full width */}
      <Card className='bg-mobs-lab-color text-white mt-4'>
        {/* <div className='px-4 py-2 border-t border-gray-700'>
          <h3 className='text-lg font-medium'>Title</h3>
        </div> */}
        <div className='w-full aspect-[16/9] min-h-[360px] max-h-[480px]'>
          <SeasonOverviewUSStateMap />
        </div>
      </Card>
    </div>
  );
};

const SingleModelContent = () => {
  const { loadingStates } = useDataContext();
  const { evaluationsSingleModelViewSelectedStateName, evaluationSingleModelViewScoresOption } = useAppSelector(
    (state) => state.evaluationsSingleModelSettings
  );

  if (!loadingStates.groundTruth || !loadingStates.predictions) {
    return (
      <div className='eval-single-model-chart-grid-container'>
        <div className='flex flex-row flex-nowrap align-middle justify-between'>
          {/* Dynamic Title that shows the name of the state selected */}
          <h1 className='sm:text-sm md:text-base lg:text-2xl xl:text-3xl 2xl:text-4xl font-light util-text-limit max-h-8'>
            {evaluationsSingleModelViewSelectedStateName}
          </h1>
          <div className='items-center'>
            <InfoButton content={singleModelInfo} title='Single Model Evaluations' displayStyle='icon'></InfoButton>
          </div>
        </div>
        <div className='chart-container'>
          <div className='p-[0.05rem] border-b border-gray-700 flex justify-between items-center'>Hospitalization Forecasts by Horizon</div>
          <SingleModelHorizonPlot />
        </div>
        <div className='chart-container'>
          <div className='p-[0.05rem] border-b border-gray-700 flex justify-between items-center'>
            {evaluationSingleModelViewScoresOption}
          </div>
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

// Downstream usage of Feature Flag check: whether the season overview tab should be enabled
const isSeasonOverviewEnabled = isFeatureEnabled("seasonOverviewTab");

const EvaluationsPage = () => {
  const defaultTab = isSeasonOverviewEnabled ? "season-overview" : "single-model";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { loadingStates, isFullyLoaded } = useDataContext();

  // Determine which data-slices is needed for each tab
  const seasonOverviewReady = !loadingStates.groundTruth && !loadingStates.predictions;
  const singleModelReady = !loadingStates.groundTruth && !loadingStates.predictions;

  const renderContent = () => {
    if (activeTab === "season-overview") {
      if (!seasonOverviewReady) {
        return <div className='text-white p-4'>Loading season overview data...</div>;
      }
      return <SeasonOverviewContent />;
    } else {
      if (!singleModelReady) {
        return <div className='text-white p-4'>Loading single model data...</div>;
      }
      return <SingleModelContent />;
    }
  };

  return (
    <div className='evaluations-page'>
      <div className='evaluations-settings'>
        {!loadingStates.locations && (activeTab === "season-overview" ? <SeasonOverviewSettings /> : <SingleModelSettingsPanel />)}
      </div>

      <div className='evaluations-content'>
        <div>
          <div className='flex bg-gray-800 border-b border-gray-700'>
            {isSeasonOverviewEnabled ? (
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
            ) : null}
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
          <Card className='p-4 flex-1 bg-mobs-lab-color text-white min-h-0'>{renderContent()}</Card>
        </div>
      </div>

      {!isFullyLoaded && (
        <div className='fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md'>Loading additional data...</div>
      )}
    </div>
  );
};

export default EvaluationsPage;
