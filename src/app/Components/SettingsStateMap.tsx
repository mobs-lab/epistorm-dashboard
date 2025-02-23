import React, { useEffect, useRef, useState, useCallback } from "react";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { zoom, zoomIdentity, ZoomBehavior } from "d3-zoom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateSelectedState } from "../store/forecast-settings-slice";
import { updateEvaluationSingleModelViewSelectedState } from "../store/evaluations-single-model-settings-slice";

interface SettingsStateMapProps {
  pageSelected: string;
}

const usStateData = "/states-10m.json";

const SettingsStateMap: React.FC<SettingsStateMapProps> = ({
  pageSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [initialTransform, setInitialTransform] =
    useState<d3.ZoomTransform | null>(null);

  const dispatch = useAppDispatch();
  const { selectedStateName, USStateNum } = useAppSelector(
    (state) => state.forecastSettings
  );
  const {
    evaluationsSingleModelViewSelectedStateName,
    evaluationsSingleModelViewSelectedStateCode,
  } = useAppSelector((state) => state.evaluationsSingleModelSettings);
  const locationData = useAppSelector((state) => state.location.data);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width: width, height: height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const detectZoomLevel = () => {
      const newZoomLevel = window.devicePixelRatio || 1;
      setZoomLevel(newZoomLevel);
    };

    detectZoomLevel();
    window.addEventListener("resize", detectZoomLevel);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("resize", detectZoomLevel);
    };
  }, [updateDimensions]);

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
  function updateRespectivePageState(arg0: {
    stateName: any;
    stateNum: any;
  }): any {
    pageSelected === "forecast"
      ? dispatch(updateSelectedState(arg0))
      : dispatch(updateEvaluationSingleModelViewSelectedState(arg0));
  }

  const renderMap = useCallback(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = d3.select(gRef.current);
    g.selectAll("*").remove(); // Clear previous content

    const projection = d3
      .geoAlbersUsa()
      .fitSize([dimensions.width, dimensions.height], { type: "Sphere" });
    const path = d3.geoPath().projection(projection);

    initializeZoom();

    const fetchData = async () => {
      try {
        const us: any = await d3.json(usStateData);
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
        const [[x0, y0], [x1, y1]] = path.bounds(
          topojson.feature(us, us.objects.states)
        );
        const initialScale = Math.min(
          8,
          0.9 /
            Math.max(
              (x1 - x0) / dimensions.width,
              (y1 - y0) / dimensions.height
            )
        );
        const initialTranslate = [
          dimensions.width / 2 - (initialScale * (x0 + x1)) / 2,
          dimensions.height / 2 - (initialScale * (y0 + y1)) / 2,
        ];

        const newInitialTransform = zoomIdentity
          .translate(initialTranslate[0], initialTranslate[1])
          .scale(initialScale);
        setInitialTransform(newInitialTransform);
        if (zoomBehaviorRef.current) {
          svg.call(zoomBehaviorRef.current.transform, newInitialTransform);
        }
      } catch (error) {
        console.error("Error loading map data:", error);
      }
    };

    fetchData();
  }, [dimensions, initializeZoom]);

  const handleClick = (event: any, d: any, path: any) => {
    if (!zoomBehaviorRef.current || !svgRef.current) return;

    const [[x0, y0], [x1, y1]] = path.bounds(d);
    const scale = Math.max(
      1,
      Math.min(
        8,
        0.9 /
          Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height)
      )
    );
    const translate = [
      dimensions.width / 2 - (scale * (x0 + x1)) / 2,
      dimensions.height / 2 - (scale * (y0 + y1)) / 2,
    ];

    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );

    //Separate Forecast and Evaluations handling of clicking a state
    updateRespectivePageState({
      stateName: d.properties.name,
      stateNum: d.id,
    });

    // Zoom out to the initial view after a certain duration
    setTimeout(() => {
      if (zoomBehaviorRef.current && initialTransform) {
        svg
          .transition()
          .duration(750)
          .call(zoomBehaviorRef.current.transform, initialTransform);
      }
    }, 2000);
  };

  useEffect(() => {
    if (
      locationData.length > 0 &&
      dimensions.width > 0 &&
      dimensions.height > 0
    ) {
      renderMap();
    }
  }, [locationData, dimensions, renderMap]);

  // Giving different useEffect() hook for different page (I am surprised this is accepted by React)
  // If it's forecast page
  if (pageSelected === "forecast") {
    useEffect(() => {
      if (gRef.current) {
        const g = d3.select(gRef.current);
        const paths = g.selectAll("path");
        paths.transition().style("fill", null);

        const selectedState = paths.filter(
          (d: any) =>
            d && d.properties && d.properties.name === selectedStateName
        );
        selectedState.transition().style("fill", "white");
      }
    }, [selectedStateName]);
  } else {
    // If it's evaluations page
    useEffect(() => {
      if (gRef.current) {
        const g = d3.select(gRef.current);
        const paths = g.selectAll("path");
        paths.transition().style("fill", null);

        const selectedState = paths.filter(
          (d: any) =>
            d &&
            d.properties &&
            d.properties.name === evaluationsSingleModelViewSelectedStateName
        );
        selectedState.transition().style("fill", "white");
      }
    }, [evaluationsSingleModelViewSelectedStateName]);
  }

  const handleReset = () => {
    if (svgRef.current && initialTransform && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      /*Note: Change reset delay here*/
      svg
        .transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, initialTransform);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: "240px", maxHeight: "360px" }}
    >
      <button
        onClick={handleReset}
        className="absolute top-2 left-2 bg-[#5d636a] text-white text-xs p-1 rounded z-10"
      >
        Reset
      </button>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ minHeight: "240px", maxHeight: "360" }}
      >
        <g ref={gRef}></g>
      </svg>
    </div>
  );
};

export default SettingsStateMap;
