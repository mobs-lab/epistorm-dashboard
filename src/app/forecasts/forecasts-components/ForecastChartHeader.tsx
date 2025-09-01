import { updateHistoricalDataMode } from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Switch } from "@/styles/material-tailwind-wrapper";
import React from "react";
import { weeklyHospitalAdmissionsInfo } from "types/infobutton-content";
import InfoButton from "../../components/InfoButton";

const ForecastChartHeader: React.FC = () => {
  const dispatch = useAppDispatch();
  const historicalDataMode = useAppSelector((state) => state.forecastSettings.historicalDataMode);

  const handleHistoricalDataModeToggle = () => {
    dispatch(updateHistoricalDataMode(!historicalDataMode));
  };

  return (
    <div className='flex flex-row justify-between align-middle items-center px-4 overflow-ellipsis whitespace-nowrap'>
      <div className='flex flex-shrink justify-start items-center'>
        <h2 className='util-responsive-text util-text-limit mr-2'> Weekly Hospital Admissions Forecast</h2>
        <InfoButton title='Weekly Hospital Admissions' content={weeklyHospitalAdmissionsInfo} />
      </div>
      <div className='flex flex-shrink justify-end items-center'>
        <p className='mr-3 md:text-sm sm:text-xs'>Show Data Available at Time of Forecast</p>
        <Switch
          checked={historicalDataMode}
          onChange={handleHistoricalDataModeToggle}
          color='blue'
          label={historicalDataMode ? "On" : "Off"}
          crossOrigin={undefined}
        />
      </div>
    </div>
  );
};
export default ForecastChartHeader;
