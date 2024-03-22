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
    handleDatesSelectionChange: (selections: string) => void;
    handleYAxisScaleChange: (selections: string) => void;
    handleConfidenceIntervalChange: (selections: string) => void;
    handleDisplayModeChange: (selections: string) => void;

    locationData: LocationData[];
};

const FiltersPane: React.FC<FiltersPaneProps> = ({
                                                     handleStateSelectionChange,
                                                     handleModelSelectionChange,
                                                     handleDatesSelectionChange,
                                                     handleYAxisScaleChange,
                                                     handleConfidenceIntervalChange,
                                                     handleDisplayModeChange,
                                                     locationData
                                                 }) => {
    const [selectedUSState, setSelectedUSState] = useState("US");
    const [selectedModel, setSelectedModel] = useState(["MOBS-GLEAM_FLUH"]);
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
        setSelectedModel(selections);
        handleModelSelectionChange(selections);
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

    useEffect(() => {

    }, []);

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