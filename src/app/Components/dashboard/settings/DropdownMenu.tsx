import React from "react";
import {FeatureCollection} from "geojson";

type DropdownMenuProps = {
    usStates: FeatureCollection;
    selectedState: string | null;
    onStateSelect: React.Dispatch<React.SetStateAction<string | null>>;
};


const DropdownMenu: React.FC<DropdownMenuProps> = ({usStates, selectedState, onStateSelect}) => {

    return (
        <select
            value={selectedState}
            onChange={(e) => onStateSelect(e.target.value)}
        >
            {states.map(state => (
                <option key={state} value={state}>{state}</option>
            ))}
        </select>
    );
};