'use client'

import {useEffect, useRef} from "react"

import * as d3 from "d3"
import {FeatureCollection} from "geojson";

const usStateData = "/gz_2010_us_040_00_20m.json"

const StateMap = () => {
    const svgRef = useRef(null);

    // Inside the SVG container, leave some space for the map
    const margin = {
        top: 10, bottom: 10, left: 10, right: 10
    }
    const mapRatio = 0.5

// TODO: discuss in meeting what colors to use
//  Right now, randomly generated
    const colorScale: any[] = ["#9e5078", "#549688", "#0a3b84", "#282ba8"]


// Draw a US map with state boundaries


    useEffect(() => {
        if (!svgRef.current) return;

        const colorGenerator = () => {
            return colorScale[Math.floor(Math.random() * 4)]
        }
        let width = parseInt(d3.select(svgRef.current).style('width'), 10);
        let height = width * mapRatio
        // let active = d3.select(null);

        width = width - margin.left - margin.right

        d3.select(svgRef.current)
            .style('width', `${width}px`)
            .style('height', `${height}px`);

        // Creating projection
        const projection = d3.geoAlbers()
            .translate([width / 2, height / 2])
            .scale(1000);

        // Creating path generator fromt the projecttion created above.
        const pathGenerator = d3.geoPath()
            .projection(projection);

        const svgContainer = d3.select(svgRef.current);

        // @ts-ignore
        d3.json(usStateData).then(function (us: FeatureCollection) {
            svgContainer.selectAll("path")
                .data(us.features)
                .enter().append("path")
                .attr("d", pathGenerator)
                .style("fill", "steelblue")
                .style("stroke", "white")
                .style("stroke-width", "1");
        });


    }, [colorScale]);

    return <svg ref={svgRef}/>
}


export default StateMap;
