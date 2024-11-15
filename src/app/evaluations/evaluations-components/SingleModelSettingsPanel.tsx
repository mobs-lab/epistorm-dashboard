"use client"

import React, {useMemo} from 'react';
import {modelColorMap} from '../../Interfaces/modelColors';
import InfoButton from './InfoButton';
import {SeasonOption} from '../../Interfaces/forecast-interfaces';
import {Radio, Typography} from "../../CSS/material-tailwind-wrapper";
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
import SettingsStateMap from "../../forecasts/forecasts-components/SettingsStateMap";
import SettingsStyledDatePicker from "../../forecasts/forecasts-components/SettingsStyledDatePicker";
import Image from "next/image";

const modelNames = ['MOBS-GLEAM_FLUH', 'CEPH-Rtrend_fluH', 'MIGHTE-Nsemble', 'NU_UCSD-GLEAM_AI_FLUH', 'FluSight-ensemble'];

const SingleModelSettingsPanel: React.FC = () => {

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
        USStateNum, forecastModel, dateStart, dateEnd, dateRange, confidenceInterval, seasonOptions
    } = useAppSelector((state) => state.filter);


    const {earliestDayFromGroundTruthData, latestDayFromGroundTruthData} = useMemo(() => {
        if (groundTruthData.length === 0) {
            return {
                earliestDayFromGroundTruthData: new Date("2022-08-23T12:00:00.000Z"),
                latestDayFromGroundTruthData: new Date("2024-05-24T12:00:00.000Z")
            };
        }

        const sortedData = [...groundTruthData].sort((a, b) => a.date.getTime() - b.date.getTime());
        return {
            earliestDayFromGroundTruthData: sortedData[0].date,
            latestDayFromGroundTruthData: sortedData[sortedData.length - 1].date
        };
    }, [groundTruthData]);

    /*console.log("DEBUG: earliestDayFromGroundTruthData: ", earliestDayFromGroundTruthData);
    console.log("DEBUG: latestDayFromGroundTruthData: ", latestDayFromGroundTruthData);*/

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
        //TODO: Implement this again now that earliest and latest dates are calculated using useMemo
        dispatch(updateDateStart(earliestDayFromGroundTruthData));
        dispatch(updateDateEnd(latestDayFromGroundTruthData));
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

    return (
        <div
            className="bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-hidden util-responsive-text-settings">
            <div className="p-4">
                <div className="flex flex-col flex-wrap justify-stretch items-start w-full">
                    <h2> Select Location </h2>

                    <div className="mb-4 w-full">
                        <SettingsStateMap/>
                    </div>


                    <select
                        value={USStateNum}
                        onChange={(e) => onStateSelectionChange(e.target.value)}
                        className={"text-white border-[#5d636a] border-2 font-sans flex-wrap bg-mobs-lab-color-filterspane rounded-md px-2 py-4 w-full h-full"}
                    >
                        {locationData.map((state) => (<option key={state.state} value={state.stateNum}>
                            {state.stateName}
                            {/*{state.stateNum} : {state.stateName}*/}
                        </option>))}
                    </select>

                    <div className="my-2 w-full h-full overflow-ellipsis">
                        <Typography variant="h6" className="text-white">Model</Typography>
                        <div className="flex flex-col text-wrap">
                            {modelNames.map((model) => (
                                <label key={model} className="inline-flex items-center text-white">
                                <span
                                    className="w-[1em] h-[1em] border-2 rounded-sm mr-2 "
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
                                    <span className="ml-2 text-wrap xs:text-sm ">{model}</span>
                                </label>))}
                        </div>
                    </div>

                    <div className="my-2 w-full h-full">
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
                </div>

                {/*TODO: Score Option that changes how Evaluations display*/}
                <div className={"size-full justify-stretch items-stretch py-4"}>
                    <Typography variant="h6" className="text-white"> Score </Typography>
                </div>


                <div className="w-full h-full justify-stretch items-stretch py-4">
                    <Typography variant="h6" className="text-white">Season</Typography>
                    <select
                        id={"settings-panel-season-select"}
                        value={dateRange}
                        onChange={(e) => onSeasonSelectionChange(e.target.value)}
                        className={"text-white border-[#5d636a] border-2 flex-wrap bg-mobs-lab-color-filterspane rounded-md w-full h-full py-2 px-2 overflow-ellipsis"}
                    >
                        {seasonOptions.map((option: SeasonOption) => (
                            <option key={option.index} value={option.timeValue}>
                                {option.displayString}
                            </option>))}
                    </select>
                </div>


            </div>
            <div className="mx-auto p-2">
                <Image src="/epistorm-logo.png" width={300} height={120} alt="Epistorm Logo"/>
            </div>
        </div>);
}

export default SingleModelSettingsPanel;