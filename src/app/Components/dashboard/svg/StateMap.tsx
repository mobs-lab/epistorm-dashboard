'use client'
import {useEffect, useRef} from "react"
import {FeatureCollection} from "geojson";
import * as d3 from "d3"

const usStateData = "/gz_2010_us_040_00_20m.json"

const StateMap = ({onStateSelect}) => {
    const svgRef = useRef(null);

    // Inside the SVG container, leave some space for the map
    const margin = {
        top: 0, bottom: 0, left: 0, right: 0
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
        // const handleStateSelect = (event: any, feature: { properties: { NAME: any; }; })=>{
        //     onStateSelect(feature.properties.NAME);
        // }

        let width = parseInt(d3.select(svgRef.current).style('width'), 10);
        let height = width * mapRatio
        // let active = d3.select(null);

        d3.select(svgRef.current)
            .style('width', `${width}px`)
            .style('height', `${height}px`);

        // Creating projection
        const projection = d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale(450);

        // Creating path generator fromt the projecttion created above.
        const pathGenerator = d3.geoPath()
            .projection(projection);

        const svgContainer = d3.select(svgRef.current);

        d3.json(usStateData).then((us:FeatureCollection) => {
            const states = svgContainer.selectAll("path")
                .data(us.features)
                .enter().append("path")
                .attr("d", pathGenerator)
                .style("fill", "steelblue")
                .style("stroke", "white")
                .style("stroke-width", "1");

            states.on('click', (event, feature)=>{
                onStateSelect(feature.properties.NAME);
            })

        });


    }, [colorScale]);

    return <svg className={"w-full h-full mx-auto "} ref={svgRef}/>
}


export default StateMap;
