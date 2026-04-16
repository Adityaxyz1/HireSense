import React, { createContext, useContext, useState, useCallback } from 'react';

const MouseContext = createContext({ x: 0, y: 0, nx: 0.5, ny: 0.5 });

export function MouseProvider({ children }) {
    const [mouse, setMouse] = useState({ x: 0, y: 0, nx: 0.5, ny: 0.5 });

    const handleMouseMove = useCallback((e) => {
        setMouse({
            x: e.clientX,
            y: e.clientY,
            nx: e.clientX / window.innerWidth,
            ny: e.clientY / window.innerHeight,
        });
    }, []);

    return (
        <div onMouseMove={handleMouseMove} className="contents">
            <MouseContext.Provider value={mouse}>
                {children}
            </MouseContext.Provider>
        </div>
    );
}

export function useMouse() {
    return useContext(MouseContext);
}
