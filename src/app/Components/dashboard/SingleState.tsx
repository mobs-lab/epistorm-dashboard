// components/StateDetail.tsx

import React from "react";

type StateDetailProps = {
    stateName: string;
    hospitalizations: number;
    // other details as needed
};

const StateDetail: React.FC<StateDetailProps> = ({stateName, hospitalizations}) => {
    return (
        <div className="bg-gray-800 text-white p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Influenza Hospitalizations 2023-2024</h2>
            <div className="flex items-center">
                <img src={`/images/${stateName}.svg`} alt={stateName} className="w-16 h-16 mr-4"/>
                <span className="text-3xl">{stateName}</span>
            </div>
            {/* Other details */}
        </div>
    );
};

export default StateDetail;
