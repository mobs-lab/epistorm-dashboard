"use client";

import React from "react";

import { selectModelNames, selectModelColorMap, sortModelsWithDisabledAtBottom } from "@/store/selectors";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setEvaluationSeasonOverviewHorizon,
  updateSelectedDynamicTimePeriod,
  toggleModelSelection,
  selectAllModels,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSeasonOverview";

import { Radio, Typography, List, ListItem, ListItemPrefix } from "@/styles/material-tailwind-wrapper";
import Image from "next/image";

import { horizonSelectorsInfo } from "types/infobutton-content";
import InfoButton from "@/shared-components/InfoButton";
import { format } from "date-fns";

// Season Overview Settings Panel
export const SeasonOverviewSettings = () => {
  const dispatch = useAppDispatch();
  const [showingAllModels, setShowingAllModels] = React.useState(true);
  
  const { evaluationSeasonOverviewHorizon, selectedDynamicTimePeriod, evalSOTimeRangeOptions, evaluationSeasonOverviewSelectedModels } =
    useAppSelector((state) => state.evaluationsSeasonOverviewSettings);
  const modelNames = useAppSelector(selectModelNames);
  const modelColorMap = useAppSelector(selectModelColorMap);

  // Get model availability info from metadata
  const modelAvailabilityByPeriod = useAppSelector((state) => state.auxiliaryData.metadata?.modelAvailabilityByPeriod);

  // Get unavailable models for the selected time period
  const unavailableModels = React.useMemo(() => {
    if (!modelAvailabilityByPeriod || !selectedDynamicTimePeriod) {
      return new Set<string>();
    }
    const periodData = modelAvailabilityByPeriod[selectedDynamicTimePeriod];
    return new Set(periodData?.unavailableModels || []);
  }, [modelAvailabilityByPeriod, selectedDynamicTimePeriod]);

  // Get unavailable horizons for the selected time period
  const unavailableHorizons = React.useMemo(() => {
    if (!modelAvailabilityByPeriod || !selectedDynamicTimePeriod) {
      return new Set<number>();
    }
    const periodData = modelAvailabilityByPeriod[selectedDynamicTimePeriod];
    return new Set(periodData?.unavailableHorizons || []);
  }, [modelAvailabilityByPeriod, selectedDynamicTimePeriod]);

  // Sort models with disabled ones at the bottom
  const sortedModelNames = React.useMemo(() => {
    return sortModelsWithDisabledAtBottom(modelNames, unavailableModels);
  }, [modelNames, unavailableModels]);

  // Check if "Last 2 Weeks" is selected
  const isLastTwoWeeksSelected = selectedDynamicTimePeriod === "last-2-weeks";

  // Check if horizons 2 or 3 are selected
  const hasIncompatibleHorizonsSelected = evaluationSeasonOverviewHorizon.some((h) => h >= 2);

  // Helper function to format sub-display text for time periods
  const getTimePeriodSubText = (period: any) => {
    // Dynamic periods already have their own subDisplayValue
    if (period.isDynamic && period.subDisplayValue) {
      return period.subDisplayValue;
    }
    
    // For non-dynamic periods (seasons), show the date range
    if (period.startDate && period.endDate) {
      const startStr = format(new Date(period.startDate), "MMM d, yyyy");
      const endStr = format(new Date(period.endDate), "MMM d, yyyy");
      return `${startStr} - ${endStr}`;
    }
    
    return undefined;
  };

  const handleModelToggle = (modelName: string) => {
    // Don't allow toggling unavailable models
    if (unavailableModels.has(modelName)) {
      return;
    }
    dispatch(toggleModelSelection(modelName));
    setShowingAllModels(false);
  };

  const handleSelectAllModels = () => {
    if (!showingAllModels) {
      // Only select models that have data in the current time period
      const availableModels = modelNames.filter((m) => !unavailableModels.has(m));
      dispatch(selectAllModels(availableModels));
      setShowingAllModels(true);
    } else {
      dispatch(selectAllModels([]));
      setShowingAllModels(false);
    }
  };

  // Check if a model should be disabled
  const isModelDisabled = (modelName: string) => {
    return unavailableModels.has(modelName);
  };

  // Horizon handler
  const onHorizonChange = (selected: number, checked: boolean) => {
    let newHorizons: number[] = [];
    if (checked) {
      // Adding a horizon - check if it's disabled
      if (isHorizonDisabled(selected)) {
        console.debug(`Cannot select horizon ${selected} - it is disabled`);
        return; // Prevent selection
      }

      // Legacy check for "Last 2 Weeks" incompatibility (already covered by isHorizonDisabled)
      if (selected >= 2 && isLastTwoWeeksSelected) {
        console.debug("Cannot select horizon 2 or 3 with Last 2 Weeks period");
        return; // Prevent selection
      }

      newHorizons = [...evaluationSeasonOverviewHorizon, selected];
    } else {
      // Removing a horizon
      newHorizons = evaluationSeasonOverviewHorizon.filter((h) => h !== selected);
    }
    dispatch(setEvaluationSeasonOverviewHorizon(newHorizons));
  };

  // Aggregation period change handler
  const onDynamicTimePeriodChange = (tpName: string) => {
    // Don't allow selecting disabled periods
    if (isTimePeriodDisabled(tpName)) {
      return;
    }

    // Check if the new period has unavailable horizons that are currently selected
    const newPeriodData = modelAvailabilityByPeriod?.[tpName];
    const newPeriodUnavailableHorizons = new Set(newPeriodData?.unavailableHorizons || []);

    // Auto-deselect any horizons that are unavailable in the new period
    const validHorizonsForNewPeriod = evaluationSeasonOverviewHorizon.filter((h) => !newPeriodUnavailableHorizons.has(h));

    // If selecting "Last 2 Weeks" but incompatible horizons are selected
    if (tpName === "last-2-weeks" && hasIncompatibleHorizonsSelected) {
      // Remove horizons 2 and 3 as they're incompatible with Last 2 Weeks
      const compatibleHorizons = validHorizonsForNewPeriod.filter((h) => h < 2);
      dispatch(setEvaluationSeasonOverviewHorizon(compatibleHorizons));
    } else if (validHorizonsForNewPeriod.length !== evaluationSeasonOverviewHorizon.length) {
      // Some horizons were filtered out - update selection
      dispatch(setEvaluationSeasonOverviewHorizon(validHorizonsForNewPeriod));
    }

    dispatch(updateSelectedDynamicTimePeriod(tpName));
  };

  // Determine if a time period should be disabled
  const isTimePeriodDisabled = (periodId: string) => {
    // Disable if horizons are incompatible with "Last 2 Weeks"
    if (periodId === "last-2-weeks" && hasIncompatibleHorizonsSelected) {
      console.log(`  ⚠️  ${periodId} disabled: incompatible horizons`);
      return true;
    }

    // Disable if this is an invalid dynamic period
    const period = evalSOTimeRangeOptions.find((p) => p.name === periodId);
    if (period?.isValid === false) {
      console.log(`  ⚠️  ${periodId} disabled: invalid (${period.invalidReason})`);
      return true;
    }

    if (period?.isDynamic) {
      console.log(`  ✓ ${periodId} enabled: isValid=${period.isValid}`);
    }

    return false;
  };

  // Determine if a horizon should be disabled
  const isHorizonDisabled = (horizon: number) => {
    // Disable if incompatible with "Last 2 Weeks" period
    if (horizon >= 2 && isLastTwoWeeksSelected) {
      return true;
    }

    // Disable if this horizon has no data for the selected time period
    if (unavailableHorizons.has(horizon)) {
      return true;
    }

    return false;
  };

  const handleShowAllHorizons = () => {
    if (isLastTwoWeeksSelected) {
      // Only show 0 and 1 for Last 2 Weeks period
      dispatch(setEvaluationSeasonOverviewHorizon([0, 1]));
    } else {
      // Show all horizons
      dispatch(setEvaluationSeasonOverviewHorizon([0, 1, 2, 3]));
    }
  };

  return (
    <div className='bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-hidden util-responsive-text-settings'>
      <div className='flex-grow nowrap overflow-y-auto p-4 util-no-sb-length'>
        <div className='mb-4 w-full overflow-ellipsis'>
          <Typography variant='h6' className='text-white mb-2' placeholder=''>
            Models
          </Typography>
          <div className='space-y-2 h-full overflow-y-auto pr-1'>
            {sortedModelNames.map((model) => {
              const disabled = isModelDisabled(model);
              return (
                <label
                  key={model}
                  className={`inline-flex items-center text-white rounded w-full ${
                    disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-700 cursor-pointer"
                  }`}
                  title={disabled ? `${model} has no evaluation data in the selected time period` : undefined}>
                  <span
                    className='w-[1em] h-[1em] border-2 rounded-sm mr-2'
                    style={{
                      backgroundColor: evaluationSeasonOverviewSelectedModels.includes(model)
                        ? modelColorMap[model] || "#808080"
                        : "transparent",
                      borderColor: modelColorMap[model] || "#808080",
                      opacity: disabled ? 0.4 : 1,
                    }}
                  />
                  <input
                    type='checkbox'
                    className='sr-only'
                    checked={evaluationSeasonOverviewSelectedModels.includes(model)}
                    onChange={() => handleModelToggle(model)}
                    disabled={disabled}
                  />
                  <span className='ml-2 xs:text-sm'>{model}</span>
                </label>
              );
            })}
          </div>
          <button
            onClick={handleSelectAllModels}
            className='w-full mt-2 bg-[#5d636a] hover:bg-blue-600 text-white py-1 px-2 rounded text-sm'>
            {showingAllModels ? "Hide All Models" : "Show All Models"}
          </button>
        </div>

        <div className='mb-4 flex-col flex-nowrap'>
          <div className='flex flex-row flex-nowrap justify-start items-center gap-1'>
            <Typography variant='h6' className='text-white flex-shrink' placeholder=''>
              Horizon
            </Typography>

            <InfoButton content={horizonSelectorsInfo} title={"Forecast Horizons"}></InfoButton>
          </div>
          <div className='flex flex-row justify-start items-center'>
            {[0, 1, 2, 3].map((hrzn) => {
              const disabled = isHorizonDisabled(hrzn);
              const isUnavailable = unavailableHorizons.has(hrzn);
              const isIncompatible = hrzn >= 2 && isLastTwoWeeksSelected;

              let tooltipText = undefined;
              if (isUnavailable) {
                tooltipText = `Horizon ${hrzn} has no evaluation data in the selected time period`;
              } else if (isIncompatible) {
                tooltipText = `Horizon ${hrzn} is incompatible with Last 2 Weeks period`;
              }

              return (
                <label
                  key={hrzn}
                  className={`mr-6 flex items-center text-white ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={tooltipText}>
                  <input
                    type='checkbox'
                    className='form-checkbox text-blue-600 mr-1'
                    defaultChecked={false}
                    checked={evaluationSeasonOverviewHorizon.includes(hrzn)}
                    onChange={(e) => onHorizonChange(hrzn, e.target.checked)}
                    disabled={disabled}
                  />
                  <span>{hrzn}</span>
                </label>
              );
            })}
            <button onClick={handleShowAllHorizons} className='text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded'>
              Show All
            </button>
          </div>
        </div>

        <div className='mb-2'>
          <Typography variant='h6' className='text-white mb-1' placeholder=''>
            Time Period
          </Typography>
          <List placeholder=''>
            {evalSOTimeRangeOptions.map((period) => {
              const disabled = isTimePeriodDisabled(period.name);
              const isInvalid = period.isValid === false;
              return (
                <ListItem
                  key={period.name}
                  className={`p-0 mb-1 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={disabled}
                  placeholder=''
                  title={isInvalid ? period.invalidReason : undefined}>
                  <label
                    htmlFor={`period-${period.name}`}
                    className={`flex w-full items-center py-1 px-0 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <ListItemPrefix className='mr-2' placeholder=''>
                      <Radio
                        name='seasonAggregationRadioBtn'
                        id={`period-${period.name}`}
                        value={period.displayString}
                        onChange={() => onDynamicTimePeriodChange(period.name)}
                        checked={selectedDynamicTimePeriod === period.name}
                        disabled={disabled}
                        className='hover:before:opacity-0 border-white'
                        color='blue-gray'
                        ripple={false}
                        crossOrigin=''
                        containerProps={{
                          className: "p-0",
                        }}
                      />
                    </ListItemPrefix>
                    <Typography className='font-medium text-white' placeholder=''>
                      <span className='block'>{period.displayString}</span>
                      {isInvalid && <span className='text-sm ml-1 '>(Incomplete)</span>}
                      {selectedDynamicTimePeriod === period.name && (() => {
                        const subText = getTimePeriodSubText(period);
                        return subText ? (
                          <span className='text-xs block opacity-70 mt-0.5'>{subText}</span>
                        ) : null;
                      })()}
                    </Typography>
                  </label>
                </ListItem>
              );
            })}
          </List>
        </div>
      </div>

      <div className='mt-auto p-2 border-t border-gray-700'>
        <Image src='/epistorm-logo.png' width={300} height={120} alt='Epistorm Logo' className='mx-auto' priority />
      </div>
    </div>
  );
};
