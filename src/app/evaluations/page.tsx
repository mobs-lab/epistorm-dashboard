// File Path: /src/app/evaluations/page.tsx
/* Page Component for displaying tab layout for:
*   - Season Overview
*   - Single Model
* */

'use client'

import React, {useEffect, useRef, useState} from "react";
import {useDataContext} from '../providers/DataProvider';
import {Card} from "../CSS/material-tailwind-wrapper";
import {SeasonOverviewSettings} from "./evaluations-components/SeasonOverview/SeasonOverviewSettingsPanel";
import SingleModelSettingsPanel from "./evaluations-components/SingleModel/SingleModelSettingsPanel";
import SingleModelHorizonPlot from "./evaluations-components/SingleModel/SingleModelHorizonPlot";

const SingleModelContent = () => {
    const {loadingStates} = useDataContext();
    // Default viewBox dimensions - these define the coordinate system
    const DEFAULT_VIEW_WIDTH = 1200;
    const DEFAULT_VIEW_HEIGHT = 600;

    if (!loadingStates.groundTruth || !loadingStates.predictions) {
        return (
            <div className="grid grid-rows-2 gap-4 h-full w-full">
                <div className="w-full h-full min-h-0">
                    <SingleModelHorizonPlot
                        viewBoxWidth={DEFAULT_VIEW_WIDTH}
                        viewBoxHeight={DEFAULT_VIEW_HEIGHT}
                    />
                </div>
                <div className="w-full h-full min-h-0">
                    <p className="text-white">Placeholder for score chart</p>
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

    // Determine which data is needed for each tab
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

    return (
        <div className="evaluations-page">
            {/* Header Area */}
            <div className="evaluations-header">
                <h1 className="text-3xl text-white">Hospital Admission Forecast</h1>
            </div>

            {/* Settings Panel */}
            <div className="evaluations-settings">
                {!loadingStates.locations && (
                    activeTab === 'season-overview' ?
                        <SeasonOverviewSettings/> :
                        <SingleModelSettingsPanel/>
                )}
            </div>

            {/* Tab Panel Area */}
            <div className="evaluations-content">
                {/* Tab Navigation */}
                <div className="relative mb-6">
                    <div className="flex relative">
                        <button
                            onClick={() => setActiveTab('season-overview')}
                            className={`px-6 py-2 text-sm relative ${
                                activeTab === 'season-overview'
                                    ? 'text-white bg-gray-800 border-t border-l border-r border-gray-700'
                                    : 'text-gray-400 hover:text-white'
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
                                    : 'text-gray-400 hover:text-white'
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

                {/* Tab Content */}
                <Card className="h-[calc(100%-2.5rem)] bg-gray-800">
                    {renderContent()}
                </Card>
            </div>

            {/* Optional: Global loading indicator */}
            {!isFullyLoaded && (
                <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md">
                    Loading additional data...
                </div>
            )}
        </div>
    );
};

export default EvaluationsPage;