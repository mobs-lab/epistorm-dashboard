import InfoButton from "./InfoButton";
import React from "react";
import { Switch } from "../../css/material-tailwind-wrapper";
import { useAppDispatch, useAppSelector } from "../../Store/hooks";
import { updateHistoricalDataMode } from "../../Store/forecast-settings-slice";

const ForecastChartHeader: React.FC = () => {
  const dispatch = useAppDispatch();
  const historicalDataMode = useAppSelector(
    (state) => state.forecastSettings.historicalDataMode
  );

  const chartInfo = (
    <div>
      <p>
        The solid white line represents surveillance data (ground truth data),
        while the colored lines show predictions from different models.
      </p>
      <p>
        You can hover over the chart to see various information regarding each
        date's forecast and surveillance. Click on a the chart to select a week
        and anchor it.
      </p>
      <p>
        Use the Settings Panel on the right to adjust how you want the chart to
        display.
      </p>
      <p>
        Use the toggle button on the upper-right corner to turn on/off
        historical surveillance data viewing mode.
      </p>
      <p>
        when this mode is activated, chart will display surveillance data that
        actually were available for the chosen date, instead of the current,
        most up-to-date version.
      </p>
    </div>
  );

  const handleHistoricalDataModeToggle = () => {
    dispatch(updateHistoricalDataMode(!historicalDataMode));
  };

  return (
    <div className="flex flex-row justify-between align-middle items-center px-4 overflow-ellipsis whitespace-nowrap">
      <div className="flex flex-shrink justify-start items-center">
        <h2 className="util-responsive-text util-text-limit mr-2">
          {" "}
          Weekly Hospital Admissions Forecast
        </h2>
        <InfoButton title="Forecast Chart Information" content={chartInfo} />
      </div>
      <div className="flex flex-shrink justify-end items-center">
        <p className="mr-3 md:text-sm sm:text-xs">
          Show Data Available at Time of Forecast
        </p>
        <Switch
          checked={historicalDataMode}
          onChange={handleHistoricalDataModeToggle}
          color="blue"
          label={historicalDataMode ? "On" : "Off"}
          crossOrigin={undefined}
        />
      </div>
    </div>
  );
};
export default ForecastChartHeader;
