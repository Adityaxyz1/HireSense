import { useState, useEffect } from 'react';

/**
 * Shared responsive breakpoint hook.
 *
 * Reads `window.innerWidth` initially and updates on `resize`, debounced via
 * `requestAnimationFrame` to coalesce bursts of resize events. Cleans up the
 * listener and any pending rAF on unmount.
 *
 * @returns {{ width: number, isMobile: boolean, isTablet: boolean }}
 *   - isMobile: width <= 640
 *   - isTablet: width > 640 && width <= 1024
 */
export function useBreakpoint() {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        let frame = null;
        const handleResize = () => {
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                setWidth(window.innerWidth);
            });
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (frame !== null) cancelAnimationFrame(frame);
        };
    }, []);

    const isMobile = width <= 640;
    const isTablet = width > 640 && width <= 1024;

    return { width, isMobile, isTablet };
}

export default useBreakpoint;
