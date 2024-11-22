'use client'

import React, {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {Axis, BaseType, NumberValue, ScaleLinear, ScaleLogarithmic, ScaleTime} from "d3";
import {subWeeks} from "date-fns";

import {modelColorMap} from "../../../Interfaces/modelColors";
import {
    DataPoint,
    HistoricalDataEntry,
    isUTCDateEqual,
    ModelPrediction,
    PredictionDataPoint
} from "../../../Interfaces/forecast-interfaces";

import {useAppDispatch, useAppSelector} from "../../../store/hooks";
import {updateUserSelectedWeek} from "../../../store/forecast-settings-slice";

interface SingleModelHorizonPlotProps {
    width: number;
    height: number;
}


const SingleModelHorizonPlot = (props: SingleModelHorizonPlotProps) => {

    const boxPlotRef = useRef<SVGSVGElement>(null);

    // Get the ground and prediction data from store
    const groundTruthData = useAppSelector((state) => state.groundTruth.data);
    const predictionsData = useAppSelector((state) => state.predictions.data);

    // Get all settings variables from Redux
    const {
        USStateNum,
        dateStart,
        dateEnd,
        seasonOptions //TODO: Use EvaluationsSettingsSlice.seasonOptions instead WHEN it becomes available
    } = useAppSelector((state) => state.forecastSettings);


    /* NOTE: useEffect hook for
    *  Horizon Plot should react to changes in these Redux slice variables:
    * - Time:
    *   - dateStart: Date
    *   - dateEnd: Date
    *
    * - model:
    *  */
    useEffect(() => {


    }, []);


    /* NOTE: useLayoutEffect hook for updating all DOM-related (so also SVG-related) elements before browser repaints this
    * For example,
    *  */

    return (
        /* Let React return the SVG chart */
        <svg ref={boxPlotRef} viewBox={`0 0 ${props.width} ${props.height}`} preserveAspectRatio="xMidYMid meet">
        </svg>
    )

}


export default SingleModelHorizonPlot;