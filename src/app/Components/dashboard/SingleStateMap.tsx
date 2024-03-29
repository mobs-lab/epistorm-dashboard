// components/StateDetail.tsx
import React, {useState, useEffect, useRef} from 'react';
import * as d3 from 'd3';
import {Feature, Geometry} from 'geojson';

type StateDetailProps = {
    stateNum: string;
    // hospitalizations: number;
};

const SingleStateMap: React.FC<StateDetailProps> = ({stateNum}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [stateData, setStateData] = useState<Feature<Geometry, any>>();

    useEffect(() => {
        d3.json('/gz_2010_us_040_00_20m.json').then((data: any) => {
            const selectedStateSVG = data["features"].find((feature: Feature<Geometry, any>) => feature["properties"]["STATE"] === stateNum);
            console.log("Selected State SVG Data: ", selectedStateSVG);
            setStateData(selectedStateSVG);
        });
    }, [stateNum]);
    useEffect(() => {
        if (svgRef.current && stateData) {
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            const width = 400;
            const height = 300;

            const projection = d3.geoMercator().fitSize([width, height], stateData);
            const path = d3.geoPath().projection(projection);

            svg.append('path')
                .datum(stateData)
                .attr('d', path)
                .attr('fill', 'lightblue')
                .attr('stroke', 'black');
        }
    }, [stateData]);

    return (
        <div className="bg-gray-800 text-white p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Influenza Hospitalizations 2023-2024</h2>
            <div className="flex items-center">
                <svg ref={svgRef} width={400} height={300}/>
                <span className="text-3xl">{stateData?.properties?.NAME || ''}</span>
            </div>
        </div>
    );
};

export default SingleStateMap;