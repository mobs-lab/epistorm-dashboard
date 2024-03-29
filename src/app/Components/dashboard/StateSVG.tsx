// components/StateSVG.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Feature, Geometry } from 'geojson';

type StateSVGProps = {
    stateName: string;
    stateData: Feature<Geometry, any> | undefined;
};

const StateSVG: React.FC<StateSVGProps> = ({ stateName, stateData }) => {
    const svgRef = useRef<SVGSVGElement>(null);

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

    return <svg ref={svgRef} width={400} height={300} />;
};

export default StateSVG;