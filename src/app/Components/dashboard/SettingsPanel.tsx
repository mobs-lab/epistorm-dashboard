// components/SettingsPanel.tsx
"use client"

import React from 'react';
import {modelColorMap} from '../../Interfaces/modelColors';
import InfoButton from './InfoButton';
import {SeasonOption} from '../../Interfaces/forecast-interfaces';
import {Card, CardBody, Option, Radio, Select, Typography} from "../../CSS/material-tailwind-wrapper";
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {
    updateConfidenceInterval,
    updateDateEnd,
    updateDateRange,
    updateDateStart,
    updateForecastModel,
    updateNumOfWeeksAhead,
    updateSelectedState,
    updateYScale
} from '../../store/filterSlice';
import StateMap from "./StateMap";
import StyledDatePicker from "./StyledDatePicker";
import Image from "next/image";


const SettingsPanel: React.FC = () => {

    const stateMapInfo = (<div>
        <p>Use this map to select a specific state for your forecast.</p>
        <p>Click on a state to zoom in and select it. The map will automatically zoom out after selection.</p>
        <p>You can also use the dropdown menu below to select a state.</p>
    </div>);

    /* Redux-Managed State Variables */
    const dispatch = useAppDispatch();

    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const locationData = useAppSelector((state) => state.location.data);

    const {
        USStateNum, forecastModel, dateStart, dateEnd, dateRange, confidenceInterval,
        seasonOptions
    } = useAppSelector((state) => state.filter);

    const earliestDayFromGroundTruthData = groundTruthData.length > 0 ? groundTruthData[groundTruthData.length - 1].date : undefined;
    const latestDayFromGroundTruthData = groundTruthData.length > 0 ? groundTruthData[0].date : undefined;

    const onStateSelectionChange = (stateNum: string) => {
        const selectedState = locationData.find((state) => state.stateNum === stateNum);
        if (selectedState) {
            console.log("SettingsPanel update: State selected: ", selectedState.stateName, " with stateNum: ", selectedState.stateNum);
            dispatch(updateSelectedState({stateName: selectedState.stateName, stateNum: selectedState.stateNum}));
        }
    };

    const onModelSelectionChange = (modelName: string, checked: boolean) => {
        if (checked) {
            dispatch(updateForecastModel([...forecastModel, modelName]));
        } else {
            dispatch(updateForecastModel(forecastModel.filter((model) => model !== modelName)));
        }
    };

    const onNumOfWeeksAheadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateNumOfWeeksAhead(Number(event.target.value)));
    };

    const onDateStartSelectionChange = (date: Date | undefined) => {
        if (date && date >= earliestDayFromGroundTruthData && date <= dateEnd) {
            dispatch(updateDateStart(date));
        } else {
            console.log("SettingsPanel.tsx: Invalid dateStart selection");
        }
    };

    const onDateEndSelectionChange = (date: Date | undefined) => {
        if (date && date >= dateStart && date <= latestDayFromGroundTruthData) {
            dispatch(updateDateEnd(date));
        } else {
            console.log("SettingsPanel.tsx: Invalid dateEnd selection");
        }
    };

    const onSeasonSelectionChange = (timeValue: string) => {
        const selectedOption = seasonOptions.find(option => option.timeValue === timeValue);
        if (selectedOption) {
            dispatch(updateDateRange(timeValue));
            dispatch(updateDateStart(selectedOption.startDate));
            dispatch(updateDateEnd(selectedOption.endDate));
        }
    };

    const handleShowAllDates = () => {
        if (groundTruthData.length > 0) {
            const earliestDate = groundTruthData[groundTruthData.length - 1].date;
            const latestDate = groundTruthData[0].date;
            dispatch(updateDateStart(earliestDate));
            dispatch(updateDateEnd(latestDate));
        }
    };


    const onYAxisScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log("SettingsPanel update: Y-axis scale changed to: ", event.target.value);
        dispatch(updateYScale(event.target.value));
    };

    const onConfidenceIntervalChange = (interval: string, checked: boolean) => {
        // need to also get rid of the percentage sign from the input
        interval = interval.split("%")[0];
        if (checked) {
            dispatch(updateConfidenceInterval([...confidenceInterval, interval]));
        } else {
            dispatch(updateConfidenceInterval(confidenceInterval.filter((model) => model !== interval)));
        }
        console.log("SettingsPanel update: Confidence Interval changed to: ", confidenceInterval);
    };

    const onDisplayModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        //TODO: This controls "By Date" or "By Horizon" display mode
    };


    return (
        <Card className={"bg-[#323944] text-white fill-white w-full h-full overflow-auto"}>
            <CardBody>
                <h2> Select a location <InfoButton title="State Selection Information" content={stateMapInfo}/></h2>

                <div className="mb-4 w-full items-center justify-center style={{ maxHeight: '600px', overflow: 'hidden' }}">
                    <StateMap/>
                </div>

                <div className="mb-4">
                    {/*<b>Select a State</b>*/}
                    <Select
                        value={USStateNum}
                        onChange={(value) => onStateSelectionChange(value as string)}
                        variant="outlined"
                        className={"text-white border-white"}
                    >
                        {locationData.map((state) => (<Option key={state.state} value={state.stateNum}>
                            {state.stateNum} : {state.stateName}
                        </Option>))}
                    </Select>
                </div>

                {/*NOTE: Revisit for potential improvement*/}
                <div className="mb-4">
                    <Typography variant="h6" className="text-white">Model</Typography>
                    <div className="flex flex-col">
                        {["MOBS-GLEAM_FLUH", "CEPH-Rtrend_fluH", "MIGHTE-Nsemble", "NU_UCSD-GLEAM_AI_FLUH"].map((model) => (
                            <label key={model} className="inline-flex items-center text-white">
                                <span
                                    className="w-5 h-5 border-2 rounded-sm mr-2"
                                    style={{
                                        backgroundColor: forecastModel.includes(model) ? modelColorMap[model] : 'transparent',
                                        borderColor: modelColorMap[model],
                                    }}
                                />
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={forecastModel.includes(model)}
                                    onChange={(e) => onModelSelectionChange(model, e.target.checked)}
                                />
                                <span className="ml-2">{model}</span>
                            </label>))}
                    </div>
                </div>

                {/* TODO: Change up this to make season selector correctly work */}
                <div className="mb-4 mt-4">
                    <Typography variant="h6" className="text-white">Season</Typography>
                    <Select
                        value={dateRange}
                        onChange={(value) => onSeasonSelectionChange(value as string)}
                        className="text-white border-white"
                    >
                        {seasonOptions.map((option: SeasonOption) => (
                            <Option key={option.index} value={option.timeValue} className="text-black">
                                {option.displayString}
                            </Option>
                        ))}
                    </Select>
                </div>

                <div className="mb-4 flex-col justify-between">
                    <div>
                        <Typography variant="h6" className="text-white">Start Date</Typography>
                        <StyledDatePicker
                            value={dateStart}
                            onChange={onDateStartSelectionChange}
                            minDate={earliestDayFromGroundTruthData}
                            maxDate={dateEnd}
                        />
                    </div>
                    <div>
                        <Typography variant="h6" className="text-white">End Date</Typography>
                        <StyledDatePicker
                            value={dateEnd}
                            onChange={onDateEndSelectionChange}
                            minDate={dateStart}
                            maxDate={latestDayFromGroundTruthData}
                        />
                    </div>
                    <button
                        className="my-2 px-2 bg-[#b2b2b2] text-white rounded text-sm"
                        onClick={handleShowAllDates}
                    >
                        Show All
                    </button>
                </div>


                <div className="mb-4">
                    <Typography variant="h6" className="text-white"> Horizon </Typography>
                    {[0, 1, 2, 3].map((value) => (<Radio
                        key={value}
                        name="weeksAheadRadioBtn"
                        value={value.toString()}
                        label={value.toString()}
                        onChange={(e) => onNumOfWeeksAheadChange(e)}
                        className="text-white"
                        labelProps={{className: "text-white"}}
                        defaultChecked={value === 3}
                    />))}
                </div>
                <div className="mb-4">
                    <Typography variant="h6" className="text-white">Y-axis scale</Typography>
                    {["linear", "log"].map((value) => (<Radio
                        key={value}
                        name="yAxisRadioBtn"
                        value={value}
                        label={value === "linear" ? "Linear" : "Logarithmic"}
                        onChange={(e) => onYAxisScaleChange(e)}
                        className="text-white"
                        labelProps={{className: "text-white"}}
                        defaultChecked={value === "linear"}
                    />))}
                </div>

                <div className="mb-4">
                    <Typography variant="h6" className="text-white">Confidence Interval</Typography>
                    <div className="flex items-center space-x-4">
                        {["50%", "90%", "95%"].map((interval) => (
                            <label key={interval} className="inline-flex items-center text-white">
                                <input
                                    type="checkbox"
                                    className="form-checkbox text-blue-600 mr-2"
                                    checked={confidenceInterval.includes(interval.split("%")[0])}
                                    onChange={(e) => onConfidenceIntervalChange(interval, e.target.checked)}
                                />
                                <span>{interval}</span>
                            </label>
                        ))}
                        <button
                            className={`px-4 py-2 rounded ${confidenceInterval.length === 0 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                            onClick={() => dispatch(updateConfidenceInterval([]))}
                        >
                            None
                        </button>
                    </div>
                </div>
                {/*<div>
                    <Typography variant="h6" className="text-white">Display mode</Typography>
                    {["byDate", "byHorizon"].map((value) => (<Radio
                        key={value}
                        name="displayModeRadioBtn"
                        value={value}
                        label={value === "byDate" ? "By Date" : "By Horizon"}
                        onChange={(e) => onDisplayModeChange(e)}
                        className="text-white"
                        labelProps={{className: "text-white"}}
                        defaultChecked={value === "byDate"}
                    />))}
                </div>*/}
                <div>
                    <Image src={"/epistorm-logo.png"} width={200} height={300} alt={"Epistorm Logo"}/>
                </div>

            </CardBody>
        </Card>)
        ;
}

export default SettingsPanel;