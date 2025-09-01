import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { modelNames, modelColorMap } from "@/types/common";
import { setMapSelectedModel, setMapSelectedScoringOption, setUseLogColorScale } from "@/store/data-slices/settings/SettingsSliceEvaluationSeasonOverview";

interface MapSelectorPanelProps {
  className?: string;
}

const MapSelectorPanel: React.FC<MapSelectorPanelProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const { mapSelectedModel, mapSelectedScoringOption, useLogColorScale } = useAppSelector(
    (state) => state.evaluationsSeasonOverviewSettings
  );

  const scoringOptions = [
    { id: "WIS/Baseline", label: "WIS/Baseline" },
    { id: "MAPE", label: "MAPE" },
    { id: "Coverage", label: "Coverage" },
  ];

  const handleModelChange = (modelName: string) => {
    dispatch(setMapSelectedModel(modelName));
  };

  const handleScoringOptionChange = (option: "WIS/Baseline" | "MAPE" | "Coverage") => {
    dispatch(setMapSelectedScoringOption(option));
  };

  const handleLogScaleToggle = () => {
    dispatch(setUseLogColorScale(!useLogColorScale));
  };

  return (
    <div className={`bg-gray-800 bg-opacity-80 text-white p-3 rounded-t-md ${className}`}>
      <div className='mb-4'>
        <h3 className='text-sm font-semibold mb-2'>Scoring Metric</h3>
        <div className='space-y-1'>
          {scoringOptions.map((option) => (
            <div key={option.id} className='flex items-center'>
              <input
                type='radio'
                id={`scoring-${option.id}`}
                name='scoringOption'
                value={option.id}
                checked={mapSelectedScoringOption === option.id}
                onChange={() => handleScoringOptionChange(option.id as "WIS/Baseline" | "MAPE" | "Coverage")}
                className='ml-1 mr-2'
              />
              <label htmlFor={`scoring-${option.id}`} className='text-xs cursor-pointer'>
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className='mb-4'>
        <div className='flex items-center'>
          <input type='checkbox' id='log-scale-toggle' checked={useLogColorScale} onChange={handleLogScaleToggle} className='mr-2 ml-1' />
          <label htmlFor='log-scale-toggle' className='text-xs cursor-pointer'>
            Log Color Scale
          </label>
        </div>
      </div>

      <div>
        <h3 className='text-sm font-semibold mb-2'>Model</h3>
        <div className='space-y-1 max-h-40 overflow-y-auto pr-1'>
          {modelNames.map((model) => (
            <div
              key={model}
              className='flex items-center p-1 hover:bg-gray-700 rounded cursor-pointer'
              onClick={() => handleModelChange(model)}>
              <div
                className='w-4 h-4 rounded-sm mr-2 flex-shrink-0 border border-solid'
                style={{
                  backgroundColor: mapSelectedModel === model ? "silver" : "transparent",
                  borderColor: "silver",
                }}
              />
              <span className='text-xs cursor-pointer truncate'>{model}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapSelectorPanel;
