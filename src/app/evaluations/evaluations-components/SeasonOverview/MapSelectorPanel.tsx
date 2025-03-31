import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { modelNames, modelColorMap } from "@/interfaces/epistorm-constants";
import { setMapSelectedModel, setMapSelectedScoringOption } from "@/store/evaluations-season-overview-settings-slice";

interface MapSelectorPanelProps {
  className?: string;
}

const MapSelectorPanel: React.FC<MapSelectorPanelProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const { mapSelectedModel, mapSelectedScoringOption } = useAppSelector((state) => state.evaluationsSeasonOverviewSettings);

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
                className='mr-2'
              />
              <label htmlFor={`scoring-${option.id}`} className='text-xs cursor-pointer'>
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className='text-sm font-semibold mb-2'>Model</h3>
        <div className='space-y-1 max-h-40 overflow-y-auto pr-1'>
          {modelNames.map((model) => (
            <div key={model} className='flex items-center'>
              <input
                type='radio'
                id={`model-${model}`}
                name='modelOption'
                value={model}
                checked={mapSelectedModel === model}
                onChange={() => handleModelChange(model)}
                className='mr-2'
              />
              <div className='w-3 h-3 rounded-sm mr-1 flex-shrink-0' style={{ backgroundColor: modelColorMap[model] }} />
              <label htmlFor={`model-${model}`} className='text-xs cursor-pointer truncate'>
                {model}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapSelectorPanel;
