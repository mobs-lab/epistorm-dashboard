'use client'

import React, {useState} from "react";
import {Card} from "../CSS/material-tailwind-wrapper";
import {SeasonOverviewSettings} from "./evaluations-components/SeasonOverviewSettingsPanel";
import SingleModelSettingsPanel from "./evaluations-components/SingleModelSettingsPanel";

// Content Components
const SeasonOverviewContent = () => {
    return (
        <Card className="bg-gray-800 p-6">
            {/* Season Overview specific content */}
            <div className="text-white">Season Overview Visualizations</div>
        </Card>
    );
};

const SingleModelContent = () => {
    return (
        <Card className="bg-gray-800 p-6">
            {/* Single Model specific content */}
            <div className="text-white">Single Model Visualizations</div>
        </Card>
    );
};


const EvaluationsPage = () => {
    const [activeTab, setActiveTab] = useState('season-overview');

    return (
        <div
            className={"evaluations-page"}
        >
            {/* Header Area */}
            <div className={"evaluations-header"}>
                <h1 className="text-3xl text-white">Hospital Admission Forecast</h1>
            </div>

            {/* Settings Panel */}
            <div className={"evaluations-settings"}>
                {activeTab === 'season-overview' ? <SeasonOverviewSettings/> : <SingleModelSettingsPanel/>}
            </div>

            {/* Tab Panel Area */}
            <div className={"evaluations-content"}>
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
                    <div className={"absolute bottom-0 left-0 right-0 h-[1px] bg-gray-700"}/>
                </div>

                {/* Tab Content */}
                <Card className="h-[calc(100%-2.5rem)] bg-gray-800">
                        {activeTab === 'season-overview' ? (
                            <div className="text-white">Season Overview Content</div>
                        ) : (
                            <div className={"flex flex-col size-full justify-stretch items-stretch align-middle"}>
                                <div className={"flex size-full bg-amber-400"}>
                                    {/*<SingleModelWeeklyForecastBoxPlot/>*/}
                                    <p> Placeholder for box plot </p>
                                </div>
                                <div className={"flex size-full bg-blue-600"}>
                                    {/*<SingleModelWeeklyScoreChart/>*/}
                                    <p> Placeholder for score chart</p>
                                </div>

                            </div>
                        )}
                </Card>
            </div>
        </div>
    );
};

export default EvaluationsPage;