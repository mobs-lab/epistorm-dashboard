'use client'

import {useEffect, useRef} from "react"

import * as d3 from "d3"

import usStateData from "../../../../../public/gz_2010_us_040_00_20m.json"
import {GeoJSON} from "geojson";

const stateData: GeoJSON.FeatureCollection = usStateData as unknown as GeoJSON.FeatureCollection;

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
        const projection = d3.geoMercator()
            .translate([width / 2, height / 2])
            .scale(width);

        // Creating path generator fromt the projecttion created above.
        const pathGenerator = d3.geoPath()
            .projection(projection);

        // Creating the container
        const g = d3.select(svgRef.current).append("g")
            .attr('class', 'center-container center-items us-state')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)
            .attr('width', `${width + margin.left + margin.right}px`)
            .attr('height', `${height + margin.top + margin.bottom}px`);


        // Creating States projections
        g.append("g")
            .attr("id", "states")
            .selectAll("path")
            .data(usStateData.features)
            .enter()
            .append("path")
            .attr("id", feature =>
                feature.properties.NAME
            )
            .attr("d", (feature) => pathGenerator(feature))
            .attr("class", "state")
            // Here's an example of what I was saying in my previous comment.
            .attr("fill", colorGenerator)


    }, [colorScale]);

    return <svg ref={svgRef}/>
}


export default StateMap;
