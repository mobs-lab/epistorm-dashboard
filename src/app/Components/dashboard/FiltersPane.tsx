// components/FiltersPane.tsx
"use client"

import React, {useEffect, useState} from 'react';
import StateMap from "./StateMap";
import {format} from "date-fns";
import {
    Select,
    Option,
    Radio,
    Typography,
    Card,
    CardBody,
    CardHeader,
    Input,
    Popover,
    PopoverHandler,
    PopoverContent,
    Menu,
    MenuHandler,
    MenuItem,
    Checkbox,
    MenuList,
    Button,
    ChevronLeftIcon,
    ChevronRightIcon
} from "../../CSS/material-tailwind-wrapper";
import {DayPicker} from "react-day-picker";

import {LocationData} from "../../Interfaces/forecast-interfaces";

type FiltersPaneProps = {
    handleStateSelectionChange: (selections: string) => void;
    handleModelSelectionChange: (selections: string[]) => void;
    handleNumOfWeeksAheadChange: (selections: number) => void;
    handleDateStartSelectionChange: (selections: Date) => void;
    handleDateEndSelectionChange: (selections: Date) => void;
    handleYAxisScaleChange: (selections: string) => void;
    handleConfidenceIntervalChange: (selections: string) => void;
    handleDisplayModeChange: (selections: string) => void;

    locationData: LocationData[];
};

// Date Range Mapping from season selection to actual date range
const dateRangeMapping = {
    "2021-2022": [new Date("2021-06-01"), new Date("2022-06-01")],
    "2022-2023": [new Date("2022-06-01"), new Date("2023-06-01")],
    // TODO change the dates mapping later to reflect current date
    "2023-2024": [new Date("2023-06-01"), new Date("2024-04-06")],
    "2024-2025": [new Date("2024-06-01"), new Date("2025-06-01")],
}


