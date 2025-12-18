import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectModelNames, sortModelsWithDisabledAtBottom } from "@/store/selectors";
import {
  setMapSelectedModel,
  setMapSelectedScoringOption,
  setUseLogColorScale,
} from "@/store/data-slices/settings/SettingsSliceEvaluationSeasonOverview";

interface MapSelectorPanelProps {
  className?: string;
}

const MapSelectorPanel: React.FC<MapSelectorPanelProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const { mapSelectedModel, mapSelectedScoringOption, useLogColorScale, selectedDynamicTimePeriod } = useAppSelector(
    (state) => state.evaluationsSeasonOverviewSettings
  );
  const modelNames = useAppSelector(selectModelNames);

  // Get model availability info from metadata
  const modelAvailabilityByPeriod = useAppSelector((state) => state.auxiliaryData.metadata?.modelAvailabilityByPeriod);

  // Get unavailable models for the selected time period
  const unavailableModels = React.useMemo(() => {
    if (!modelAvailabilityByPeriod || !selectedDynamicTimePeriod) {
      return new Set<string>();
    }
    const periodData = modelAvailabilityByPeriod[selectedDynamicTimePeriod];
    return new Set(periodData?.unavailableModels || []);
  }, [modelAvailabilityByPeriod, selectedDynamicTimePeriod]);

  // Sort models with disabled ones at the bottom
  const sortedModelNames = React.useMemo(() => {
    return sortModelsWithDisabledAtBottom(modelNames, unavailableModels);
  }, [modelNames, unavailableModels]);

  const scoringOptions = [
    { id: "WIS/Baseline", label: "WIS/Baseline" },
    { id: "MAPE", label: "MAPE" },
    { id: "Coverage", label: "Coverage" },
  ];

  const handleModelChange = (modelName: string) => {
    // Don't allow selecting unavailable models
    if (unavailableModels.has(modelName)) {
      return;
    }
    dispatch(setMapSelectedModel(modelName));
  };

  // Check if a model should be disabled
  const isModelDisabled = (modelName: string) => {
    return unavailableModels.has(modelName);
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
          {sortedModelNames.map((model) => {
            const disabled = isModelDisabled(model);
            return (
              <div
                key={model}
                className={`flex items-center p-1 rounded ${
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-700 cursor-pointer"
                }`}
                onClick={() => handleModelChange(model)}
                title={disabled ? `${model} has no evaluation data in the selected time period` : undefined}>
                <div
                  className='w-4 h-4 rounded-sm mr-2 flex-shrink-0 border border-solid'
                  style={{
                    backgroundColor: mapSelectedModel === model ? "silver" : "transparent",
                    borderColor: "silver",
                    opacity: disabled ? 0.4 : 1,
                  }}
                />
                <span className='text-xs cursor-pointer truncate'>{model}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapSelectorPanel;
