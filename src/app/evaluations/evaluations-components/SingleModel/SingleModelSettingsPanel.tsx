"use client"

import React, {useMemo} from 'react';

import {modelColorMap} from '../../../Interfaces/modelColors';
import {SeasonOption} from '../../../Interfaces/forecast-interfaces';

import SettingsStateMap from "../../../forecasts/forecasts-components/SettingsStateMap";


import {useAppDispatch, useAppSelector} from '../../../store/hooks';
import {
    updateDateEnd,
    updateDateRange,
    updateDateStart,
    updateSelectedState,
} from '../../../store/forecast-settings-slice';
import {
    updateEvaluationSingleViewModel,
    updateEvaluationHorizon,
    // updateEvaluationSeasonOptions,
} from '../../../store/evaluations-settings-slice';

import {Radio, Typography} from "../../../CSS/material-tailwind-wrapper";

import Image from "next/image";

const modelNames = ['MOBS-GLEAM_FLUH', 'CEPH-Rtrend_fluH', 'MIGHTE-Nsemble', 'NU_UCSD-GLEAM_AI_FLUH', 'FluSight-ensemble'];

const SingleModelSettingsPanel: React.FC = () => {
    /* Redux-Managed State Variables */
    const dispatch = useAppDispatch();

    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const locationData = useAppSelector((state) => state.location.data);

    const {
        USStateNum, dateStart, dateEnd, dateRange, seasonOptions
    } = useAppSelector((state) => state.forecastSettings);

    // Evaluation-specific state
    const {
        evaluationSingleViewModel, evaluationHorizon
    } = useAppSelector((state) => state.evaluationsSettings);


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

    // State selection handlers (reused from forecast)
    const onStateSelectionChange = (stateNum: string) => {
        const selectedState = locationData.find((state) => state.stateNum === stateNum);
        if (selectedState) {
            dispatch(updateSelectedState({
                stateName: selectedState.stateName,
                stateNum: selectedState.stateNum
            }));
        }
    };

    // Model selection handler (single model only)
    const onModelSelectionChange = (modelName: string) => {
        dispatch(updateEvaluationSingleViewModel(modelName));
    };

    // Horizon handler
    const onHorizonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateEvaluationHorizon(Number(event.target.value)));
    };

    // Season selection handler (shared with forecast)
    const onSeasonSelectionChange = (timeValue: string) => {
        const selectedOption = seasonOptions.find(option => option.timeValue === timeValue);
        if (selectedOption) {
            dispatch(updateDateRange(timeValue));
            dispatch(updateDateStart(selectedOption.startDate));
            dispatch(updateDateEnd(selectedOption.endDate));
        }
    };

    return (
        <div
            className="bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-scroll util-responsive-text-settings">
            <div className="p-4">
                <div className="flex flex-col flex-wrap justify-stretch items-start w-full">
                    <h2>Select Location</h2>

                    <div className="mb-4 w-full">
                        <SettingsStateMap/>
                    </div>

                    <select
                        value={USStateNum}
                        onChange={(e) => onStateSelectionChange(e.target.value)}
                        className="text-white border-[#5d636a] border-2 font-sans flex-wrap bg-mobs-lab-color-filterspane rounded-md px-2 py-4 w-full h-full"
                    >
                        {locationData.map((state) => (
                            <option key={state.state} value={state.stateNum}>
                                {state.stateName}
                            </option>
                        ))}
                    </select>

                    <div className="my-2 w-full h-full overflow-ellipsis">
                        <Typography variant="h6" className="text-white">Model</Typography>
                        <div className="flex flex-col text-wrap">
                            {modelNames.map((model) => (
                                <label key={model} className="inline-flex items-center text-white">
                                    <input
                                        type="radio"
                                        className="sr-only"
                                        checked={evaluationSingleViewModel === model}
                                        onChange={() => onModelSelectionChange(model)}
                                    />
                                    <span
                                        className="w-[1em] h-[1em] border-2 rounded-sm mr-2"
                                        style={{
                                            backgroundColor: evaluationSingleViewModel === model ? modelColorMap[model] : 'transparent',
                                            borderColor: modelColorMap[model],
                                        }}
                                    />
                                    <span className="ml-2 text-wrap xs:text-sm">{model}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="my-2 w-full h-full">
                        <Typography variant="h6" className="text-white">Horizon</Typography>
                        {[0, 1, 2, 3].map((value) => (
                            <Radio
                                key={value}
                                name="horizonRadioBtn"
                                value={value.toString()}
                                label={value.toString()}
                                onChange={onHorizonChange}
                                className="text-white"
                                labelProps={{className: "text-white"}}
                                checked={evaluationHorizon === value}
                            />
                        ))}
                    </div>

                    {/* Score selection placeholder */}
                    <div className="w-full justify-stretch items-stretch py-4">
                        <Typography variant="h6" className="text-white">Score</Typography>
                        <select
                            disabled
                            className="text-white border-[#5d636a] border-2 bg-mobs-lab-color-filterspane rounded-md w-full p-2 opacity-50"
                        >
                            <option>Coming soon...</option>
                        </select>
                    </div>

                    <div className="w-full py-4">
                        <Typography variant="h6" className="text-white">Season</Typography>
                        <select
                            value={dateRange}
                            onChange={(e) => onSeasonSelectionChange(e.target.value)}
                            className="text-white border-[#5d636a] border-2 flex-wrap bg-mobs-lab-color-filterspane rounded-md w-full py-2 px-2 overflow-ellipsis"
                        >
                            {seasonOptions.map((option: SeasonOption) => (
                                <option key={option.index} value={option.timeValue}>
                                    {option.displayString}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="mx-auto p-2">
                <Image src="/epistorm-logo.png" width={300} height={120} alt="Epistorm Logo"/>
            </div>
        </div>
    );
};

export default SingleModelSettingsPanel;