import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";

interface Dimensions {
  width: number;
  height: number;
}

interface ResponsiveSVGOptions {
  debounceMs?: number;
  throttleMs?: number;
  dimensionChangeThreshold?: number; // unit is pixel
}

/* Custom hook for SVG visualizations to responsively listen to parent container's size update (which comes from their parent and whole DOM tree re-rendering) and correctly assign respective inner dimensions to the svg containers */
export function useResponsiveSVG(options: ResponsiveSVGOptions = {}) {
  const {
    debounceMs = 400,
    throttleMs = 200,
    dimensionChangeThreshold = 10,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });
  const [isResizing, setIsResizing] = useState(false);
  const previousDimensions = useRef<Dimensions>({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef<number | null>(null);

  // Only update dimensions if change exceeds threshold
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;

      const widthDiff = Math.abs(
        clientWidth - previousDimensions.current.width
      );
      const heightDiff = Math.abs(
        clientHeight - previousDimensions.current.height
      );

      if (
        widthDiff > dimensionChangeThreshold ||
        heightDiff > dimensionChangeThreshold
      ) {
        previousDimensions.current = {
          width: clientWidth,
          height: clientHeight,
        };
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    }
  }, [dimensionChangeThreshold]);

  // Throttled update for smooth rendering during active resizing
  const throttledUpdate = useCallback(
    throttle(() => {
      updateDimensions();
    }, throttleMs),
    [throttleMs, updateDimensions]
  );

  // Debounced update for final render after resizing stops
  const debouncedEndResize = useCallback(
    debounce(() => {
      setIsResizing(false);
      updateDimensions();
    }, debounceMs),
    [debounceMs, updateDimensions]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Initial size measurement
    updateDimensions();

    // Create ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      // Clear any existing timeout
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }

      // Set resizing state
      setIsResizing(true);

      // Use throttled update during active resize
      throttledUpdate();

      // Use debounced update for resize completion
      debouncedEndResize();
    });

    // Start observing the container
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      throttledUpdate.cancel();
      debouncedEndResize.cancel();

      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [throttledUpdate, debouncedEndResize, updateDimensions]);

  return { containerRef, dimensions, isResizing };
}
