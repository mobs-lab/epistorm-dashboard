import { useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';

interface Dimensions {
    width: number;
    height: number;
}

export function useResponsiveSVG(debounceMs: number = 250) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({ width: clientWidth, height: clientHeight });
            }
        };

        // Initial size measurement
        updateDimensions();

        // Debounced resize handler
        const debouncedResize = debounce(() => {
            setIsResizing(false);
            updateDimensions();
        }, debounceMs);

        // Create ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
            setIsResizing(true);
            debouncedResize();
        });

        // Start observing the container
        resizeObserver.observe(containerRef.current);

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            debouncedResize.cancel();
        };
    }, [debounceMs]);

    return { containerRef, dimensions, isResizing };
}