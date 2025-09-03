import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";

export interface ChartDimensions {
  width: number;
  height: number;
  zoomLevel: number;
}

interface ResponsiveSVGOptions {
  debounceMs?: number;
  throttleMs?: number;
}

/* Custom hook for SVG visualizations to responsively listen to parent container's size update (which comes from their parent and whole DOM tree re-rendering) and correctly assign respective inner dimensions to the svg containers */
export function useResponsiveSVG(options: ResponsiveSVGOptions = {}) {
  const { debounceMs = 400, throttleMs = 200 } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
    zoomLevel: 1,
  });
  const [isResizing, setIsResizing] = useState(false);

  // Debounced dimension update
  const debouncedSetDimensions = useCallback(
    debounce((width: number, height: number, zoom: number) => {
      setDimensions({ width, height, zoomLevel: zoom });
      setIsResizing(false);
    }, debounceMs),
    [debounceMs]
  );

  // Throttled update for smooth rendering during active resizing
  const throttledUpdate = useCallback(
    throttle(() => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const zoom = window.devicePixelRatio || 1;
        // We don't call setDimensions directly here to avoid too many re-renders
        // The final dimensions are set by the debounced function
        setIsResizing(true);
      }
    }, throttleMs),
    [throttleMs]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const zoom = window.devicePixelRatio || 1;
        debouncedSetDimensions(clientWidth, clientHeight, zoom);
      }
    };

    const handleResize = () => {
      setIsResizing(true);
      throttledUpdate();
      updateDimensions(); // This will trigger the debounced update
    };

    // Initial measurement
    const { clientWidth, clientHeight } = container;
    const zoom = window.devicePixelRatio || 1;
    setDimensions({ width: clientWidth, height: clientHeight, zoomLevel: zoom });


    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Also listen to window resize for zoom changes
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      throttledUpdate.cancel();
      debouncedSetDimensions.cancel();
    };
  }, [debouncedSetDimensions, throttledUpdate]);

  return { containerRef, dimensions, isResizing };
}
