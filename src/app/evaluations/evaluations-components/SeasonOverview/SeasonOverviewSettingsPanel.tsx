"use client";

import React, { useMemo, useState } from "react";

import {
  modelColorMap,
  modelNames,
} from "../../../interfaces/epistorm-constants";

import { EvaluationsSeasonOverviewSeasonOption } from "../../../interfaces/forecast-interfaces";

import { useAppDispatch, useAppSelector } from "../../../store/hooks";

import {
  updateEvaluationSeasonOverviewHorizon,
  updateSelectedAggregationPeriod,
} from "../../../store/evaluations-season-overview-settings-slice";

import { Radio, Typography } from "../../../css/material-tailwind-wrapper";

import Image from "next/image";
import { parseISO, subMonths } from "date-fns";

// Season Overview Settings Panel
export const SeasonOverviewSettings = () => {
  const dispatch = useAppDispatch();

  const [selectedAggregationPeriod, setSelectedAggregationPeriod] =
    useState("current-season");

  const {
    evaluationSeasonOverviewHorizon,
    evaluationSeasonOverviewSeasonOptions,
    aggregationPeriods,
  } = useAppSelector((state) => state.evaluationsSeasonOverviewSettings);

  // Horizon handler
  const onHorizonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateEvaluationSeasonOverviewHorizon(Number(event.target.value)));
  };

  // Aggregation period change handler
  const onAggregationPeriodChange = (periodId: string) => {
    dispatch(updateSelectedAggregationPeriod(periodId));
  };

  return (
    <div className='bg-mobs-lab-color-filterspane text-white flex flex-col h-full rounded-md util-responsive-text-settings util-no-sb-length'>
      <div className='flex-grow nowrap overflow-y-auto p-4 util-no-sb-length'>
        <div className='mb-6'>
          <Typography variant='h6' className='text-white mb-2'>
            Model Legend
          </Typography>
          <div className='space-y-2'>
            {modelNames.map((model) => (
              <div key={model} className='flex items-center'>
                <div
                  className='w-4 h-4 rounded-sm mr-3 flex-shrink-0'
                  style={{ backgroundColor: modelColorMap[model] }}
                />
                <span className='text-sm text-wrap'>{model}</span>
              </div>
            ))}
          </div>
        </div>
        <div className='mb-6'>
          <Typography variant='h6' className='text-white mb-2'>
            Horizon
          </Typography>
          {[0, 1, 2, 3].map((value) => (
            /* SO stands for "Season Overview" */
            <Radio
              key={value}
              name='evalsSOhorizonRadioBtn'
              value={value.toString()}
              label={value.toString()}
              onChange={onHorizonChange}
              className='text-white'
              labelProps={{ className: "text-white" }}
              checked={evaluationSeasonOverviewHorizon === value}
            />
          ))}
        </div>

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
        <Image
          src='/epistorm-logo.png'
          width={300}
          height={120}
          alt='Epistorm Logo'
          className='mx-auto'
        />
      </div>
    </div>
  );
};
