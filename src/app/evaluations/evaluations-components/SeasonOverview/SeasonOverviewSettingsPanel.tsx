"use client"

import React, {useMemo, useState} from 'react';

import {modelColorMap, modelNames} from '../../../interfaces/epistorm-constants';
import {SeasonOption} from '../../../interfaces/forecast-interfaces';

import SettingsStateMap from "../../../components/SettingsStateMap";

import {useAppDispatch, useAppSelector} from '../../../store/hooks';

import {
    updateEvaluationSingleModelViewSelectedState,
    updateEvaluationsSingleModelViewModel,
    updateEvaluationSingleModelViewHorizon,
    updateEvaluationSingleModelViewDateStart,
    updateEvaluationSingleModelViewDateEnd,
    updateEvaluationsSingleModelViewDateRange, updateEvaluationScores
    // updateEvaluationSingleModelViewSeasonOptions,
} from '../../../store/evaluations-single-model-settings-slice';

import {Radio, Typography} from "../../../css/material-tailwind-wrapper";

import Image from "next/image";


// Season Overview Settings Panel
export const SeasonOverviewSettings = () => (
    <div className="p-6">
        <h3 className="text-lg text-white mb-4">Season Settings</h3>
        {/* Season Overview specific settings */}
    </div>
);