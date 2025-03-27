"use client";

import React, { useEffect, useMemo, useState } from "react";

import { modelColorMap, modelNames } from "@/interfaces/epistorm-constants";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setEvaluationSeasonOverviewHorizon, updateSelectedAggregationPeriod } from "@/store/evaluations-season-overview-settings-slice";

import { Radio, Typography, Card, List, ListItem, ListItemPrefix } from "@/styles/material-tailwind-wrapper";
import Image from "next/image";

import { format, parseISO, subDays, subMonths } from "date-fns";

// Season Overview Settings Panel
export const SeasonOverviewSettings = () => {
  const dispatch = useAppDispatch();
  const { evaluationSeasonOverviewHorizon, selectedAggregationPeriod, aggregationPeriods } = useAppSelector(
    (state) => state.evaluationsSeasonOverviewSettings
  );

  // Check if "Last 2 Weeks" is selected
  const isLastTwoWeeksSelected = selectedAggregationPeriod === "last-2-weeks";

  // Check if horizons 2 or 3 are selected
  const hasIncompatibleHorizonsSelected = evaluationSeasonOverviewHorizon.some((h) => h >= 2);

  // Effect to enforce mutual exclusivity when time period changes
  useEffect(() => {
    if (isLastTwoWeeksSelected && hasIncompatibleHorizonsSelected) {
      // If "Last 2 Weeks" is selected, remove horizons 2 and 3
      const compatibleHorizons = evaluationSeasonOverviewHorizon.filter((h) => h < 2);
      dispatch(setEvaluationSeasonOverviewHorizon(compatibleHorizons));
      console.debug("Automatically removed incompatible horizons for Last 2 Weeks period");
    }
  }, [selectedAggregationPeriod, dispatch]);

  // Horizon handler
  const onHorizonChange = (selected: number, checked: boolean) => {
    let newHorizons: number[] = [];
    if (checked) {
      // Adding a horizon
      if (selected >= 2 && isLastTwoWeeksSelected) {
        // If trying to select horizon 2 or 3 while "Last 2 Weeks" is selected,
        // show a warning or notification to user (or handle silently)
        console.debug("Cannot select horizon 2 or 3 with Last 2 Weeks period");
        return; // Prevent selection
      }
      newHorizons = [...evaluationSeasonOverviewHorizon, selected];
    } else {
      // Removing a horizon
      newHorizons = evaluationSeasonOverviewHorizon.filter((h) => h !== selected);
    }
    dispatch(setEvaluationSeasonOverviewHorizon(newHorizons));
    console.debug("Evals/SeasonOverview/SettingsPanel update: Horizon changed to: ", newHorizons);
  };

  // Aggregation period change handler
  const onAggregationPeriodChange = (periodId: string) => {
    // If selecting "Last 2 Weeks" but incompatible horizons are selected
    if (periodId === "last-2-weeks" && hasIncompatibleHorizonsSelected) {
      // Either show a warning to the user or automatically remove the incompatible horizons
      const compatibleHorizons = evaluationSeasonOverviewHorizon.filter((h) => h < 2);
      dispatch(setEvaluationSeasonOverviewHorizon(compatibleHorizons));
      console.debug("Automatically removed incompatible horizons when selecting Last 2 Weeks");
    }

    dispatch(updateSelectedAggregationPeriod(periodId));
  };

  // Format date range for display
  const formatDateRange = (startDate: Date, endDate: Date) => {
    return `(${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")})`;
  };

  // Determine if a time period should be disabled
  const isTimePeriodDisabled = (periodId: string) => {
    return periodId === "last-2-weeks" && hasIncompatibleHorizonsSelected;
  };

  // Determine if a horizon should be disabled
  const isHorizonDisabled = (horizon: number) => {
    return horizon >= 2 && isLastTwoWeeksSelected;
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
        <div className='mb-4'>
          <Typography variant='h6' className='text-white mb-2'>
            Model Legend
          </Typography>
          <div className='space-y-2'>
            {modelNames.map((model) => (
              <div key={model} className='flex items-center'>
                <div className='w-4 h-4 rounded-sm mr-3 flex-shrink-0' style={{ backgroundColor: modelColorMap[model] }} />
                <span className='xs:text-sm sm:text-base text-wrap'>{model}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='mb-4 flex-col flex-nowrap'>
          <Typography variant='h6' className='text-white mb-1'>
            Horizon
          </Typography>
          <div className='flex flex-row justify-start items-center'>
            {[0, 1, 2, 3].map((hrzn) => (
              <label
                key={hrzn}
                className={`mr-6 flex items-center text-white ${isHorizonDisabled(hrzn) ? "opacity-50 cursor-not-allowed" : ""}`}>
                <input
                  type='checkbox'
                  className='form-checkbox text-blue-600 mr-1'
                  defaultChecked={false}
                  checked={evaluationSeasonOverviewHorizon.includes(hrzn)}
                  onChange={(e) => onHorizonChange(hrzn, e.target.checked)}
                  disabled={isHorizonDisabled(hrzn)}
                />
                <span>{hrzn}</span>
              </label>
            ))}
            <button
              onClick={handleShowAllHorizons}
              className='text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded'
            >
              Show All
            </button>
          </div>
          
        </div>

        <div className='mb-6'>
          <Typography variant='h6' className='text-white mb-1'>
            Time Period
          </Typography>
          <List className="p-0 gap-0">
              {aggregationPeriods.map((period) => (
                <ListItem 
                  key={period.id} 
                  className={`p-0 mb-1 ${isTimePeriodDisabled(period.id) ? "opacity-50" : ""}`}
                  disabled={isTimePeriodDisabled(period.id)}
                >
                  <label
                    htmlFor={`period-${period.id}`}
                    className="flex w-full cursor-pointer items-center py-1 px-0"
                  >
                    <ListItemPrefix className="mr-2">
                      <Radio
                        name="seasonAggregationRadioBtn"
                        id={`period-${period.id}`}
                        value={period.id}
                        onChange={() => onAggregationPeriodChange(period.id)}
                        checked={selectedAggregationPeriod === period.id}
                        disabled={isTimePeriodDisabled(period.id)}
                        className="hover:before:opacity-0 border-white"
                        color="white"
                        ripple={false}
                        containerProps={{
                          className: "p-0",
                        }}
                      />
                    </ListItemPrefix>
                    <Typography
                      className="font-medium text-white"
                    >
                      {period.label}
                      {period.isDynamic && period.id === selectedAggregationPeriod && (
                        <span className='text-xs ml-1 opacity-80'>
                          {formatDateRange(subDays(period.startDate, 6), period.endDate)}
                        </span>
                      )}
                    </Typography>
                  </label>
                </ListItem>
              ))}
            </List>
        </div>
      </div>

      <div className='mt-auto p-2 border-t border-gray-700'>
        <Image src='/epistorm-logo.png' width={300} height={120} alt='Epistorm Logo' className='mx-auto' />
      </div>
    </div>
  );
};
