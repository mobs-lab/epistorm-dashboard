import { useAppSelector } from "@/store/hooks";
import {
  selectGroundTruthInRange, // Use the single model selector
  selectLocationData,
  selectPredictionsForModelAndWeek,
  selectThresholds,
} from "@/store/selectors/forecastSelectors";
import { nowcastRiskColors, nowcastRiskLevels } from "@/types/common";
import { isUTCDateEqual } from "@/utils/date";
import { useResponsiveSVG } from "@/utils/responsiveSVG";
import "@/styles/component_styles/nowcast-thermo.css";
import * as d3 from "d3";
import { format, subDays } from "date-fns";
import { FeatureCollection } from "geojson";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as topojson from "topojson-client";
import { useDataContext } from "@/providers/DataProvider";

/* Color legend boxes */
const ThermoLegendBoxes: React.FC = () => {
  return (
    <div className='flex flex-grow justify-evenly items-end h-full w-full'>
      {nowcastRiskLevels
        .filter((rl) => {
          return rl !== "No Data";
        })
        .map((level, index) => (
          <div key={level} className='flex items-center'>
            <div
              className='w-[1rem] h-[1rem]'
              style={{
                backgroundColor: nowcastRiskColors.filter((rl) => {
                  return rl !== "#363b43";
                })[index],
              }}></div>
            <span className='text-sm mx-2'>{level}</span>
          </div>
        ))}
    </div>
  );
};

const ThermoLegendArea: React.FC<{
  currentWeek: string;
  previousWeek: string;
  currentRiskLevel: string;
  previousRiskLevel: string;
}> = ({ currentWeek, previousWeek, currentRiskLevel, previousRiskLevel }) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "No Data":
        return "#363b43";
      case "Low":
        return "#7cd8c9";
      case "Medium":
        return "#2bafe2";
      case "High":
        return "#435fce";
      default:
        return "#7cd8c9";
    }
  };

  return (
    <div className='flex flex-col h-full justify-stretch items-stretch bg-mobs-lab-color-filterspane rounded util-no-sb-length py-2 pl-1 pr-4'>
      <div className='self-center sm:text-xs md:text-sm lg:text-sm xl:text-base font-bold text-center'>Activity level</div>
      <div className='flex flex-col justify-stretch items-stretch flex-grow min-h-0 max-w-full min-w-[10%]'>
        <LegendItem
          title='Forecasted week'
          week={currentWeek}
          riskLevel={currentRiskLevel}
          color={getRiskColor(currentRiskLevel)}
          lineType='solid'
        />
        {/*Use svg to draw a horizontal divider line that is gray colored*/}
        <svg width='100%' height='10%' className='mt-2'>
          <line
            x1='0'
            y1='1'
            x2='100%'
            y2='1'
            stroke='gray'
            strokeWidth='1'
            style={{
              fontFamily: "var(--font-dm-sans)",
              transition: "opacity 0.01s ease",
            }}
          />
        </svg>
        <LegendItem
          title='Previous week'
          week={previousWeek}
          riskLevel={previousRiskLevel}
          color={getRiskColor(previousRiskLevel)}
          lineType='dashed'
        />
      </div>
    </div>
  );
};

const LegendItem: React.FC<{
  title: string;
  week: string;
  riskLevel: string;
  color: string;
  lineType: "solid" | "dashed";
}> = ({ title, week, riskLevel, color, lineType }) => (
  <div className='flex flex-row flex-shrink justify-stretch items-center h-full w-full'>
    <svg width='20' height='3' className='flex-shrink-0 pr-1'>
      <line x1='0' y1='1' x2='18' y2='1' stroke='white' strokeWidth='2' strokeDasharray={lineType === "dashed" ? "2,2" : "none"} />
    </svg>
    <div
      className={
        "justify-self-stretch flex flex-col justify-stretch items-stretch flex-shrink util-responsive-text-small w-full overflow-ellipsis"
      }>
      <div>{title}</div>
      <div className='font-bold'>{week}</div>
      <div className={"flex items-center justify-center rounded"} style={{ backgroundColor: color }}>
        {riskLevel}
      </div>
    </div>
  </div>
);

