import { updateUserSelectedRiskLevelModel } from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectLocationData } from "@/store/selectors/forecastSelectors";
import { modelNames } from "@/types/common";
import React from "react";
import { activityLevelsInfo } from "types/infobutton-content";
import InfoButton from "../../components/InfoButton";

const NowcastHeader: React.FC = () => {
  const dispatch = useAppDispatch();
  const { USStateNum, userSelectedRiskLevelModel } = useAppSelector((state) => state.forecastSettings);
  const locationData = useAppSelector(selectLocationData);

  const selectedState = locationData.find((location) => location.stateNum === USStateNum);
  const stateName = selectedState
    ? selectedState.stateName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : "United States";

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(updateUserSelectedRiskLevelModel(event.target.value));
  };

  return (
    <div className='w-full h-full text-nowrap flex flex-shrink flex-col justify-evenly flex-nowrap px-4 pt-2 pb-4 util-responsive-text'>
      <h1 className='sm:text-sm md:text-base lg:text-2xl xl:text-3xl 2xl:text-4xl font-light util-text-limit'>{stateName}</h1>
      <div className='w-full bg-[#5d636a]'>
        {/*    Use Svg to draw a very thin light gray horizontal line to use as separator. */}
        <svg className='w-full h-0.5'>
          <line x1='0' y1='0' x2='100%' y2='0' stroke='#5d636a' strokeWidth='1' />
        </svg>
      </div>
      <div className='flex flex-row justify-between items-center'>
        <div className='flex'>
          <h2 className='util-responsive-text font-bold mr-2'>Hospitalization Activity Forecast</h2>
          <InfoButton title='State Map Information' content={activityLevelsInfo} dialogSize='lg' />
        </div>
        <div className='flex items-center justify-between'>
          <div>
            <span className='text-base'>Change model:</span>
          </div>
          <div>
            <select
              value={userSelectedRiskLevelModel}
              onChange={handleModelChange}
              className='bg-mobs-lab-color text-white text-sm font-light border-[#5d636a] border-2 rounded-md my-1 ml-1 px-1 py-1'>
              {modelNames.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowcastHeader;
