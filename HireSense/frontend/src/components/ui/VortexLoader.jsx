import React, { useState, useEffect } from 'react';

const STATUS_MESSAGES = [
    "Establishing neural link...",
    "Warming ATS compliance engines...",
    "Racing embedding algorithms...",
    "Syncing candidate database...",
    "Entering workspace..."
];

export default function VortexLoader({ isExitTriggered = false }) {
    const [statusIndex, setStatusIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStatusIndex(prev => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#0c0c0e', // Force graphite black background
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: 'var(--font), sans-serif',
            color: '#f0f0f4',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s ease',
            opacity: isExitTriggered ? 0 : 1,
            transform: isExitTriggered ? 'scale(3.5)' : 'scale(1)',
            filter: isExitTriggered ? 'blur(16px)' : 'blur(0px)',
            pointerEvents: isExitTriggered ? 'none' : 'all',
        }}>
            {/* Visual Depth Background Grid */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'radial-gradient(circle, rgba(56,56,63,0.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                opacity: isExitTriggered ? 0.2 : 0.6,
                transition: 'opacity 0.5s ease',
            }} />

            {/* Main Geometric Vortex Container */}
            <div style={{
                position: 'relative',
                width: 320,
                height: 320,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* SVG Concentric Ring Structure */}
                <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ position: 'absolute' }}>
                    {/* Outer Dashed Heavy Border Ring */}
                    <circle 
                        cx="100" cy="100" r="85" 
                        fill="none" stroke="#38383f" 
                        strokeWidth="1.5" 
                        strokeDasharray="6 8 12 8" 
                        className="animate-spiral" 
                    />
                    
                    {/* Middle Reverse Ring */}
                    <circle 
                        cx="100" cy="100" r="70" 
                        fill="none" stroke="#22222a" 
                        strokeWidth="1" 
                        strokeDasharray="4 6" 
                        className="animate-spiral-reverse" 
                    />

                    {/* Inner Archimedean Spiral Loader */}
                    <path 
                        d="M 100 100 
                           A 5 5 0 0 1 105 100 
                           A 10 10 0 0 1 90 100 
                           A 15 15 0 0 1 115 100 
                           A 20 20 0 0 1 80 100 
                           A 25 25 0 0 1 125 100 
                           A 30 30 0 0 1 70 100 
                           A 35 35 0 0 1 135 100
                           A 40 40 0 0 1 60 100"
                        fill="none" 
                        stroke="#f0f0f4" 
                        strokeWidth="1" 
                        strokeOpacity="0.45"
                        strokeDasharray="4 4"
                        className="animate-spiral-fast"
                    />

                    {/* Center Core Pulsing Ring */}
                    <circle 
                        cx="100" cy="100" r="28" 
                        fill="none" stroke="#f0f0f4" 
                        strokeWidth="2" 
                        className="animate-pulse-ring" 
                    />
                </svg>

                {/* Core Brand Icon Card */}
                <div style={{
                    width: 48,
                    height: 48,
                    background: '#f0f0f4',
                    border: '2px solid #f0f0f4',
                    borderRadius: 12,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(240,240,244,0.15)',
                    transform: isExitTriggered ? 'rotate(180deg) scale(0.6)' : 'none',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0c0c0e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                </div>
            </div>

            {/* Bottom Status Text UI */}
            <div style={{
                marginTop: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                zIndex: 10,
            }}>
                <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#f0f0f4',
                    opacity: isExitTriggered ? 0 : 0.85,
                    transition: 'opacity 0.3s ease',
                    height: 18,
                    textAlign: 'center',
                }}>
                    {STATUS_MESSAGES[statusIndex]}
                </div>
                
                {/* Horizontal Shimmer Loader Line */}
                <div style={{
                    width: 140,
                    height: 2,
                    background: '#22222a',
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    opacity: isExitTriggered ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, bottom: 0,
                        width: '45%',
                        background: '#f0f0f4',
                        borderRadius: 1,
                        animation: 'shimmer-slide 1.4s infinite ease-in-out',
                    }} />
                </div>
            </div>
        </div>
    );
}
