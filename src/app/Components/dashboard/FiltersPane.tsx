// components/FiltersPane.tsx
"use client"

import React, {useEffect, useState} from 'react';
import {modelColorMap} from '../../Interfaces/modelColors';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';

/*
NOTE: Since using Next.js, these are from our own custom wrapper for required UI components
    See import origin for detail
    */
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


// Date Range Mapping from season selection to actual date range
const dateRangeMapping = {
    "2021-2022": [new Date("2021-06-01T00:00:00.000Z"), new Date("2022-06-01T00:00:00.000Z")],
    "2022-2023": [new Date("2022-06-01T00:00:00.000Z"), new Date("2023-06-01T00:00:00.000Z")],
    "2023-2024": [new Date("2023-06-01T00:00:00.000Z"), new Date("2024-06-01T00:00:00.000Z")],
    "2024-2025": [new Date("2024-06-01T00:00:00.000Z"), new Date("2025-06-01T00:00:00.000Z")],
}


const FiltersPane: React.FC = () => {
    const dispatch = useAppDispatch();
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const locationData = useAppSelector((state) => state.location.data);
    const predictionsData = useAppSelector((state) => state.predictions.data);
    const {
        USStateNum, forecastModel, dateStart, dateEnd, dateRange, confidenceInterval,
    } = useAppSelector((state) => state.filter);

    const [startDateMaxDate, setStartDateMaxDate] = useState<Date | undefined>(undefined);
    const [endDateMinDate, setEndDateMinDate] = useState<Date | undefined>(undefined);


    const onStateSelectionChange = (stateNum: string) => {
        const selectedState = locationData.find((state) => state.stateNum === stateNum);
        if (selectedState) {
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
            console.log('Selected start date:', date);
        }
    };

    const onDateEndSelectionChange = (date: Date | undefined) => {
        if (date && date >= dateStart && date <= latestDayFromGroundTruthData) {

            dispatch(updateDateEnd(date));

        }
    };

    useEffect(() => {
        console.log('dateEnd value:', dateEnd);
        console.log('dateStart value:', dateStart);
        setStartDateMaxDate(dateEnd);
        setEndDateMinDate(dateStart);
    }, [dateEnd, dateStart]);

    const earliestDayFromGroundTruthData = groundTruthData.length > 0 ? groundTruthData[groundTruthData.length - 1].date : undefined;
    const latestDayFromGroundTruthData = groundTruthData.length > 0 ? groundTruthData[0].date : undefined;

    const onDateRangeSelectionChange = (event: string | undefined) => {
        if (event && groundTruthData.length > 0) {
            dispatch(updateDateRange(event));
            const dateRange = dateRangeMapping[event];
            const startDate = dateRange[0];
            const endDate = dateRange[1];
            if (startDate >= earliestDayFromGroundTruthData && endDate <= latestDayFromGroundTruthData && earliestDayFromGroundTruthData && latestDayFromGroundTruthData) {
                dispatch(updateDateStart(startDate));
                dispatch(updateDateEnd(endDate));
            }
        }
    };

    const onYAxisScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log("FiltersPane update: Y-axis scale changed to: ", event.target.value);
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
        console.log("FiltersPane update: Confidence Interval changed to: ", confidenceInterval);
    };

    const onDisplayModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        //TODO: This controls "By Date" or "By Horizon" display mode
    };


    return (<Card>
        <CardBody>
            <div className="mb-4 flex items-center justify-center h-full w-full">
                <StateMap/>
            </div>
            <div className="mb-4">
                <Typography variant="h6">State</Typography>
                <Select
                    label="Select a State"
                    value={USStateNum}
                    onChange={(value) => onStateSelectionChange(value as string)}
                    variant="outlined">
                    {locationData.map((state) => (<Option key={state.state} value={state.stateNum}>
                        {state.stateNum} : {state.stateName}
                    </Option>))}
                </Select>
            </div>

            {/*NOTE: Revisit for potential improvement*/}
            <div className="mb-4">
                <Typography variant="h6">Model</Typography>
                <div className="flex flex-col">
                    {["MOBS-GLEAM_FLUH", "CEPH-Rtrend_fluH", "MIGHTE-Nsemble", "NU_UCSD-GLEAM_AI_FLUH"].map((model) => (
                        <label key={model} className="inline-flex items-center">
                <span
                    className="w-5 h-5 border-2 rounded-sm mr-2"
                    style={{
                        backgroundColor: forecastModel.includes(model) ? modelColorMap[model] : 'white',
                        borderColor: modelColorMap[model],
                    }}
                />
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={forecastModel.includes(model)}
                                onChange={(e) => onModelSelectionChange(model, e.target.checked)}
                            />
                            <span className="ml-2 text-gray-700">{model}</span>
                        </label>))}
                </div>
            </div>

            <div className="mb-4 mt-4">
                <Typography variant="h6">Dates</Typography>
                <Select
                    label="Select a Season"
                    value={dateRange}
                    onChange={onDateRangeSelectionChange}
                >
                    <Option value="2021-2022">2021–2022</Option>
                    <Option value="2022-2023">2022–2023</Option>
                    <Option value="2023-2024">2023–2024</Option>
                    <Option value="2024-2025">2024–2025</Option>
                </Select>
            </div>

            <div className="mb-4">
                <Typography variant="h6">Start Date</Typography>
                <DatePicker
                    value={dateStart}
                    onChange={onDateStartSelectionChange}
                    minDate={earliestDayFromGroundTruthData}
                    maxDate={startDateMaxDate}
                    format="yyyy-MM-dd"
                />
            </div>

            <div className="mb-4">
                <Typography variant="h6">End Date</Typography>
                <DatePicker
                    value={dateEnd}
                    onChange={onDateEndSelectionChange}
                    minDate={endDateMinDate}
                    maxDate={latestDayFromGroundTruthData}
                    format="yyyy-MM-dd"
                />
            </div>

            <div className="mb-4">
                <Typography variant={"h6"}> Number of Forecast Horizon </Typography>
                <Radio name={"weeksAheadRadioBtn"} value={"0"} label={"0"}
                       onChange={(value) => onNumOfWeeksAheadChange(value)}/>
                <Radio name={"weeksAheadRadioBtn"} value={"1"} label={"1"}
                       onChange={(value) => onNumOfWeeksAheadChange(value)}/>
                <Radio name={"weeksAheadRadioBtn"} value={"2"} label={"2"}
                       onChange={(value) => onNumOfWeeksAheadChange(value)}/>
                <Radio name={"weeksAheadRadioBtn"} value={"3"} label={"3"}
                       onChange={(value) => onNumOfWeeksAheadChange(value)} defaultChecked={true}/>
            </div>
            <div className="mb-4">
                <Typography variant="h6">Y-axis scale</Typography>
                <Radio name={"yAxisRadioBtn"} value={"linear"} label="Linear"
                       onChange={(value => onYAxisScaleChange(value))}
                       defaultChecked={true}/>
                <Radio name={"yAxisRadioBtn"} value={"log"} label="Logarithmic"
                       onChange={(value) => onYAxisScaleChange(value)}/>
            </div>
            <div className="mb-4">
                <Typography variant="h6">Confidence Interval</Typography>
                <div className="flex flex-col">
                    {["50%", "90%", "95%"].map((interval) => (
                        <label key={interval} className="inline-flex items-center">
                            <input
                                type="checkbox"
                                className="form-checkbox text-blue-600"
                                checked={confidenceInterval.includes(interval.split("%")[0])}
                                onChange={(e) => onConfidenceIntervalChange(interval, e.target.checked)}
                            />
                            <span className="ml-2 text-gray-700">{interval}</span>
                        </label>))}
                </div>
                <button
                    className={`px-4 py-2 rounded ${confidenceInterval.length === 0 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                    onClick={() => dispatch(updateConfidenceInterval([]))}
                >
                    None
                </button>
            </div>
            <div>
                <Typography variant="h6">Display mode</Typography>
                <Radio name={"displayModeRadioBtn"} value={"byDate"} label="By Date"
                       onChange={(value) => onDisplayModeChange(value)} defaultChecked={true}/>
                <Radio name={"displayModeRadioBtn"} value={"byHorizon"} label="By Horizon"
                       onChange={(value) => onDisplayModeChange(value)}/>
            </div>
        </CardBody>
    </Card>);
}

export default FiltersPane;