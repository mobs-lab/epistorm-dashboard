'use client'
import {useEffect, useRef} from "react"
import {Feature, FeatureCollection, GeoJSON, GeoJsonProperties, Geometry} from "geojson";
import * as d3 from "d3"

const usStateData = "/gz_2010_us_040_00_5m.json"

interface StateMapProps {
    selectedState: string;
    setSelectedState: (state: string) => void;
}

const StateMap: React.FC<StateMapProps> = ({selectedState, setSelectedState}) => {
    const svgRef = useRef(null);

    // Inside the SVG container, leave some space for the map
    const margin = {
        top: 0, bottom: 0, left: 0, right: 0
    }
    const mapRatio = 0.5


// TODO: discuss in meeting what colors to use
//  Right now, randomly generated
    const colorScale: any[] = ["#9e5078", "#549688", "#0a3b84", "#282ba8"]


    useEffect(() => {
        if (!svgRef.current) return;

        const colorGenerator = () => {
            return colorScale[Math.floor(Math.random() * 4)]
        }

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

        const fetchData = async () => {
            try {
                const us: FeatureCollection<Geometry, GeoJsonProperties> | undefined = await d3.json(usStateData);
                console.log("US State Data: ", us);

                const svgContainer = d3.select(svgRef.current);

                svgContainer.selectAll("path")
                    .data(us.features)
                    .enter().append("path")
                    .attr("d", pathGenerator)
                    .style("fill", d => {
                        if (d && d.properties && d.properties.STATE) {
                            return d.properties.STATE === selectedState ? "orange" : "steelblue";
                        }
                        return "steelblue";
                    })
                    .style("stroke", "white")
                    .style("stroke-width", "1")
                    .on("click", (event, d) => {
                        if (d && d.properties && d.properties.STATE) {
                            setSelectedState(d.properties.STATE);
                        } else {
                            console.warn("Clicked element does not have the expected data structure.");
                        }
                    });
            } catch (error) {
                console.error("Error loading US state data: ", error);
            }
        };

        fetchData();

    }, [colorScale, selectedState]);

    return <svg className={"w-full h-full mx-auto "} ref={svgRef}/>
}


export default StateMap;
