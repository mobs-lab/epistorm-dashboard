"use client";

import React, { useMemo, useState } from "react";

import { modelColorMap, modelNames } from "@/interfaces/epistorm-constants";

import { EvaluationsSeasonOverviewSeasonOption } from "@/interfaces/forecast-interfaces";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { setEvaluationSeasonOverviewHorizon, updateSelectedAggregationPeriod } from "@/store/evaluations-season-overview-settings-slice";

import { Radio, Typography } from "@/styles/material-tailwind-wrapper";

import Image from "next/image";
import { parseISO, subMonths } from "date-fns";

// Season Overview Settings Panel
export const SeasonOverviewSettings = () => {
  const dispatch = useAppDispatch();

  const [selectedAggregationPeriod, setSelectedAggregationPeriod] = useState("current-season");

  const { evaluationSeasonOverviewHorizon, evaluationSeasonOverviewSeasonOptions, aggregationPeriods } = useAppSelector(
    (state) => state.evaluationsSeasonOverviewSettings
  );

  // Horizon handler
  const onHorizonChange = (selected: number, checked: boolean) => {
    let newHorizons: number[] = [];
    if (checked) {
      newHorizons = [...evaluationSeasonOverviewHorizon, selected];
    } else {
      newHorizons = evaluationSeasonOverviewHorizon.filter((h) => h !== selected);
    }
    dispatch(setEvaluationSeasonOverviewHorizon(newHorizons));
    console.debug("Evals/SeasonOverview/SettingsPanel update: Horizon changed to: ", newHorizons);
  };

  // Aggregation period change handler
  const onAggregationPeriodChange = (periodId: string) => {
    dispatch(updateSelectedAggregationPeriod(periodId));
  };

  return (
    <div className='bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-hidden util-responsive-text-settings'>
      <div className='flex-grow nowrap overflow-y-auto p-4 util-no-sb-length'>
        <div className='mb-6'>
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
          <Typography variant='h6' className='text-white mb-2'>
            Horizon
          </Typography>
          <div className='flex flex-row justify-start items-center'>
            {[0, 1, 2, 3].map((hrzn) => (
              <label key={hrzn} className='mr-6 flex items-center text-white'>
                <input
                  type='checkbox'
                  className='form-checkbox text-blue-600 mr-1'
                  defaultChecked={false}
                  checked={evaluationSeasonOverviewHorizon.includes(hrzn)}
                  onChange={(e) => onHorizonChange(hrzn, e.target.checked)}
                />
                <span>{hrzn}</span>
              </label>
            ))}
          </div>
        </div>

        {/* TODO: Refactor this */}
        <div className='mb-6'>
          <Typography variant='h6' className='text-white mb-2'>
            Time Period
          </Typography>
          <div>
            {aggregationPeriods.map((period) => (
              <div key={period.id} className='w-full mb-1'>
                <Radio
                  name='seasonAggregationRadioBtn'
                  value={period.id}
                  label={period.label}
                  onChange={() => onAggregationPeriodChange(period.id)}
                  className='text-white'
                  labelProps={{
                    className: "text-white w-full",
                  }}
                  checked={selectedAggregationPeriod === period.id}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='mt-auto p-2 border-t border-gray-700'>
        <Image src='/epistorm-logo.png' width={300} height={120} alt='Epistorm Logo' className='mx-auto' />
      </div>
    </div>
  );
};