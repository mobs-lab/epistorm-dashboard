// components/FiltersPane.tsx
"use client"

import React from 'react';
import StateMap from "./StateMap"
import {format} from "date-fns";
/*
NOTE: Since using Next.js, these are from our own custom wrapper for required UI components
    See import origin for detail
    */
import {
    Card,
    CardBody,
    ChevronLeftIcon,
    ChevronRightIcon,
    Input,
    Option,
    Popover,
    PopoverContent,
    PopoverHandler,
    Radio,
    Select,
    Typography
} from "../../CSS/material-tailwind-wrapper";
import {DayPicker} from "react-day-picker";
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


// Date Range Mapping from season selection to actual date range
const dateRangeMapping = {
    "2021-2022": [new Date("2021-06-01"), new Date("2022-06-01")],
    "2022-2023": [new Date("2022-06-01"), new Date("2023-06-01")],
    "2023-2024": [new Date("2023-06-01"), new Date("2024-04-06")],
    "2024-2025": [new Date("2024-06-01"), new Date("2025-06-01")],
}


const FiltersPane: React.FC = () => {
    const dispatch = useAppDispatch();
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const locationData = useAppSelector((state) => state.location.data);
    const {
        selectedStateName,
        USStateNum,
        forecastModel,
        numOfWeeksAhead,
        dateStart,
        dateEnd,
        yAxisScale,
        confidenceInterval,
        displayMode,
    } = useAppSelector((state) => state.filter);
    const [dateRange, setDateRange] = React.useState("2023-2024");


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
        if (date && groundTruthData.length > 0 && date <= dateEnd) {
            dispatch(updateDateStart(date));
        }
    };

    const onDateEndSelectionChange = (date: Date | undefined) => {
        if (date && groundTruthData.length > 0 && date >= dateStart) {
            dispatch(updateDateEnd(date));
        }
    };

    const onDateRangeSelectionChange = (event: string | undefined) => {
        if (event && groundTruthData.length > 0) {
            dispatch(updateDateRange(event));
            const dateRange = dateRangeMapping[event];
            const startDate = dateRange[0];
            const endDate = dateRange[1];
            if (startDate >= groundTruthData[groundTruthData.length - 1].date && endDate <= groundTruthData[0].date) {
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

    const disabledStartDays = groundTruthData.length > 0 ? [{
        before: groundTruthData[groundTruthData.length - 1].date,
        after: dateRangeMapping[dateRange][1],
    },] : [];

    const disabledEndDays = groundTruthData.length > 0 ? [{
        before: dateRangeMapping[dateRange][0],
        after: groundTruthData[0].date,
    },] : [];

    return (
        <Card>
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
                        {locationData.map((state) => (
                            <Option key={state.state} value={state.stateNum}>
                                {state.stateNum} : {state.stateName}
                            </Option>
                        ))}
                    </Select>
                </div>

                {/*NOTE: Revisit for potential improvement*/}
                <div className="mb-4">
                    <Typography variant="h6">Model</Typography>
                    <div className="flex flex-col">
                        {["MOBS-GLEAM_FLUH", "CEPH-Rtrend_fluH", "MIGHTE-Nsemble", "NU_UCSD-GLEAM_AI_FLUH"].map((model) => (
                            <label key={model} className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    className="form-checkbox text-blue-600"
                                    checked={forecastModel.includes(model)}
                                    onChange={(e) => onModelSelectionChange(model, e.target.checked)}
                                />
                                <span className="ml-2 text-gray-700">{model}</span>
                            </label>))}
                    </div>
                </div>

                <div className="mb-4 mt-4">
                    <Typography variant="h6">Dates</Typography>
                    <Select label={"Select a Season"} value={dateRange}
                            onChange={(value) => {
                                setDateRange(value);
                                onDateRangeSelectionChange(value);
                            }}>
                        <Option value="2021-2022">2021–2022</Option>
                        <Option value="2022-2023">2022–2023</Option>
                        <Option value="2023-2024">2023–2024</Option>
                        <Option value="2024-2025">2024–2025</Option>
                    </Select>
                    <div className="mt-4 mb-4">
                        <Popover placement={"bottom"}>
                            <PopoverHandler>
                                <Input label={"Select Start Date"}
                                       value={dateStart ? format(dateStart, "PPP") : ""}
                                       onChange={() => null}/>
                            </PopoverHandler>
                            <PopoverContent>
                                <DayPicker
                                    mode="single"
                                    selected={dateStart}
                                    onSelect={(value) => onDateStartSelectionChange(value)}
                                    showOutsideDays
                                    disabled={disabledStartDays}
                                    className="border-0"
                                    classNames={{
                                        caption: "flex justify-center py-2 mb-4 relative items-center",
                                        caption_label: "text-sm font-medium text-gray-900",
                                        nav: "flex items-center",
                                        nav_button: "h-6 w-6 bg-transparent hover:bg-blue-gray-50 p-1 rounded-md transition-colors duration-300",
                                        nav_button_previous: "absolute left-1.5",
                                        nav_button_next: "absolute right-1.5",
                                        table: "w-full border-collapse",
                                        head_row: "flex font-medium text-gray-900",
                                        head_cell: "m-0.5 w-9 font-normal text-sm",
                                        row: "flex w-full mt-2",
                                        cell: "text-gray-600 rounded-md h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-900/20 [&:has([aria-selected].day-outside)]:text-white [&:has([aria-selected])]:bg-gray-900/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: "h-9 w-9 p-0 font-normal",
                                        day_range_end: "day-range-end",
                                        day_selected: "rounded-md bg-gray-900 text-white hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
                                        day_today: "rounded-md bg-gray-200 text-gray-900",
                                        day_outside: "day-outside text-gray-500 opacity-50 aria-selected:bg-gray-500 aria-selected:text-gray-900 aria-selected:bg-opacity-10",
                                        day_disabled: "text-gray-500 opacity-50",
                                        day_hidden: "invisible",
                                    }}
                                    components={{
                                        IconLeft: ({...props}) => (
                                            <ChevronLeftIcon {...props} className="h-4 w-4 stroke-2"/>),
                                        IconRight: ({...props}) => (
                                            <ChevronRightIcon {...props} className="h-4 w-4 stroke-2"/>),
                                    }}
                                />

                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Popover placement={"bottom"}>
                            <PopoverHandler>
                                <Input label={"Select End Date"}
                                       value={dateEnd ? format(dateEnd, "PPP") : ""}
                                       onChange={() => null}/>
                            </PopoverHandler>
                            <PopoverContent>
                                <DayPicker
                                    mode="single"
                                    selected={dateEnd}
                                    onSelect={(value) => onDateEndSelectionChange(value)}
                                    showOutsideDays
                                    disabled={disabledEndDays}
                                    className="border-0"
                                    classNames={{
                                        caption: "flex justify-center py-2 mb-4 relative items-center",
                                        caption_label: "text-sm font-medium text-gray-900",
                                        nav: "flex items-center",
                                        nav_button: "h-6 w-6 bg-transparent hover:bg-blue-gray-50 p-1 rounded-md transition-colors duration-300",
                                        nav_button_previous: "absolute left-1.5",
                                        nav_button_next: "absolute right-1.5",
                                        table: "w-full border-collapse",
                                        head_row: "flex font-medium text-gray-900",
                                        head_cell: "m-0.5 w-9 font-normal text-sm",
                                        row: "flex w-full mt-2",
                                        cell: "text-gray-600 rounded-md h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-900/20 [&:has([aria-selected].day-outside)]:text-white [&:has([aria-selected])]:bg-gray-900/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: "h-9 w-9 p-0 font-normal",
                                        day_range_end: "day-range-end",
                                        day_selected: "rounded-md bg-gray-900 text-white hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
                                        day_today: "rounded-md bg-gray-200 text-gray-900",
                                        day_outside: "day-outside text-gray-500 opacity-50 aria-selected:bg-gray-500 aria-selected:text-gray-900 aria-selected:bg-opacity-10",
                                        day_disabled: "text-gray-500 opacity-50",
                                        day_hidden: "invisible",
                                    }}
                                    components={{
                                        IconLeft: ({...props}) => (
                                            <ChevronLeftIcon {...props} className="h-4 w-4 stroke-2"/>),
                                        IconRight: ({...props}) => (
                                            <ChevronRightIcon {...props} className="h-4 w-4 stroke-2"/>),
                                    }}
                                />

                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="mb-4">
                    <Typography variant={"h6"}> Number of Weeks Ahead </Typography>
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