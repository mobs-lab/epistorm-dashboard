import { useEffect, useState } from 'react';
import * as d3 from 'd3';

interface MarginConfig {
  minTopMargin: number;
  minBottomMargin: number;
  minLeftMargin: number;
  minRightMargin: number;
  topMarginRatio: number;
  bottomMarginRatio: number;
  leftMarginRatio: number;
  rightMarginRatio: number;
}

// Default configurations for different chart types
const defaultMarginConfigs: Record<string, MarginConfig> = {
  default: {
    minTopMargin: 40,
    minBottomMargin: 60,
    minLeftMargin: 40,
    minRightMargin: 40,
    topMarginRatio: 0.08,
    bottomMarginRatio: 0.12,
    leftMarginRatio: 0.04,
    rightMarginRatio: 0.04
  },
  dense: {
    minTopMargin: 30,
    minBottomMargin: 50,
    minLeftMargin: 50,
    minRightMargin: 25,
    topMarginRatio: 0.06,
    bottomMarginRatio: 0.1,
    leftMarginRatio: 0.08,
    rightMarginRatio: 0.04
  }
};

export function useChartMargins(
  containerWidth: number,
  containerHeight: number,
  configType: keyof typeof defaultMarginConfigs = 'default'
) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  // Detect zoom level changes
  useEffect(() => {
    const detectZoom = () => {
      const zoom = window.devicePixelRatio || 1;
      setZoomLevel(zoom);
    };

    detectZoom();
    window.addEventListener('resize', detectZoom);
    return () => window.removeEventListener('resize', detectZoom);
  }, []);

  // Update margins based on container size and zoom
  useEffect(() => {
    const config = defaultMarginConfigs[configType];
    const zoomFactor = Math.max(0.8, Math.min(1.2, zoomLevel)); // Limit zoom impact

    // Calculate responsive margins with minimum bounds
    const calculateMargin = (
      minMargin: number,
      ratio: number,
      dimension: number
    ) => {
      const responsiveMargin = Math.max(
        minMargin,
        dimension * ratio * zoomFactor
      );
      // Ensure margin doesn't exceed 22% of the dimension
      return Math.min(responsiveMargin, dimension * 0.22);
    };  

    const newMargins = {
      top: calculateMargin(config.minTopMargin, config.topMarginRatio, containerHeight),
      right: calculateMargin(config.minRightMargin, config.rightMarginRatio, containerWidth),
      bottom: calculateMargin(config.minBottomMargin, config.bottomMarginRatio, containerHeight),
      left: calculateMargin(config.minLeftMargin, config.leftMarginRatio, containerWidth)
    };

    setMargins(newMargins);
  }, [containerWidth, containerHeight, zoomLevel, configType]);

  return margins;
}

// Utility for calculating label sizes
export function calculateLabelSpace(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  labels: string[],
  fontSize: number
): { width: number; height: number } {
  const temp = svg
    .append('text')
    .style('font-size', `${fontSize}px`)
    .style('opacity', 0);

  const maxWidth = Math.max(
    ...labels.map(label => {
      temp.text(label);
      return temp.node()?.getComputedTextLength() || 0;
    })
  );

  temp.remove();

  return {
    width: maxWidth,
    height: fontSize * 1.2 // Approximate line height
  };
}