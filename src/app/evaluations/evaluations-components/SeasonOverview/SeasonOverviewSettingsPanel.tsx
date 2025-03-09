"use client";

import React, { useMemo, useState } from "react";

import {
  modelColorMap,
  modelNames,
} from "../../../interfaces/epistorm-constants";

import { EvaluationsSeasonOverviewSeasonOption } from "../../../interfaces/forecast-interfaces";

import { useAppDispatch, useAppSelector } from "../../../store/hooks";

import {
  updateEvaluationSeasonOverviewViewHorizon,
  updateEvaluationSeasonOverviewViewSeasonOptions,
} from "../../../store/evaluations-season-overview-settings-slice";

import { Radio, Typography } from "../../../css/material-tailwind-wrapper";

import Image from "next/image";

// Season Overview Settings Panel
export const SeasonOverviewSettings = () => {
  const dispatch = useAppDispatch();

  return (
    <div className='bg-mobs-lab-color-filterspane text-white fill-white flex flex-col h-full rounded-md overflow-hidden util-responsive-text-settings'>
      <div className='flex-grow overflow-y-auto p-4'>
        <div className='flex flex-col flex-wrap justify-stretch items-start w-full'>
          <div className='my-2 w-full h-full'>
            <Typography variant='h6' className='text-white'>
              Horizon
            </Typography>
            {[0, 1, 2, 3].map((value) => (
              <Radio
                key={value}
                name='horizonRadioBtn'
                value={value.toString()}
                label={value.toString()}
                onChange={onHorizonChange}
                className='text-white'
                labelProps={{ className: "text-white" }}
                checked={evaluationSeasonOverviewViewHorizon === value}
              />
            ))}
          </div>

          {/* Score selection placeholder */}
          <div className='w-full justify-stretch items-stretch py-4'>
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

          <div className='w-full py-4'>
            <Typography variant='h6' className='text-white'>
              Season
            </Typography>
            <select
              value={evaluationsSingleModelViewDateRange}
              onChange={(e) => onSeasonSelectionChange(e.target.value)}
              className='text-white border-[#5d636a] border-2 flex-wrap bg-mobs-lab-color-filterspane rounded-md w-full py-2 px-2 overflow-ellipsis'>
              {evaluationSingleModelViewSeasonOptions.map(
                (option: SeasonOption) => (
                  <option key={option.index} value={option.timeValue}>
                    {option.displayString}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      <div className='mx-auto p-2'>
        <Image
          src='/epistorm-logo.png'
          width={300}
          height={120}
          alt='Epistorm Logo'
        />
      </div>
    </div>
  );
};
