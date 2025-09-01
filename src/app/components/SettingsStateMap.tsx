import { updateEvaluationSingleModelViewSelectedState } from "@/store/data-slices/settings/SettingsSliceEvaluationSingleModel";
import { updateSelectedState } from "@/store/data-slices/settings/SettingsSliceForecastNowcast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectLocationData } from "@/store/selectors/forecastSelectors";
import * as d3 from "d3";
import { zoom, ZoomBehavior, zoomIdentity } from "d3-zoom";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as topojson from "topojson-client";

interface SettingsStateMapProps {
  pageSelected: string;
}

const usStateData = "/states-10m.json";

const SettingsStateMap: React.FC<SettingsStateMapProps> = ({ pageSelected }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const initialTransformRef = useRef<d3.ZoomTransform | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);

  //Store fetched TopoJSON data to avoid unnecessary re-fetching
  const [usTopoJsonData, setUsTopoJsonData] = useState<any>(null);

  const dispatch = useAppDispatch();
  const { selectedStateName } = useAppSelector((state) => state.forecastSettings);
  const { evaluationsSingleModelViewSelectedStateName } = useAppSelector((state) => state.evaluationsSingleModelSettings);
  const locationData = useAppSelector(selectLocationData);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width: width, height: height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, [updateDimensions]);

  /* OPTIMIZATION: fetch TopoJSON only once when component mounts */
  useEffect(() => {
    const loadTopoData = async () => {
      try {
        const us: any = await d3.json(usStateData);
        setUsTopoJsonData(us);
      } catch (error) {
        console.error("Error loading US map data:", error);
      }
    };
    loadTopoData();
  }, []); // Empty dependency array ensures this runs only once

  const initializeZoom = useCallback(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    zoomBehaviorRef.current = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehaviorRef.current);
  }, []);

  // Wrapper to update respective page's state selection via the map
  const updateRespectivePageState = useCallback(
    (arg0: { stateName: any; stateNum: any }) => {
      pageSelected === "forecast" ? dispatch(updateSelectedState(arg0)) : dispatch(updateEvaluationSingleModelViewSelectedState(arg0));
    },
    [pageSelected, dispatch]
  );

  const handleClick = useCallback(
    (event: any, d: any, path: any) => {
      if (!zoomBehaviorRef.current || !svgRef.current) return;

      //Separate Forecast and Evaluations handling of clicking a state
      updateRespectivePageState({
        stateName: d.properties.name,
        stateNum: d.id,
      });

      const [[x0, y0], [x1, y1]] = path.bounds(d);
      const scale = Math.max(1, Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height)));
      const translate = [dimensions.width / 2 - (scale * (x0 + x1)) / 2, dimensions.height / 2 - (scale * (y0 + y1)) / 2];

      const svg = d3.select(svgRef.current);
      svg
        .transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, zoomIdentity.translate(translate[0], translate[1]).scale(scale));

      // Zoom out to the initial view after a certain duration
      try {
        /* DEBUG */
        /* console.debug("Components/SettingsStateMap.tsx/handleClick(): delayed zooming-back-out starting..."); */
        setTimeout(() => {
          if (zoomBehaviorRef.current && initialTransformRef.current) {
            svg.transition().duration(750).call(zoomBehaviorRef.current.transform, initialTransformRef.current);
          }
        }, 1600);
      } catch (error) {
        console.error(
          "Error: Components/SettingsStateMap.tsx/handleClick(): Error: Zoom out failed: initialTransformRef.current or zoomBehaviorRef.current is null/undefined in setTimeout."
        );
      }
    },
    [dimensions, updateRespectivePageState]
  );

  const renderMap = useCallback(() => {
    if (!svgRef.current || !gRef.current || !usTopoJsonData) return;
    setIsMapReady(false);

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = d3.select(gRef.current);
    g.selectAll("*").remove(); // Clear previous content

    const projection = d3.geoAlbersUsa().fitSize([dimensions.width, dimensions.height], { type: "Sphere" });
    const path = d3.geoPath().projection(projection);

    initializeZoom();

    const us = usTopoJsonData;
    const states = g
      .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .join("path")
      .attr("fill", "#252a33")
      .attr("stroke", "#5c636b")
      .attr("cursor", "pointer")
      .on("click", (event, d) => handleClick(event, d, path))
      .attr("d", path);

    states.append("title").text((d: any) => d.properties.name);

    // Initial zoom and center
    const [[x0, y0], [x1, y1]] = path.bounds(topojson.feature(us, us.objects.states));
    // Automatically get the smallest (most suitable) bounding dimension to use as scale calculation target
    const initialScale = Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height));
    // Align the map to the center of the box instead of upper left corner
    const initialTranslate = [
      dimensions.width / 2 - (initialScale * (x0 + x1)) / 2,
      dimensions.height / 2 - (initialScale * (y0 + y1)) / 2,
    ];

    const newInitialTransform = zoomIdentity.translate(initialTranslate[0], initialTranslate[1]).scale(initialScale);
    initialTransformRef.current = newInitialTransform;

    if (zoomBehaviorRef.current) {
      svg.call(zoomBehaviorRef.current.transform, newInitialTransform);
    }
    setIsMapReady(true);
  }, [dimensions, initializeZoom, usTopoJsonData, handleClick]);

  useEffect(() => {
    if (locationData.length > 0 && dimensions.width > 0 && dimensions.height > 0 && usTopoJsonData) {
      renderMap();
    }
  }, [locationData, dimensions, renderMap, usTopoJsonData]);

  // Highlight the corresponding page's state selection when the page loads
  const highlightSelectedState = useCallback(() => {
    if (!gRef.current || !isMapReady) return; // Now checks if map is ready

    const g = d3.select(gRef.current);
    const paths = g.selectAll("path");

    // Resets all state color before highlighting the newly selected one
    paths.transition().style("fill", "#252a33");

    // Determine which state name to use based on pageSelected
    const currentSelectedStateName = pageSelected === "forecast" ? selectedStateName : evaluationsSingleModelViewSelectedStateName;

    if (currentSelectedStateName) {
      const selectedState = paths.filter((d: any) => d && d.properties && d.properties.name === currentSelectedStateName);
      selectedState.transition().style("fill", "white");
    }
  }, [pageSelected, selectedStateName, evaluationsSingleModelViewSelectedStateName, isMapReady]);

  // Direct forecast/evalutions state to change for corresponding page's map component instance
  useEffect(() => {
    highlightSelectedState();
  }, [highlightSelectedState]);

  const handleReset = () => {
    if (svgRef.current && initialTransformRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      /*Note: Change reset delay here*/
      svg.transition().duration(750).call(zoomBehaviorRef.current.transform, initialTransformRef.current);
    }
  };

  return (
    <div ref={containerRef} className='w-full h-full relative' style={{ minHeight: "240px", maxHeight: "360px" }}>
      <button onClick={handleReset} className='absolute top-2 left-2 bg-[#5d636a] text-white text-xs p-1 rounded z-10'>
        Reset
      </button>
      <svg ref={svgRef} width='100%' height='100%' style={{ minHeight: "240px", maxHeight: "360px" }}>
        <g ref={gRef}></g>
      </svg>
    </div>
  );
};

export default SettingsStateMap;
