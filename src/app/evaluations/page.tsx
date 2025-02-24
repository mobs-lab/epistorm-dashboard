// File Path: /src/app/evaluations/page.tsx
/* Page Component for displaying tab layout for:
*   - Season Overview
*   - Single Model
* */

'use client'

import React, {useEffect, useRef, useState} from "react";
import {useDataContext} from '../providers/DataProvider';
import {Card} from "../css/material-tailwind-wrapper";
import {SeasonOverviewSettings} from "./evaluations-components/SeasonOverview/SeasonOverviewSettingsPanel";
import SingleModelSettingsPanel from "./evaluations-components/SingleModel/SingleModelSettingsPanel";
import SingleModelHorizonPlot from "./evaluations-components/SingleModel/SingleModelHorizonPlot";
import SingleModelScoreLineChart from "./evaluations-components/SingleModel/SingleModelScoreLineChart";

const SingleModelContent = () => {
    const {loadingStates} = useDataContext();

    if (!loadingStates.groundTruth || !loadingStates.predictions) {
        return (
            <div className="chart-grid-container">
                <div className="chart-container">
                    <SingleModelHorizonPlot />
                </div>
                <div className="chart-container">
                    <SingleModelScoreLineChart />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-white">Loading data...</p>
        </div>
    );
};


const EvaluationsPage = () => {
    const [activeTab, setActiveTab] = useState('season-overview');
    const {loadingStates, isFullyLoaded} = useDataContext();

    // Determine which data-slices is needed for each tab
    const seasonOverviewReady = !loadingStates.groundTruth && !loadingStates.predictions;
    const singleModelReady = !loadingStates.groundTruth && !loadingStates.predictions;

    const renderContent = () => {
        if (activeTab === 'season-overview') {
            if (!seasonOverviewReady) {
                return <div className="text-white p-4">Loading season overview data...</div>;
            }
            return <div className="text-white">Season Overview Content</div>;
        } else {
            if (!singleModelReady) {
                return <div className="text-white p-4">Loading single model data...</div>;
            }
            return <SingleModelContent/>;
        }
    };

    // @ts-ignore
    return (
        <div className="evaluations-page">
            <div className="evaluations-header">
                <h1 className="text-3xl text-white">Hospital Admission Forecast</h1>
            </div>

            <div className="evaluations-settings">
                {!loadingStates.locations && (
                    activeTab === 'season-overview' ?
                        <SeasonOverviewSettings/> :
                        <SingleModelSettingsPanel/>
                )}
            </div>

            <div className="evaluations-content">
                <div className="mb-4">
                    <div className="flex relative">
                        <button
                            onClick={() => setActiveTab('season-overview')}
                            className={`px-6 py-2 text-sm relative ${
                                activeTab === 'season-overview'
                                    ? 'text-white bg-gray-800 border-t border-l border-r border-gray-700'
                                    : 'text-white hover:text-white'
                            }`}
                            style={{
                                marginBottom: '-1px',
                                zIndex: activeTab === 'season-overview' ? 1 : 0
                            }}
                        >
                            Season Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('single-model')}
                            className={`px-6 py-2 text-sm relative ${
                                activeTab === 'single-model'
                                    ? 'text-white bg-gray-800 border-t border-l border-r border-gray-700'
                                    : 'text-white hover:text-white'
                            }`}
                            style={{
                                marginBottom: '-1px',
                                zIndex: activeTab === 'single-model' ? 1 : 0
                            }}
                        >
                            Single Model
                        </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-700"/>
                </div>

                <div className="tab-container">
                    <Card className="flex-1 bg-mobs-lab-color text-white min-h-0">
                        {renderContent()}
                    </Card>
                </div>
            </div>

            {!isFullyLoaded && (
                <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md">
                    Loading additional data...
                </div>
            )}
        </div>
    );

};

export default EvaluationsPage;