// components/SettingsPanel.tsx
"use client";

import InfoButton from "@/shared-components/InfoButton";
import SettingsStateMap from "@/shared-components/SettingsStateMap";
import {
  updateConfidenceInterval,
  updateDateEnd,
  updateDateRange,
  updateDateStart,
  updateSelectedForecastModels,
  updateNumOfWeeksAhead,
  updateSelectedState,
  updateYScale,
} from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectDateConstraints, selectLocationData } from "@/store/selectors/forecastSelectors";
import { Radio, Typography } from "@/styles/material-tailwind-wrapper";
import { modelColorMap, modelNames } from "@/types/common";
import { SeasonOption } from "@/types/domains/forecasting";
import Image from "next/image";
import React from "react";
import { horizonSelectorsInfo } from "types/infobutton-content";
import SettingsStyledDatePicker from "./SettingsStyledDatePicker";

const SettingsPanel: React.FC = () => {
  /* Redux-Managed State Variables */
  const dispatch = useAppDispatch();

  const locationData = useAppSelector(selectLocationData);
  const { earliestDate, latestDate } = useAppSelector(selectDateConstraints);

  const { USStateNum, selectedForecastModels: forecastModel, dateStart, dateEnd, dateRange, confidenceInterval, seasonOptions } = useAppSelector(
    (state) => state.forecastSettings
  );

  const onStateSelectionChange = (stateNum: string) => {
    const selectedState = locationData.find((state) => state.stateNum === stateNum);
    if (selectedState) {
      dispatch(
        updateSelectedState({
          stateName: selectedState.stateName,
          stateNum: selectedState.stateNum,
        })
      );
    }
  };

  const onModelSelectionChange = (modelName: string, checked: boolean) => {
    if (checked) {
      dispatch(updateSelectedForecastModels([...forecastModel, modelName]));
    } else {
      dispatch(updateSelectedForecastModels(forecastModel.filter((model) => model !== modelName)));
    }
  };

  const onNumOfWeeksAheadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateNumOfWeeksAhead(Number(event.target.value)));
  };

  const onDateStartSelectionChange = (date: Date | null) => {
    if (date && date >= earliestDate && date <= dateEnd) {
      dispatch(updateDateStart(date));
    } else {
      console.error("SettingsPanel.tsx: Invalid dateStart selection");
    }
  };

  const onDateEndSelectionChange = (date: Date | null) => {
    if (date && date >= dateStart && date <= latestDate) {
      dispatch(updateDateEnd(date));
    } else {
      console.error("SettingsPanel.tsx: Invalid dateEnd selection");
    }
  };

  const onSeasonSelectionChange = (timeValue: string) => {
    const selectedOption = seasonOptions.find((option) => option.timeValue === timeValue);
    if (selectedOption) {
      dispatch(updateDateRange(timeValue));
      dispatch(updateDateStart(selectedOption.startDate));
      dispatch(updateDateEnd(selectedOption.endDate));
    }
  };

  const handleShowAllDates = () => {
    dispatch(updateDateStart(earliestDate));
    dispatch(updateDateEnd(latestDate));
  };

  const onYAxisScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleShowAllModels = () => {
    dispatch(updateSelectedForecastModels(modelNames));
  };

  return (
    <div className='bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-hidden util-responsive-text-settings'>
      <div className='flex-grow nowrap overflow-y-auto p-4 util-no-sb-length'>
        <div className='mb-6 w-full justify-stretch items-stretch'>
          <Typography variant='h6' className='text-white'>
            Select Location
          </Typography>

          <div className='w-full'>
            <SettingsStateMap pageSelected='forecast' />
          </div>

          <select
            value={USStateNum}
            onChange={(e) => onStateSelectionChange(e.target.value)}
            className={"text-white border-[#5d636a] border-2 bg-mobs-lab-color-filterspane rounded-md w-full py-4 px-2 overflow-ellipsis"}>
            {locationData.map((state) => (
              <option key={state.state} value={state.stateNum}>
                {state.stateName}
                {/*{state.stateNum} : {state.stateName}*/}
              </option>
            ))}
          </select>
        </div>

        <div className='mb-2 w-full overflow-ellipsis'>
          <Typography variant='h6' className='text-white mb-1'>
            Models
          </Typography>
          <div className='space-y-2 h-full overflow-y-auto pr-1'>
            {modelNames.map((model) => (
              <label key={model} className='inline-flex items-center text-white hover:bg-gray-700 rounded cursor-pointer w-full'>
                <span
                  className='w-[1em] h-[1em] border-2 rounded-sm mr-2'
                  style={{
                    backgroundColor: forecastModel.includes(model) ? modelColorMap[model] : "transparent",
                    borderColor: modelColorMap[model],
                  }}
                />
                <input
                  type='checkbox'
                  className='sr-only'
                  checked={forecastModel.includes(model)}
                  onChange={(e) => onModelSelectionChange(model, e.target.checked)}
                />
                <span className='ml-2 xs:text-sm '>{model}</span>
              </label>
            ))}
          </div>
          <button className='w-full mt-2 bg-[#5d636a] hover:bg-blue-600 text-white py-1 px-2 rounded text-sm' onClick={handleShowAllModels}>
            Show All Models
          </button>
        </div>

        {/* Season Selector */}
        <div className='mb-4 w-full justify-stretch items-stretch py-4'>
          <div className='mb-2 w-full'>
            <Typography variant='h6' className='text-white'>
              Season
            </Typography>
            <select
              id={"settings-panel-season-select"}
              value={dateRange}
              onChange={(e) => onSeasonSelectionChange(e.target.value)}
              className={
                "text-white border-[#5d636a] border-2 flex-wrap bg-mobs-lab-color-filterspane rounded-md w-full py-2 px-2 overflow-ellipsis"
              }>
              {seasonOptions.map((option: SeasonOption) => (
                <option key={option.index} value={option.timeValue}>
                  {option.displayString}
                </option>
              ))}
            </select>
          </div>

          <div className='mb-2 w-full'>
            <Typography variant='h6' className='text-white'>
              Start Date
            </Typography>
            <SettingsStyledDatePicker
              value={dateStart}
              onChange={onDateStartSelectionChange}
              minDate={earliestDate}
              maxDate={dateEnd}
              className='w-full border-[#5d636a] border-2 rounded-md'
            />
          </div>

          <div className='mb-2 w-full'>
            <Typography variant='h6' className='text-white'>
              End Date
            </Typography>
            <SettingsStyledDatePicker
              value={dateEnd}
              onChange={onDateEndSelectionChange}
              minDate={dateStart}
              maxDate={latestDate}
              className='w-full border-[#5d636a] border-2 rounded-md'
            />
          </div>
          <button className=' bg-[#5d636a] text-white rounded text-sm w-full ' onClick={handleShowAllDates}>
            Show All
          </button>
        </div>

        <div className='mb-4 flex-col'>
          <div className='flex flex-row flex-nowrap justify-start items-center gap-1'>
            <Typography variant='h6' className='text-white flex-shrink'>
              Horizon
            </Typography>

            <InfoButton content={horizonSelectorsInfo} title={"Forecast Horizons"}></InfoButton>
          </div>

          {[0, 1, 2, 3].map((value) => (
            <Radio
              key={value}
              name='weeksAheadRadioBtn'
              value={value.toString()}
              label={value.toString()}
              onChange={(e) => onNumOfWeeksAheadChange(e)}
              className='text-white'
              labelProps={{ className: "text-white" }}
              defaultChecked={value === 3}
            />
          ))}
        </div>

        <div className='mb-4 w-full'>
          <Typography variant='h6' className='text-white'>
            Y-Axis Scale
          </Typography>
          {["linear", "log"].map((value) => (
            <Radio
              key={value}
              name='yAxisRadioBtn'
              value={value}
              label={value === "linear" ? "Linear" : "Logarithmic"}
              onChange={(e) => onYAxisScaleChange(e)}
              className='text-white'
              labelProps={{ className: "text-white" }}
              defaultChecked={value === "linear"}
            />
          ))}
        </div>

        <div className='mb-2 flex-col justify-stretch items-stretch flex-wrap w-full'>
          <Typography variant='h6' className='text-white'>
            Prediction Interval
          </Typography>
          <div className='flex flex-row flex-wrap justify-between items-center'>
            {["50%", "90%", "95%"].map((interval) => (
              <label key={interval} className='flex items-center text-white'>
                <input
                  type='checkbox'
                  className='form-checkbox text-blue-600 mr-2'
                  checked={confidenceInterval.includes(interval.split("%")[0])}
                  onChange={(e) => onConfidenceIntervalChange(interval, e.target.checked)}
                />
                <span>{interval}</span>
              </label>
            ))}
            <button
              className={`flex flex-wrap rounded p-1 ${confidenceInterval.length === 0 ? "bg-blue-600 text-white" : "bg-[#5d636a] text-white"}`}
              onClick={() => dispatch(updateConfidenceInterval([]))}>
              None
            </button>
          </div>
        </div>
      </div>

      <div className='mt-auto p-2 border-t border-gray-700'>
        <Image src='/epistorm-logo.png' width={300} height={120} alt='Epistorm Logo' priority />
      </div>
    </div>
  );
};

export default SettingsPanel;