const FiltersPane: React.FC<FiltersPaneProps> = ({
                                                     handleStateSelectionChange,
                                                     handleModelSelectionChange,
                                                     handleNumOfWeeksAheadChange,
                                                     handleDateStartSelectionChange,
                                                     handleDateEndSelectionChange,
                                                     handleYAxisScaleChange,
                                                     handleConfidenceIntervalChange,
                                                     handleDisplayModeChange,
                                                     locationData
                                                 }) => {
    const [selectedUSState, setSelectedUSState] = useState("US");
    const [selectedModel, setSelectedModel] = useState(["MOBS-GLEAM_FLUH"]);
    const [selectedNumOfWeeksAhead, setSelectedNumOfWeeksAhead] = useState(1);
    const [selectedDateStart, setSelectedDateStart] = useState(new Date("2023-06-01"));
    const [selectedDateEnd, setSelectedDateEnd] = useState(new Date("2024-04-06"));
    const [selectedDateRange, setSelectedDateRange] = useState("2023-2024"); // Default to 2023-2024
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

    const onDateStartSelectionChange = (date: Date) => {
        setSelectedDateStart(date);
        handleDateStartSelectionChange(date);
    }

    const onDateEndSelectionChange = (date: Date) => {
        setSelectedDateEnd(date);
        handleDateEndSelectionChange(date);
    }

    const onDateRangeSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selection = event.target.value;
        setSelectedDateRange(selection);
        // @ts-ignore
        const dateRange = dateRangeMapping[selection];
        setSelectedDateStart(dateRange[0]);
        setSelectedDateEnd(dateRange[1]);
        handleDateStartSelectionChange(dateRange[0]);
        handleDateEndSelectionChange(dateRange[1]);
    };

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
        <Card>
            <CardHeader color="blue" className="p-4">
                <Typography variant="h6" color="white">
                    Select a location
                </Typography>
            </CardHeader>
            <CardBody>
                <div className="mb-4">
                    <StateMap selectedState={selectedUSState} setSelectedState={handleStateSelectionChange}/>
                </div>
                <div className="mb-4">
                    <Typography variant="h6">State</Typography>
                    <Select value={selectedUSState} onChange={() => onStateSelectionChange}>
                        {locationData.map((state) => (
                            <Option key={state.state} value={state.stateNum}>
                                {state.stateNum} : {state.stateName}
                            </Option>
                        ))}
                    </Select>
                </div>
                <div className="mb-4 w-full mx-auto">
                    <Typography variant="h6">Model</Typography>
                    <Menu
                        dismiss={{
                            itemPress: false,
                        }}
                    >
                        <MenuHandler>
                            <Select><Typography variant="h6">Model Selection</Typography></Select>
                        </MenuHandler>
                        <MenuList>
                            <MenuItem className="p-0">
                                <label
                                    htmlFor="MOBS-GLEAM_FLUH"
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                >
                                    <Checkbox
                                        ripple={false}
                                        id="MOBS-GLEAM_FLUH"
                                        containerProps={{className: "p-0"}}
                                        className="hover:before:content-none"
                                        checked={selectedModel.includes("MOBS-GLEAM_FLUH")}
                                        onChange={() => onModelSelectionChange}
                                    />
                                    MOBS-GLEAM_FLUH
                                </label>
                            </MenuItem>
                            <MenuItem className="p-0">
                                <label
                                    htmlFor="CEPH-Rtrend_fluH"
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                >
                                    <Checkbox
                                        ripple={false}
                                        id="CEPH-Rtrend_fluH"
                                        containerProps={{className: "p-0"}}
                                        className="hover:before:content-none"
                                        checked={selectedModel.includes("CEPH-Rtrend_fluH")}
                                        onChange={() => onModelSelectionChange}
                                        crossOrigin={undefined}/>
                                    CEPH-Rtrend_fluH
                                </label>
                            </MenuItem>
                            <MenuItem className="p-0">
                                <label
                                    htmlFor="MIGHTE-Nsemble"
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                >
                                    <Checkbox
                                        ripple={false}
                                        id="MIGHTE-Nsemble"
                                        containerProps={{className: "p-0"}}
                                        className="hover:before:content-none"
                                        checked={selectedModel.includes("MIGHTE-Nsemble")}
                                        onChange={() => onModelSelectionChange}
                                    />
                                    MIGHTE-Nsemble
                                </label>
                            </MenuItem>
                            <MenuItem className="p-0">
                                <label
                                    htmlFor="NU_UCSD-GLEAM_AI_FLUH"
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                >
                                    <Checkbox
                                        ripple={false}
                                        id="NU_UCSD-GLEAM_AI_FLUH"
                                        containerProps={{className: "p-0"}}
                                        className="hover:before:content-none"
                                        checked={selectedModel.includes("NU_UCSD-GLEAM_AI_FLUH")}
                                        onChange={() => onModelSelectionChange}
                                    />
                                    NU_UCSD-GLEAM_AI_FLUH
                                </label>
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </div>
                <div className="mb-4">
                    <Typography variant="h6">Dates</Typography>
                    <Select value={selectedDateRange} onChange={() => onDateRangeSelectionChange}>
                        <Option value="2021-2022">2021–2022</Option>
                        <Option value="2022-2023">2022–2023</Option>
                        <Option value="2023-2024">2023–2024</Option>
                        <Option value="2024-2025">2024–2025</Option>
                    </Select>
                    <div className="mt-2">
                        <Popover placement={"bottom"}>
                            <PopoverHandler>
                                <Input label={"Select Start Date"}
                                       value={selectedDateStart ? format(selectedDateStart, "PPP") : ""}
                                       onChange={() => onDateStartSelectionChange}/>
                            </PopoverHandler>
                            <PopoverContent>
                                <DayPicker
                                    mode="single"
                                    selected={selectedDateStart}
                                    onSelect={() => onDateStartSelectionChange}
                                    showOutsideDays
                                    className="border-0"
                                    classNames={{
                                        caption: "flex justify-center py-2 mb-4 relative items-center",
                                        caption_label: "text-sm font-medium text-gray-900",
                                        nav: "flex items-center",
                                        nav_button:
                                            "h-6 w-6 bg-transparent hover:bg-blue-gray-50 p-1 rounded-md transition-colors duration-300",
                                        nav_button_previous: "absolute left-1.5",
                                        nav_button_next: "absolute right-1.5",
                                        table: "w-full border-collapse",
                                        head_row: "flex font-medium text-gray-900",
                                        head_cell: "m-0.5 w-9 font-normal text-sm",
                                        row: "flex w-full mt-2",
                                        cell: "text-gray-600 rounded-md h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-900/20 [&:has([aria-selected].day-outside)]:text-white [&:has([aria-selected])]:bg-gray-900/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: "h-9 w-9 p-0 font-normal",
                                        day_range_end: "day-range-end",
                                        day_selected:
                                            "rounded-md bg-gray-900 text-white hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
                                        day_today: "rounded-md bg-gray-200 text-gray-900",
                                        day_outside:
                                            "day-outside text-gray-500 opacity-50 aria-selected:bg-gray-500 aria-selected:text-gray-900 aria-selected:bg-opacity-10",
                                        day_disabled: "text-gray-500 opacity-50",
                                        day_hidden: "invisible",
                                    }}
                                    components={{
                                        IconLeft: ({...props}) => (
                                            <ChevronLeftIcon {...props} className="h-4 w-4 stroke-2"/>
                                        ),
                                        IconRight: ({...props}) => (
                                            <ChevronRightIcon {...props} className="h-4 w-4 stroke-2"/>
                                        ),
                                    }}
                                />

                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Popover placement={"bottom"}>
                            <PopoverHandler>
                                <Input label={"Select End Date"}
                                       value={selectedDateEnd ? format(selectedDateEnd, "PPP") : ""}
                                       onChange={() => onDateEndSelectionChange}/>
                            </PopoverHandler>
                            <PopoverContent>
                                <DayPicker
                                    mode="single"
                                    selected={selectedDateEnd}
                                    onSelect={() => onDateEndSelectionChange}
                                    showOutsideDays
                                    className="border-0"
                                    classNames={{
                                        caption: "flex justify-center py-2 mb-4 relative items-center",
                                        caption_label: "text-sm font-medium text-gray-900",
                                        nav: "flex items-center",
                                        nav_button:
                                            "h-6 w-6 bg-transparent hover:bg-blue-gray-50 p-1 rounded-md transition-colors duration-300",
                                        nav_button_previous: "absolute left-1.5",
                                        nav_button_next: "absolute right-1.5",
                                        table: "w-full border-collapse",
                                        head_row: "flex font-medium text-gray-900",
                                        head_cell: "m-0.5 w-9 font-normal text-sm",
                                        row: "flex w-full mt-2",
                                        cell: "text-gray-600 rounded-md h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-900/20 [&:has([aria-selected].day-outside)]:text-white [&:has([aria-selected])]:bg-gray-900/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: "h-9 w-9 p-0 font-normal",
                                        day_range_end: "day-range-end",
                                        day_selected:
                                            "rounded-md bg-gray-900 text-white hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
                                        day_today: "rounded-md bg-gray-200 text-gray-900",
                                        day_outside:
                                            "day-outside text-gray-500 opacity-50 aria-selected:bg-gray-500 aria-selected:text-gray-900 aria-selected:bg-opacity-10",
                                        day_disabled: "text-gray-500 opacity-50",
                                        day_hidden: "invisible",
                                    }}
                                    components={{
                                        IconLeft: ({...props}) => (
                                            <ChevronLeftIcon {...props} className="h-4 w-4 stroke-2"/>
                                        ),
                                        IconRight: ({...props}) => (
                                            <ChevronRightIcon {...props} className="h-4 w-4 stroke-2"/>
                                        ),
                                    }}
                                />

                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="mb-4">
                    <Typography variant={"h6"}> Number of Weeks Ahead </Typography>
                    <Radio name={"weeksAheadRadioBtn"} label={"1"}/>
                    <Radio name={"weeksAheadRadioBtn"} label={"2"}/>
                    <Radio name={"weeksAheadRadioBtn"} label={"3"}/>
                    <Radio name={"weeksAheadRadioBtn"} label={"4"}/>
                </div>
                <div className="mb-4">
                    <Typography variant="h6">Y-axis scale</Typography>
                    <Radio name={"yAxisRadioBtn"} label="Linear"/>
                    <Radio name={"yAxisRadioBtn"} label="Logarithmic"/>
                </div>
                <div className="mb-4">
                    <Typography variant="h6">Confidence interval</Typography>
                    <Radio name={"confidenceIntervalRadioBtn"} label="None"/>
                    <Radio name={"confidenceIntervalRadioBtn"} label="50%"/>
                    <Radio name={"confidenceIntervalRadioBtn"} label="90%"/>
                    <Radio name={"confidenceIntervalRadioBtn"} label="95%"/>
                </div>
                <div>
                    <Typography variant="h6">Display mode</Typography>
                    <Radio name={"displayModeRadioBtn"} label="By Date"/>
                    <Radio name={"displayModeRadioBtn"} label="By Horizon"/>
                </div>
            </CardBody>
        </Card>
    );
};

export default FiltersPane;