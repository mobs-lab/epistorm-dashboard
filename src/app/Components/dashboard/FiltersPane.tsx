// components/FiltersPane.tsx
"use client"

import React, {useEffect, useState} from 'react';
import StateMap from "./svg/StateMap";

interface LocationData {
    stateNum: string;
    state: string;
    stateName: string;
}

type FiltersPaneProps = {
    handleStateSelectionChange: (selections: string) => void;
    handleModelSelectionChange: (selections: string[]) => void;
    handleNumOfWeeksAheadChange: (selections: number) => void;
    handleDatesSelectionChange: (selections: string) => void;
    handleYAxisScaleChange: (selections: string) => void;
    handleConfidenceIntervalChange: (selections: string) => void;
    handleDisplayModeChange: (selections: string) => void;

    locationData: LocationData[];
};

const FiltersPane: React.FC<FiltersPaneProps> = ({
                                                     handleStateSelectionChange,
                                                     handleModelSelectionChange,
                                                     handleNumOfWeeksAheadChange,
                                                     handleDatesSelectionChange,
                                                     handleYAxisScaleChange,
                                                     handleConfidenceIntervalChange,
                                                     handleDisplayModeChange,
                                                     locationData
                                                 }) => {
    const [selectedUSState, setSelectedUSState] = useState("US");
    const [selectedModel, setSelectedModel] = useState(["MOBS-GLEAM_FLUH"]);
    const [selectedNumOfWeeksAhead, setSelectedNumOfWeeksAhead] = useState(1);
    const [selectedDates, setSelectedDates] = useState("");
    const [yAxisScale, setYAxisScale] = useState("");
    const [confidenceInterval, setConfidenceInterval] = useState("");
    const [displayMode, setDisplayMode] = useState("");

    const onStateSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selection = event.target.value;
        setSelectedUSState(selection);
        handleStateSelectionChange(selection);
    }

    const onModelSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selections = Array.from(event.target.selectedOptions, option => option.value);
        console.log(selections);
        setSelectedModel(selections);
        handleModelSelectionChange(selections);
    }

    const onNumOfWeeksAheadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selection = Number(event.target.value);
        setSelectedNumOfWeeksAhead(selection);
        handleNumOfWeeksAheadChange(selection);
    }

    const onDatesSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selection = event.target.value;
        setSelectedDates(selection);
        handleDatesSelectionChange(selection);
    }

    const onYAxisScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selection = event.target.value;
        setYAxisScale(selection);
        handleYAxisScaleChange(selection);
    }

    const onConfidenceIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selection = event.target.value;
        setConfidenceInterval(selection);
        handleConfidenceIntervalChange(selection);
    }

    const onDisplayModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selection = event.target.value;
        setDisplayMode(selection);
        handleDisplayModeChange(selection);
    }

    return (
        <>
            <div>
                <h1>Map of US States</h1>
                <StateMap/>
            </div>
            {/* TODO: The three drop-down menus, for state selection, model selection (multiple), and dates selection (leave hard-coded for now)*/}
            <div>
                <h1>Drop down Menus</h1>
                <select value={selectedUSState} onChange={onStateSelectionChange}>
                    {/*<option value={"US"}>US</option>*/}
                    {locationData.map((state) => {
                        return <option key={state.state} value={state.stateNum}>{state.stateName}</option>
                    })}
                </select>
                <select value={selectedModel} onChange={onModelSelectionChange} multiple>
                    <option value={"MOBS-GLEAM_FLUH"}>MOBS-GLEAM_FLUH</option>
                    <option value={"CEPH-Rtrend_fluH"}>CEPH-Rtrend_fluH</option>
                    <option value={"MIGHTE-Nsemble"}>MIGHTE-Nsemble</option>
                    <option value={"NU_UCSD-GLEAM_AI_FLUH"}>NU_UCSD-GLEAM_AI_FLUH</option>
                </select>
                <select value={selectedDates} onChange={onDatesSelectionChange}>
                    <option value={"2023-2024"}> 2023–2024 </option>
                </select>
            </div>
            {/* TODO: 4 buttons from left to right, to determine number of weeks ahead of predictions to display */}
            <div>
                <h1>Number of Weeks Ahead</h1>
                <input type="radio" id="1" name="weeksAhead" value="1" onChange={onNumOfWeeksAheadChange}/>
                <label htmlFor="1">1</label>
                <input type="radio" id="2" name="weeksAhead" value="2" onChange={onNumOfWeeksAheadChange}/>
                <label htmlFor="2">2</label>
                <input type="radio" id="3" name="weeksAhead" value="3" onChange={onNumOfWeeksAheadChange}/>
                <label htmlFor="3">3</label>
                <input type="radio" id="4" name="weeksAhead" value="4" onChange={onNumOfWeeksAheadChange}/>
                <label htmlFor="4">4</label>
            </div>

            {/* TODO: Y-axis scale selection, radio buttons*/}
            <div>
                <h1>Y-Axis Options</h1>
            </div>
            {/* TODO: Confidence Interval Selection, radio buttons*/}
            <div>
                <h1>Confidence Intervals</h1>
            </div>
            {/* TODO: Display mode selection, buttons side by side*/}
            <div>
                <h1>Display mode</h1>
            </div>
        </>
    )

}

export default FiltersPane;