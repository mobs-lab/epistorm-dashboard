// components/StateDetail.tsx
import React, {useState, useEffect} from 'react';
import * as d3 from 'd3';
import {Feature, Geometry} from 'geojson';
import StateSVG from './StateSVG';

type StateDetailProps = {
    stateName: string;
    hospitalizations: number;
};

const SingleStateMap: React.FC<StateDetailProps> = ({stateName, hospitalizations}) => {
    const [stateData, setStateData] = useState<Feature<Geometry, any>>();

    useEffect(() => {
        d3.json('/gz_2010_us_040_00_20m.json').then((data: any) => {
            const selectedState = data.features.find((feature: Feature<Geometry, any>) => feature.properties.name === stateName);
            setStateData(selectedState);
        });
    }, [stateName]);

    return (
        <div className="bg-gray-800 text-white p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Influenza Hospitalizations 2023-2024</h2>
            <div className="flex items-center">
                <StateSVG stateName={stateName} stateData={stateData}/>
                <span className="text-3xl">{stateName}</span>
            </div>
            {/* Other details */}
        </div>
    );
};

export default SingleStateMap;