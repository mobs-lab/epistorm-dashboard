import React from 'react';
import {useAppSelector, useAppDispatch} from '../../store/hooks';
import {updateUserSelectedRiskLevelModel} from '../../store/filterSlice';
import InfoButton from './InfoButton';

const NowcastHeader: React.FC = () => {
    const dispatch = useAppDispatch();
    const {USStateNum, userSelectedRiskLevelModel} = useAppSelector((state) => state.filter);
    const locationData = useAppSelector((state) => state.location.data);
    const modelOptions = useAppSelector((state) => state.nowcastTrends.allData.map(model => model.modelName));

    const selectedState = locationData.find(location => location.stateNum === USStateNum);
    const stateName = selectedState ? selectedState.stateName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : 'United States';

    const mapInfo = (
        <div>
            <p>The map shows the selected state or the entire US. Their color is mapped to their respective risk
                level.</p>
            <p>The map updates based on your state selection in the filters pane.</p>
            <p>The thermometer on the right shows the current risk level trend, as well as surveillance risk level
                trend.</p>
            <p>Hover your mouse over the thermometer to see more detail.</p>
        </div>
    );

    const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch(updateUserSelectedRiskLevelModel(event.target.value));
    };

    return (
        <div className="w-full h-full flex flex-col justify-between p-4">
            <h1 className="text-5xl font-light mt-1 mb-1 sm:mb-2">{stateName}</h1>
            <div className="w-full bg-[#4e585e] mb-2">
                {/*    Use Svg to draw a very thin light gray horizontal line to use as separator. */}
                <svg className="w-full h-0.5" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="0" x2="100%" y2="0" stroke="#d1d5db" strokeWidth="1"/>
                </svg>
            </div>
            <div className="flex flex-row items-center justify-between w-full mb-3">
                <div className="flex items-center mb-1 sm:mb-0">
                    <h2 className="text-3xl font-bold mr-4">Influenza Hospitalization Activity</h2>
                    <InfoButton title="State Map Information" content={mapInfo}/>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                    <span className="mr-2 whitespace-nowrap text-sm sm:text-base">Change model: </span>
                    <select
                        value={userSelectedRiskLevelModel}
                        onChange={handleModelChange}
                        className="bg-mobs-lab-color text-white border border-gray-700 rounded px-2 py-1 w-full sm:w-auto text-sm sm:text-base"
                    >
                        {modelOptions.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default NowcastHeader;