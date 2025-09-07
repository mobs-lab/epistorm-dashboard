"use client";

import React, { useState } from "react";

import { modelColorMap, modelNames } from "@/types/common";
import { SeasonOption } from "@/types/domains/forecasting";

import SettingsStateMap from "@/shared-components/SettingsStateMap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectLocationData } from "@/store/selectors";

import {
  updateEvaluationScores,
  updateEvaluationSingleModelViewDateEnd,
  updateEvaluationSingleModelViewDateStart,
  updateEvaluationSingleModelViewHorizon,
  updateEvaluationSingleModelViewSelectedState,
  updateEvaluationsSingleModelViewModel,
  updateEvaluationsSingleModelViewSeasonId,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSingleModel";

import { Radio, Typography } from "@/styles/material-tailwind-wrapper";

import InfoButton from "@/shared-components/InfoButton";
import Image from "next/image";
import { horizonSelectorsInfo } from "types/infobutton-content";

const SingleModelSettingsPanel: React.FC = () => {
  /* Redux-Managed State Variables */
  const dispatch = useAppDispatch();

  const [scoreOptions] = useState(["WIS/Baseline", "MAPE"]);

  // Evaluation-specific state
  const {
    evaluationsSingleModelViewSelectedStateCode,
    evaluationsSingleModelViewModel,
    evaluationSingleModelViewHorizon,
    evaluationSingleModelViewScoresOption,
    evaluationsSingleModelViewDateStart,
    evaluationSingleModelViewDateEnd,
    evaluationsSingleModelViewSeasonId, // <-- Use seasonId from state
    evaluationSingleModelViewSeasonOptions,
  } = useAppSelector((state) => state.evaluationsSingleModelSettings);

  const locationData = useAppSelector((state) => state.auxiliaryData["locations"]);

  // State selection handlers (reused from forecast)
  const onStateSelectionChange = (stateNum: string) => {
    const selectedState = locationData.find((state) => state.stateNum === stateNum);
    if (selectedState) {
      dispatch(
        updateEvaluationSingleModelViewSelectedState({
          stateName: selectedState.stateName,
          stateNum: selectedState.stateNum,
        })
      );
    }
  };

  // Model selection handler (single model only)
  const onModelSelectionChange = (modelName: string) => {
    dispatch(updateEvaluationsSingleModelViewModel(modelName));
  };

  // Horizon handler
  const onHorizonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateEvaluationSingleModelViewHorizon(Number(event.target.value)));
  };

  // Season selection handler (shared with forecast)
  const onSeasonSelectionChange = (seasonIdentifier: string) => {
    // The identifier could be a seasonId (for full range) or a label (for dynamic)
    const selectedOption = evaluationSingleModelViewSeasonOptions.find(
      (option) => option.seasonId === seasonIdentifier || option.timeValue === seasonIdentifier
    );

    if (selectedOption) {
      dispatch(updateEvaluationsSingleModelViewSeasonId(selectedOption.seasonId)); // <-- Dispatch seasonId
      dispatch(updateEvaluationSingleModelViewDateStart(selectedOption.startDate));
      dispatch(updateEvaluationSingleModelViewDateEnd(selectedOption.endDate));
    }
  };

  // Add handler
  const onScoreSelectionChange = (value: string) => {
    dispatch(updateEvaluationScores(value));
  };

  return (
    <div className='bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-hidden util-responsive-text-settings'>
      <div className='flex-grow nowrap overflow-y-auto p-4 util-no-sb-length'>
        <div className='mb-4 w-full overflow-ellipsis'>
          <h2>Select Location</h2>
          <div className='w-full'>
            <SettingsStateMap pageSelected='evaluations' />
          </div>
          <select
            value={evaluationsSingleModelViewSelectedStateCode}
            onChange={(e) => onStateSelectionChange(e.target.value)}
            className='text-white border-[#5d636a] border-2 font-sans bg-mobs-lab-color-filterspane rounded-md px-2 py-4 w-full'>
            {locationData.map((state) => (
              <option key={state.state} value={state.stateNum}>
                {state.stateName}
              </option>
            ))}
          </select>
        </div>

        <div className='mb-2 w-full overflow-ellipsis'>
          <Typography variant='h6' className='text-white mb-2'>
            Models
          </Typography>
          <div className='space-y-2 h-full overflow-y-auto pr-1'>
            {modelNames.map((model) => (
              <label key={model} className='inline-flex items-center text-white hover:bg-gray-700 rounded cursor-pointer w-full'>
                <span
                  className='w-[1em] h-[1em] border-2 rounded-sm mr-2'
                  style={{
                    backgroundColor: evaluationsSingleModelViewModel === model ? modelColorMap[model] : "transparent",
                    borderColor: modelColorMap[model],
                  }}
                />
                <input
                  type='radio'
                  className='sr-only'
                  checked={evaluationsSingleModelViewModel === model}
                  onChange={() => onModelSelectionChange(model)}
                />
                <span className='ml-2 xs:text-sm'>{model}</span>
              </label>
            ))}
          </div>
        </div>

        <div className='mb-2 w-full'>
          <div className='flex flex-row flex-nowrap justify-start items-center gap-1'>
            <Typography variant='h6' className='text-white flex-shrink'>
              Horizon
            </Typography>

            <InfoButton content={horizonSelectorsInfo} title={"Forecast Horizons"}></InfoButton>
          </div>
          {[0, 1, 2, 3].map((value) => (
            <Radio
              key={value}
              name='horizonRadioBtn'
              value={value.toString()}
              label={value.toString()}
              onChange={onHorizonChange}
              className='text-white'
              labelProps={{ className: "text-white" }}
              checked={evaluationSingleModelViewHorizon === value}
            />
          ))}
        </div>

        <div className='w-full mb-2'>
          <Typography variant='h6' className='text-white'>
            Season
          </Typography>
          <select
            id={"settings-panel-season-select"}
            value={evaluationsSingleModelViewSeasonId} // <-- Bind value to seasonId
            onChange={(e) => onSeasonSelectionChange(e.target.value)}
            className={
              "text-white border-[#5d636a] border-2 flex-wrap bg-mobs-lab-color-filterspane rounded-md w-full py-2 px-2 overflow-ellipsis"
            }>
            {evaluationSingleModelViewSeasonOptions.map((option: SeasonOption) => (
              <option key={option.index} value={option.seasonId}>
                {option.displayString}
              </option>
            ))}
          </select>
        </div>
        <div className='w-full justify-stretch items-stretch mb-2'>
          <Typography variant='h6' className='text-white'>
            Score
          </Typography>
          <select
            value={evaluationSingleModelViewScoresOption}
            onChange={(e) => onScoreSelectionChange(e.target.value)}
            className='text-white border-[#5d636a] border-2 bg-mobs-lab-color-filterspane rounded-md w-full p-2'>
            {scoreOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='mt-auto p-2 border-t border-gray-700'>
        <Image src='/epistorm-logo.png' width={300} height={120} alt='Epistorm Logo' className='mx-auto' priority/>
      </div>
    </div>
  );
};

export default SingleModelSettingsPanel;
