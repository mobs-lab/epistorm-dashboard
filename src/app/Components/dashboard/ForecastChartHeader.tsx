import InfoButton from "./InfoButton";
import React from "react";
import {Switch} from "../../CSS/material-tailwind-wrapper";
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {updateHistoricalDataMode} from '../../store/filterSlice';


const ForecastChartHeader: React.FC = () => {
    const dispatch = useAppDispatch();
    const historicalDataMode = useAppSelector((state) => state.filter.historicalDataMode);

    const chartInfo = (<div>
        <p>
            The solid white line represents surveillance data (ground truth data), while the colored lines show
            predictions from different models.
        </p>
        <p>
            You can hover over the chart to see various information regarding each date's forecast and surveillance.
            Click on a the chart to select a week and anchor it.
        </p>
        <p>
            Use the Settings Panel on the right to adjust how you want the chart to display.
        </p>
        <p>
            Use the toggle button on the upper-right corner to turn on/off historical surveillance data viewing mode.
        </p>
        <p>
            when this mode is activated, chart will display surveillance data that actually were available for the
            chosen date, instead of the current, most up-to-date version.
        </p>
    </div>);

    const handleHistoricalDataModeToggle = () => {
        dispatch(updateHistoricalDataMode(!historicalDataMode));
    };


    return (
        <div className="w-full h-full flex justify-between items-center px-4">
            <div className="flex justify-start items-center">
                <h2 className="text-3xl font-bold mr-4">Forecast Chart</h2>
                <InfoButton title="Forecast Chart Information" content={chartInfo}/>
            </div>
            <div className="flex justify-end items-center">
                <span className="mr-2 text-sm">Show data available at time of forecast</span>
                <Switch
                    checked={historicalDataMode}
                    onChange={handleHistoricalDataModeToggle}
                    color="blue"
                    label={historicalDataMode ? "On" : "Off"} crossOrigin={undefined}                />
            </div>
        </div>
    );
};
export default ForecastChartHeader;