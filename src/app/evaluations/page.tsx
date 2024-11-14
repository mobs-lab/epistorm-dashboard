'use client'

import React, {useState} from "react";
import {Card} from "../CSS/material-tailwind-wrapper";


// Settings Panel Components
const SeasonOverviewSettings = () => {
    return (
        <Card className="bg-gray-800 p-6">
            <h3 className="text-lg text-white mb-4">Season Settings</h3>
            {/* Season Overview specific settings */}
        </Card>
    );
};

const SingleModelSettings = () => {
    return (
        <Card className="bg-gray-800 p-6">
            <h3 className="text-lg text-white mb-4">Model Settings</h3>
            {/* Single Model specific settings */}
        </Card>
    );
};

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


// Main Layout Component
const EvaluationsPage = () => {
    const [activeTab, setActiveTab] = useState('single-model');

    const renderContent = () => {
        switch(activeTab) {
            case 'season-overview':
                return {
                    main: <SeasonOverviewContent />,
                    settings: <SeasonOverviewSettings />
                };
            case 'single-model':
                return {
                    main: <SingleModelContent />,
                    settings: <SingleModelSettings />
                };
            default:
                return {
                    main: <SingleModelContent />,
                    settings: <SingleModelSettings />
                };
        }
    };

    const { main, settings } = renderContent();

    return (
        <div className="flex-1 p-6">
            <h1 className="text-3xl text-white mb-8">Hospital Admission Forecast</h1>

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
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-700" />
            </div>

            {/* Content Area */}
            <div className="flex gap-6">
                <div className="flex-1">
                    {main}
                </div>
                <div className="w-80">
                    {settings}
                </div>
            </div>
        </div>
    );
};

export default EvaluationsPage;
