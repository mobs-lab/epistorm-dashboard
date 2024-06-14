// components/FiltersPane.tsx
"use client"

import React, {useEffect, useState} from 'react';
import {modelColorMap} from '../../Interfaces/modelColors';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import {format, subYears, addYears, startOfYear, endOfYear} from 'date-fns';

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
// TODO: Change this to dynamic parsing data into seasons
const dateRangeMapping = {
    "2022-2023": [new Date("2022-06-01T00:00:00.000Z"), new Date("2023-06-01T00:00:00.000Z")],
    "2023-2024": [new Date("2023-06-01T00:00:00.000Z"), new Date("2024-06-01T00:00:00.000Z")],
}


const FiltersPane: React.FC = () => {
    const dispatch = useAppDispatch();
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const locationData = useAppSelector((state) => state.location.data);
    const {
        USStateNum, forecastModel, dateStart, dateEnd, dateRange, confidenceInterval,
    } = useAppSelector((state) => state.filter);
    const [seasonOptions, setSeasonOptions] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');

    const [startDateMaxDate, setStartDateMaxDate] = useState<Date | undefined>(dateEnd);
    const [endDateMinDate, setEndDateMinDate] = useState<Date | undefined>(dateStart);

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
        }
    };

    const onDateEndSelectionChange = (date: Date | undefined) => {
        if (date && date >= dateStart && date <= latestDayFromGroundTruthData) {

            dispatch(updateDateEnd(date));

        }
    };

    const onSeasonSelectionChange = (value: string) => {
        setSelectedSeason(value);

        if (value) {
            const [startDateString, endDateString] = value.split('/');
            const startDate = new Date(startDateString);
            const endDate = new Date(endDateString);

            console.log("FiltersPane update: Season Selection changed to: ", startDate, endDate);

            dispatch(updateDateStart(startDate));
            dispatch(updateDateEnd(endDate));
        }
    };

    const generateSeasonOptions = (groundTruthData) => {
        // Find the earliest and latest years from the ground truth data
        const earliestYear = new Date(Math.min(...groundTruthData.map(d => d.date.getTime()))).getFullYear();
        const latestYear = new Date(Math.max(...groundTruthData.map(d => d.date.getTime()))).getFullYear();

        const options = [];

        // Handle the first season (before the earliest full year)
        const earliestDataPoint = groundTruthData.reduce((min, current) => (min.date < current.date ? min : current));
        const firstSeasonStart = earliestDataPoint.date;
        const firstSeasonEnd = new Date(earliestYear, 7, 1); // July 31st of the earliest year

        options.push({
            label: `Before ${earliestYear}`,
            value: `${format(firstSeasonStart, 'yyyy-MM-dd')}/${format(firstSeasonEnd, 'yyyy-MM-dd')}`,
            startDate: firstSeasonStart,
            endDate: firstSeasonEnd,
        });

        // Handle the full seasons between the earliest and latest years
        for (let year = earliestYear; year < latestYear; year++) {
            const seasonStart = new Date(year, 7, 2); // August 1st
            const seasonEnd = new Date(year + 1, 7, 1); // July 31st of the following year

            options.push({
                label: `${year} - ${year + 1}`,
                value: `${format(seasonStart, 'yyyy-MM-dd')}/${format(seasonEnd, 'yyyy-MM-dd')}`,
                startDate: seasonStart,
                endDate: seasonEnd,
            });
        }

        // Handle the last season (after the latest full year)
        const latestDataPoint = groundTruthData.reduce((max, current) => (max.date > current.date ? max : current));
        const lastSeasonStart = new Date(latestYear, 7, 1); // August 1st of the latest year
        const lastSeasonEnd = latestDataPoint.date;

        options.push({
            label: `After ${latestYear}`,
            value: `${format(lastSeasonStart, 'yyyy-MM-dd')}/${format(lastSeasonEnd, 'yyyy-MM-dd')}`,
            startDate: lastSeasonStart,
            endDate: lastSeasonEnd,
        });

        return options;
    };
    useEffect(() => {
        setStartDateMaxDate(dateEnd);
        setEndDateMinDate(dateStart);
    }, [dateEnd, dateStart]);

    useEffect(() => {
        if (groundTruthData.length > 0) {
            const options = generateSeasonOptions(groundTruthData);
            setSeasonOptions(options);
        }
    }, [groundTruthData]);

    useEffect(() => {
        //     This useEffect is run just once when the component is mounted, to update the current dateEnd by checking the latest date from the groundTruthData to ensure that the datepicker receive a correct update for the maxDate
        if (groundTruthData && groundTruthData.length > 0) {
            const latestAvailableDate = groundTruthData[0].date;
            dispatch(updateDateEnd(latestAvailableDate));

        }
    }, [])

    const earliestDayFromGroundTruthData = groundTruthData.length > 0 ? groundTruthData[groundTruthData.length - 1].date : undefined;
    const latestDayFromGroundTruthData = groundTruthData.length > 0 ? groundTruthData[0].date : undefined;

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
                    value={selectedSeason}
                    onChange={(value) => onSeasonSelectionChange(value as string)}
                >
                    {seasonOptions.map((option) => (
                        <Option key={option.value} value={option.value}>
                            {option.label}
                        </Option>
                    ))}
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
                <Typography variant={"h6"}> Horizons </Typography>
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