const NowcastStateThermo: React.FC = () => {
  const { containerRef, dimensions, isResizing } = useResponsiveSVG({
    debounceMs: 300,
    throttleMs: 150,
  });
  const mapSvgRef = useRef<SVGSVGElement>(null);
  const thermometerSvgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { mapData } = useDataContext();

  const { selectedStateName, USStateNum, userSelectedRiskLevelModel, userSelectedWeek } = useAppSelector((state) => state.forecastSettings);

  const [currentWeek, setCurrentWeek] = useState("");
  const [previousWeek, setPreviousWeek] = useState("");

  // Use useMemo to stabilize date objects and prevent re-renders
  const { relativeLastWeek, groundTruthDateStart, groundTruthDateEnd } = useMemo(() => {
    const currentSelected = new Date(userSelectedWeek);
    const relative = new Date(currentSelected);
    relative.setDate(relative.getDate() - 7);

    const groundTruthStart = new Date(relative);
    groundTruthStart.setDate(groundTruthStart.getDate() - 3);
    const groundTruthEnd = new Date(relative);
    groundTruthEnd.setDate(groundTruthEnd.getDate() + 3);

    return { relativeLastWeek: relative, groundTruthDateStart: groundTruthStart, groundTruthDateEnd: groundTruthEnd };
  }, [userSelectedWeek]);

  const groundTruthData = useAppSelector((state) => selectGroundTruthInRange(state, groundTruthDateStart, groundTruthDateEnd, USStateNum));
  const locationData = useAppSelector(selectLocationData);
  const thresholdsData = useAppSelector(selectThresholds);
  const predictionsData = useAppSelector((state) =>
    selectPredictionsForModelAndWeek(state, userSelectedRiskLevelModel, USStateNum, userSelectedWeek)
  );

  const [riskColor, setRiskColor] = useState("#7cd8c9"); // Default to low risk color
  const [currentRiskLevel, setCurrentRiskLevel] = useState("Low");
  const [previousRiskLevel, setPreviousRiskLevel] = useState("Low");

  // Main UseEffect for listening to change in resized dimension, or user-selected different weeks, trigger drawing of the mini state map
  useEffect(() => {
    const drawMap = async () => {
      if (!mapData) return;
      try {
        const us: any = mapData;
        const statesTopoData = topojson.feature(us, us.objects.states) as unknown as FeatureCollection;

        const svg = d3.select(mapSvgRef.current);
        svg.selectAll("*").remove();

        const width = mapSvgRef.current?.clientWidth || 0;
        const height = mapSvgRef.current?.clientHeight || 0;

        const path = d3.geoPath();

        if (USStateNum === "US") {
          const projection = d3.geoAlbersUsa().fitSize([width, height], statesTopoData);
          path.projection(projection);

          svg
            .selectAll("path")
            .data(statesTopoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", riskColor)
            .attr("stroke", "white")
            .attr("stroke-width", 0.8);
        } else {
          const selectedState = statesTopoData.features.find((feature) => feature.properties.name === selectedStateName);

          if (selectedState) {
            const projection = d3.geoAlbersUsa().fitSize([width, height], selectedState);
            path.projection(projection);

            svg.append("path").datum(selectedState).attr("d", path).attr("fill", riskColor).attr("stroke", "white").attr("stroke-width", 2);
          }
        }
        svg
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("preserveAspectRatio", "xMidYMid meet");
      } catch (error) {
        console.error("Error loading shapefile to display map:", error);
      }
    };

    drawMap();
  }, [dimensions, selectedStateName, riskColor, USStateNum, mapData]);

  /* NOTE: useEffect that draws the Thermometer */
  useEffect(() => {
    0;
    if (!thermometerSvgRef.current || !tooltipRef.current) return;

    const svg = d3.select(thermometerSvgRef.current);
    svg.selectAll("*").remove();

    const width = thermometerSvgRef.current.clientWidth;
    const height = thermometerSvgRef.current.clientHeight;
    const tooltip = d3.select(tooltipRef.current);

    const margin = {
      top: 0,
      right: width * 0.32,
      bottom: 0,
      left: width * 0.32,
    };
    const thermoWidth = width - margin.left - margin.right;
    const thermoHeight = height - margin.top - margin.bottom;

    svg.attr("width", "100%").attr("height", "100%").attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

    const thermoGroup = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Get thresholds for the selected state
    const stateThresholds = thresholdsData.find((t) => t.location === USStateNum);
    // const stateThresholds = thresholdsData.find((t) => t.location === USStateNum);
    if (!stateThresholds) return;

    // Create scale
    const yScale = d3.scaleLinear().domain([0, 100]).range([thermoHeight, 0]);

    // Define risk level positions
    const riskPositions = [
      { level: "low", position: 0 },
      { level: "medium", position: 0.4 },
      {
        level: "high",
        position: 0.9,
      },
      { level: "max", position: 1 },
    ];

    // Get ground truth value
    const groundTruthEntry = groundTruthData.find((d) => d.stateNum === USStateNum && isUTCDateEqual(d.date, relativeLastWeek));
    const groundTruthValue = groundTruthEntry ? groundTruthEntry.weeklyRate : 0;

    // Get predicted value, always the 0-horizon forecast but matching selected date-location-NowcastModel.
    let predictedValue = 0;

    if (predictionsData) {
      // Find the 0-horizon prediction (target date equals reference date)
      const targetDateISO = userSelectedWeek.toISOString().split("T")[0];
      const prediction = predictionsData[targetDateISO];

      if (prediction && prediction.horizon === 0) {
        const statePopulation = locationData.find((l) => l.stateNum === USStateNum)?.population;
        if (statePopulation) {
          predictedValue = (prediction.median / statePopulation) * 100000;
        }
      }
    }

    // Function to calculate line position and risk level
    const calculateLinePosition = (value: number) => {
      if (value === 0) {
        return { riskLevel: "No Data", yPosition: null };
      }

      let riskLevel = "Low";
      let yPosition = 0;

      /* Cap the prediction line to the top when it exceeds the veryHigh threshold */
      if (value >= stateThresholds.veryHigh) {
        riskLevel = "High";
        yPosition = yScale(99.5); // Domain is 0–100, 99.5 displays nicer
      } else if (value >= stateThresholds.high) {
        riskLevel = "High";
        const fraction = (value - stateThresholds.high) / (stateThresholds.veryHigh - stateThresholds.high);
        yPosition = yScale((riskPositions[2].position + fraction * (riskPositions[3].position - riskPositions[2].position)) * 100);
      } else if (value >= stateThresholds.medium) {
        riskLevel = "Medium";
        const fraction = (value - stateThresholds.medium) / (stateThresholds.high - stateThresholds.medium);
        yPosition = yScale((riskPositions[1].position + fraction * (riskPositions[2].position - riskPositions[1].position)) * 100);
      } else if (value > 0) {
        const fraction = value / stateThresholds.medium;
        yPosition = yScale((riskPositions[0].position + fraction * (riskPositions[1].position - riskPositions[0].position)) * 100);
      } else {
        riskLevel = "No Data";
        yPosition = -1;
      }

      return { riskLevel, yPosition };
    };

    // Calculate positions for ground truth and predicted lines
    const groundTruthPosition = calculateLinePosition(groundTruthValue);
    const predictedPosition = calculateLinePosition(predictedValue);

    // Update risk levels
    setPreviousRiskLevel(groundTruthPosition.riskLevel.charAt(0).toUpperCase() + groundTruthPosition.riskLevel.slice(1));
    setCurrentRiskLevel(predictedPosition.riskLevel.charAt(0).toUpperCase() + predictedPosition.riskLevel.slice(1));

    // Update risk color for the map
    setRiskColor(nowcastRiskColors[nowcastRiskLevels.indexOf(predictedPosition.riskLevel)]);

    // Helper functions for tooltip
    const formatNumber = (num: number | null) => {
      if (num === null || num === 0) return "N/A";
      return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    };

    const getRangeString = (level: string) => {
      // Get dynamic thresholds based on current state
      const thresholds = {
        low: [0, stateThresholds.medium],
        medium: [stateThresholds.medium, stateThresholds.high],
        high: [stateThresholds.high, stateThresholds.veryHigh],
      };

      const range = thresholds[level as keyof typeof thresholds];
      if (!range) return "N/A";

      if (level === "low") {
        return `[0, ${formatNumber(range[1])}]`;
      }
      return `[${formatNumber(range[0])}, ${formatNumber(range[1])}]`;
    };

    // Update the ground truth and predicted value handling
    const displayValue = (value: number) => {
      return value === 0 ? null : value;
    };

    const groundTruthDisplayValue = displayValue(groundTruthValue);
    const predictedDisplayValue = displayValue(predictedValue);

    // Helper function to get page coordinates
    const getPageCoordinates = (event: MouseEvent) => {
      const svgElement = thermometerSvgRef.current;
      if (!svgElement) return { x: 0, y: 0 };

      const svgRect = svgElement.getBoundingClientRect();
      return {
        x: event.clientX - svgRect.left,
        y: event.clientY,
      };
    };

    // Draw background rectangles with tooltips
    thermoGroup
      .selectAll("rect")
      .data(nowcastRiskLevels.slice(1))
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => yScale(riskPositions[i + 1].position * 100))
      .attr("width", thermoWidth)
      .attr("height", (d, i) => {
        const start = riskPositions[i].position;
        const end = riskPositions[i + 1].position;
        return yScale(start * 100) - yScale(end * 100);
      })
      .attr("fill", (d, i) => nowcastRiskColors.slice(1)[i])
      .attr("stroke", "lightgray")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        const level = d.toLowerCase();
        // Fix: Get the correct index by using the original case from riskLevels
        const levelIndex = nowcastRiskLevels.indexOf(d); // d is already in correct case from the data-slices

        tooltip.html(`
                    <div class="lg:text-sm">
                        <div style="display: flex; align-items: center; margin: 10px;"> Rate/100k </div>
                        <div style="display: flex; align-items: center; margin: 5px;">
                            <div style="width: 12px; height: 12px; background-color: ${nowcastRiskColors[levelIndex]}; margin-right: 5px;"></div>
                            <span>${d}: ${getRangeString(level)}</span>
                        </div>
                        <div style="margin: 10px;">Surveillance: ${formatNumber(groundTruthDisplayValue)}</div>
                        <div style="margin: 10px;">Predicted: ${formatNumber(predictedDisplayValue)}</div>
                    </div>
    `);

        const tooltipNode = tooltip.node();
        if (tooltipNode) {
          const { x, y } = getPageCoordinates(event);
          const tooltipWidth = tooltipNode.offsetWidth;
          const tooltipHeight = tooltipNode.offsetHeight;

          const containerRect = containerRef.current?.getBoundingClientRect();
          const thermometerRect = thermometerSvgRef.current?.getBoundingClientRect();

          if (containerRect && thermometerRect) {
            const left = thermometerRect.left - containerRect.left + x - tooltipWidth - 10;
            const top = thermometerRect.top - containerRect.top + y - tooltipHeight / 2;

            tooltip.style("left", `${left}px`).style("top", `${top}px`).style("display", "block");
          }
        }
      })
      .on("mousemove", function (event) {
        const tooltipNode = tooltip.node();
        if (tooltipNode) {
          const { x, y } = getPageCoordinates(event);
          const tooltipWidth = tooltipNode.offsetWidth;
          const tooltipHeight = tooltipNode.offsetHeight;

          const containerRect = containerRef.current?.getBoundingClientRect();
          const thermometerRect = thermometerSvgRef.current?.getBoundingClientRect();

          if (containerRect && thermometerRect) {
            const left = thermometerRect.left - containerRect.left + x - tooltipWidth - 10;
            const top = thermometerRect.top - containerRect.top + y - tooltipHeight / 2;

            tooltip.style("left", `${left}px`).style("top", `${top}px`);
          }
        }
      })
      .on("mouseout", () => {
        tooltip.style("display", "none");
      });

    // Draw ground truth line (dotted)
    if (groundTruthPosition.yPosition !== null) {
      thermoGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", thermoWidth)
        .attr("y1", groundTruthPosition.yPosition)
        .attr("y2", groundTruthPosition.yPosition)
        .attr("stroke", "white")
        .attr("stroke-width", 3.5)
        .attr("stroke-dasharray", "3,5");
    }

    // Draw predicted line (solid)
    if (predictedPosition.yPosition !== null) {
      thermoGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", thermoWidth)
        .attr("y1", predictedPosition.yPosition)
        .attr("y2", predictedPosition.yPosition)
        .attr("stroke", "white")
        .attr("stroke-width", 3.5);
    }
  }, [
    dimensions,
    USStateNum,
    userSelectedRiskLevelModel,
    userSelectedWeek,
    groundTruthData,
    predictionsData,
    locationData,
    thresholdsData,
    relativeLastWeek,
    containerRef,
  ]);

  useEffect(() => {
    const dateB = new Date(userSelectedWeek);
    const dateA = subDays(dateB, 6);
    const dateD = subDays(dateB, 7);
    const dateC = subDays(dateD, 6);

    const formatDate = (date: Date) => format(date, "MMM dd");

    const currentWeekText = `${formatDate(dateA)} to ${formatDate(dateB)}`;
    const previousWeekText = `${formatDate(dateC)} to ${formatDate(dateD)}`;

    // Update state variables to trigger re-render of ThermoLegendArea
    setCurrentWeek(currentWeekText);
    setPreviousWeek(previousWeekText);
  }, [userSelectedWeek]);

  return (
    <div ref={containerRef} className='nowcast-state-thermo-grid-layout text-white w-min-full h-min-full py-2'>
      <div className='map-svg'>
        <svg ref={mapSvgRef} width='100%' height='100%' preserveAspectRatio='xMidYMid meet' />
      </div>
      <div className='thermometer'>
        <svg ref={thermometerSvgRef} width='100%' height='100%' preserveAspectRatio='xMidYMid meet' />
        <div
          ref={tooltipRef}
          className='absolute hidden bg-white text-black rounded shadow-md text-sm'
          style={{ pointerEvents: "none", zIndex: 10 }}></div>
      </div>
      <div className='thermo-legend-area'>
        <ThermoLegendArea
          currentWeek={currentWeek}
          previousWeek={previousWeek}
          currentRiskLevel={currentRiskLevel}
          previousRiskLevel={previousRiskLevel}
        />
      </div>
      <div className='thermo-legend-boxes'>
        <ThermoLegendBoxes />
      </div>
    </div>
  );
};

export default NowcastStateThermo;
