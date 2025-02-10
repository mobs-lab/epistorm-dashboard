import { useState, useEffect, useRef, useCallback } from "react";
import debounce from "lodash/debounce";

interface ChartDimensions {
  width: number;
  height: number;
  zoomLevel: number;
}

export function useChartDimensions(
  debounceMs: number = 100
): [React.RefObject<HTMLDivElement>, ChartDimensions] {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
    zoomLevel: 1,
  });

  // Debounced dimension update
  const debouncedSetDimensions = useCallback(
    debounce((width: number, height: number, zoom: number) => {
      setDimensions({ width, height, zoomLevel: zoom });
    }, debounceMs),
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const zoom = window.devicePixelRatio || 1;
      if (containerRef.current) {
        debouncedSetDimensions(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
          zoom
        );
      }
    };

    // Initial measurement
    updateDimensions();

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateDimensions();
      }
    });

    resizeObserver.observe(containerRef.current);

    // Window resize listener for zoom changes
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
      debouncedSetDimensions.cancel();
    };
  }, [debouncedSetDimensions]);

  return [containerRef, dimensions];
}
