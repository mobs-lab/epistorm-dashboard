// components/FiltersPane.tsx
"use client"

import React, {useState} from 'react';
import StateMap from './svg/StateMap';

type FiltersPaneProps = {
    // Props for the map and filters
};

const FiltersPane: React.FC<FiltersPaneProps> = ({ /* props */}) => {
    // States for form elements
    const [selectedState, setSelectedState] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [yAxisScale, setYAxisScale] = useState('linear');
    const [confidenceInterval, setConfidenceInterval] = useState('none');
    const [displayMode, setDisplayMode] = useState('byDate');

    return (
        <div className="flex flex-col bg-blue-200">
            <h2 className="text-lg font-bold mb-6">Select a location</h2>
            <div className={"flex mx-auto justify-stretch align-super w-full h-full flex-grow"}>
                <StateMap/>
            </div>
            {/* Dropdown for State selection */}
            <label htmlFor="state-select" className="my-4">State</label>
            <select
                id="state-select"
                className="bg-blue-300 mb-4 p-2 rounded"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
            >
                {/* Render state options here */}
            </select>

            {/* Dropdown for Model selection */}
            <label htmlFor="model-select" className="my-4">Model</label>
            <select
                id="model-select"
                className="bg-blue-300 mb-4 p-2 rounded"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
            >
                {/* Render model options here */}
            </select>

            {/* Dropdown for Dates selection */}
            <label htmlFor="date-select" className="my-4">Dates</label>
            <select
                id="date-select"
                className="bg-blue-300 mb-4 p-2 rounded"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
            >
                {/* Render date options here */}
            </select>

            {/* Y-axis scale radio buttons */}
            <fieldset className="my-4">
                <legend className="mb-2">Y-axis scale</legend>
                <label htmlFor="linear" className="inline-flex items-center mr-4">
                    <input
                        type="radio"
                        id="linear"
                        name="yAxisScale"
                        value="linear"
                        checked={yAxisScale === 'linear'}
                        onChange={(e) => setYAxisScale(e.target.value)}
                        className="mr-2"
                    />
                    Linear
                </label>
                <label htmlFor="logarithmic" className="inline-flex items-center">
                    <input
                        type="radio"
                        id="logarithmic"
                        name="yAxisScale"
                        value="logarithmic"
                        checked={yAxisScale === 'logarithmic'}
                        onChange={(e) => setYAxisScale(e.target.value)}
                        className="mr-2"/>
                    Logarithmic
                </label>
            </fieldset>
            {/* Confidence interval radio buttons */}
            <fieldset className="my-4">
                <legend className="mb-2">Confidence interval</legend>
                <label htmlFor="none" className="inline-flex items-center mr-4">
                    <input
                        type="radio"
                        id="none"
                        name="confidenceInterval"
                        value="none"
                        checked={confidenceInterval === 'none'}
                        onChange={(e) => setConfidenceInterval(e.target.value)}
                        className="mr-2"
                    />
                    None
                </label>

                {/* Additional radio buttons for 50%, 90%, 95% */}
                {/* ... */}
            </fieldset>

            {/* Display mode radio buttons */}
            <fieldset className="my-4">
                <legend className="mb-2">Display mode</legend>
                <label htmlFor="byDate" className="inline-flex items-center mr-4">
                    <input
                        type="radio"
                        id="byDate"
                        name="displayMode"
                        value="byDate"
                        checked={displayMode === 'byDate'}
                        onChange={(e) => setDisplayMode(e.target.value)}
                        className="mr-2"
                    />
                    By date
                </label>
                <label htmlFor="byHorizon" className="inline-flex items-center">
                    <input
                        type="radio"
                        id="byHorizon"
                        name="displayMode"
                        value="byHorizon"
                        checked={displayMode === 'byHorizon'}
                        onChange={(e) => setDisplayMode(e.target.value)}
                        className="mr-2"
                    />
                    By horizon
                </label>
            </fieldset>

            {/* Footer with logo */}
            <div className="mt-auto">
                <img src="/placeholder_logo.png" alt="Epistorm" className="h-12 mx-auto"/>
            </div>
        </div>);
};

export default FiltersPane;
