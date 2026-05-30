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
            background: '#0c0c0e',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: 'var(--font), sans-serif',
            color: '#e1dcc9',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s ease',
            opacity: isExitTriggered ? 0 : 1,
            transform: isExitTriggered ? 'scale(3.5)' : 'scale(1)',
            filter: isExitTriggered ? 'blur(16px)' : 'blur(0px)',
            pointerEvents: isExitTriggered ? 'none' : 'all',
        }}>
            {/* Scoped keyframes */}
            <style>{`
                @keyframes vl-orbit-x {
                    0%   { transform: rotateX(70deg) rotateZ(0deg); }
                    100% { transform: rotateX(70deg) rotateZ(360deg); }
                }
                @keyframes vl-orbit-y {
                    0%   { transform: rotateY(70deg) rotateZ(0deg); }
                    100% { transform: rotateY(70deg) rotateZ(360deg); }
                }
                @keyframes vl-orbit-xy {
                    0%   { transform: rotateX(55deg) rotateY(55deg) rotateZ(0deg); }
                    100% { transform: rotateX(55deg) rotateY(55deg) rotateZ(360deg); }
                }
                @keyframes vl-pulse-core {
                    0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 40px rgba(225,220,201,0.12), 0 0 80px rgba(225,220,201,0.06); }
                    50%      { transform: scale(1.08); opacity: 0.85; box-shadow: 0 0 60px rgba(225,220,201,0.2), 0 0 120px rgba(225,220,201,0.1); }
                }
                @keyframes vl-glow-breathe {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50%      { opacity: 0.35; transform: scale(1.15); }
                }
                @keyframes vl-dot-pulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes vl-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
            `}</style>

            {/* Subtle dot grid background */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'radial-gradient(circle, rgba(56,56,63,0.12) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                opacity: 0.5,
            }} />

            {/* Atmospheric glow behind the orb */}
            <div style={{
                position: 'absolute',
                width: 300, height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(225,220,201,0.06) 0%, rgba(225,220,201,0.02) 40%, transparent 70%)',
                animation: 'vl-glow-breathe 4s ease-in-out infinite',
            }} />

            {/* 3D Orbital Rings Container */}
            <div style={{
                position: 'relative',
                width: 260,
                height: 260,
                perspective: '800px',
                perspectiveOrigin: '50% 50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'vl-float 4s ease-in-out infinite',
            }}>

                {/* Ring 1 — Outer XZ orbit (tilted horizontal) */}
                <div style={{
                    position: 'absolute',
                    width: 240, height: 240,
                    borderRadius: '50%',
                    border: '1.5px solid #38383f',
                    animation: 'vl-orbit-x 6s linear infinite',
                    transformStyle: 'preserve-3d',
                }} />

                {/* Ring 2 — YZ orbit (tilted vertical, counter) */}
                <div style={{
                    position: 'absolute',
                    width: 210, height: 210,
                    borderRadius: '50%',
                    border: '1px solid #22222a',
                    animation: 'vl-orbit-y 8s linear infinite reverse',
                    transformStyle: 'preserve-3d',
                }} />

                {/* Ring 3 — Diagonal XY orbit */}
                <div style={{
                    position: 'absolute',
                    width: 180, height: 180,
                    borderRadius: '50%',
                    border: '1px dashed #38383f',
                    animation: 'vl-orbit-xy 10s linear infinite',
                    transformStyle: 'preserve-3d',
                }} />

                {/* Ring 4 — Inner tight ring */}
                <div style={{
                    position: 'absolute',
                    width: 130, height: 130,
                    borderRadius: '50%',
                    border: '1.5px solid #22222a',
                    animation: 'vl-orbit-x 4s linear infinite reverse',
                    transformStyle: 'preserve-3d',
                }} />

                {/* Orbiting dot on Ring 1 */}
                <div style={{
                    position: 'absolute',
                    width: 240, height: 240,
                    animation: 'vl-orbit-x 6s linear infinite',
                    transformStyle: 'preserve-3d',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: -3, left: '50%', marginLeft: -3,
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: '#e1dcc9',
                        boxShadow: '0 0 12px rgba(225,220,201,0.5)',
                        animation: 'vl-dot-pulse 2s ease-in-out infinite',
                    }} />
                </div>

                {/* Orbiting dot on Ring 2 */}
                <div style={{
                    position: 'absolute',
                    width: 210, height: 210,
                    animation: 'vl-orbit-y 8s linear infinite reverse',
                    transformStyle: 'preserve-3d',
                }}>
                    <div style={{
                        position: 'absolute',
                        bottom: -3, left: '50%', marginLeft: -3,
                        width: 5, height: 5,
                        borderRadius: '50%',
                        background: '#a0a0b0',
                        boxShadow: '0 0 10px rgba(160,160,176,0.4)',
                        animation: 'vl-dot-pulse 2.5s ease-in-out infinite 0.5s',
                    }} />
                </div>

                {/* Orbiting dot on Ring 3 */}
                <div style={{
                    position: 'absolute',
                    width: 180, height: 180,
                    animation: 'vl-orbit-xy 10s linear infinite',
                    transformStyle: 'preserve-3d',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%', right: -2.5, marginTop: -2.5,
                        width: 5, height: 5,
                        borderRadius: '50%',
                        background: '#48485a',
                        boxShadow: '0 0 8px rgba(72,72,90,0.3)',
                        animation: 'vl-dot-pulse 3s ease-in-out infinite 1s',
                    }} />
                </div>

                {/* Core Brand Icon — pulsing center */}
                <div style={{
                    width: 56,
                    height: 56,
                    background: '#e1dcc9',
                    borderRadius: 14,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'vl-pulse-core 3s ease-in-out infinite',
                    transform: isExitTriggered ? 'rotate(180deg) scale(0.5)' : 'none',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0c0c0e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                </div>
            </div>

            {/* Bottom Status Text */}
            <div style={{
                marginTop: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                zIndex: 10,
            }}>
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: '#a0a0b0',
                    opacity: isExitTriggered ? 0 : 0.9,
                    transition: 'opacity 0.3s ease',
                    height: 16,
                    textAlign: 'center',
                }}>
                    {STATUS_MESSAGES[statusIndex]}
                </div>

                {/* Progress shimmer bar */}
                <div style={{
                    width: 160,
                    height: 2,
                    background: '#18181c',
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    opacity: isExitTriggered ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, bottom: 0,
                        width: '40%',
                        background: 'linear-gradient(90deg, transparent, #e1dcc9, transparent)',
                        borderRadius: 1,
                        animation: 'shimmer-slide 1.6s infinite ease-in-out',
                    }} />
                </div>
            </div>
        </div>
    );
}
