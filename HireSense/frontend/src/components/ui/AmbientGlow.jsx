import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Slow, warm "aurora" glow for the auth background — coffee-palette radial
 * blobs that drift and breathe behind the content. Pure ambiance: fixed to the
 * viewport, non-interactive, and frozen under prefers-reduced-motion.
 *
 * Layered together with <TwirlBackground/> (the particle field): this provides
 * the soft colour wash, the particles ride on top.
 */
// Aliased so ESLint sees `motion` as used (it recognises bare JSX identifiers
// like <MotionDiv/>, not member expressions like <motion.div/>).
const MotionDiv = motion.div;

const BLOBS = [
    { color: 'rgba(65,45,21,0.55)',  size: 640, top: '-12%', left: '-10%', dur: 26,
      path: { x: [0, 60, -24, 0], y: [0, -44, 30, 0], scale: [1, 1.12, 0.95, 1] } },
    { color: 'rgba(212,169,79,0.16)', size: 460, top: '52%',  left: '58%',  dur: 32,
      path: { x: [0, -54, 28, 0], y: [0, 38, -30, 0], scale: [1, 1.08, 1.04, 1] } },
    { color: 'rgba(225,220,201,0.09)', size: 380, top: '16%', left: '70%',  dur: 38,
      path: { x: [0, 30, -42, 0], y: [0, 52, 12, 0], scale: [1, 0.94, 1.1, 1] } },
];

export default function AmbientGlow() {
    const reduce = useReducedMotion();
    return (
        <div
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
        >
            {BLOBS.map((b, i) => (
                <MotionDiv
                    key={i}
                    initial={false}
                    animate={reduce ? undefined : b.path}
                    transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute',
                        top: b.top,
                        left: b.left,
                        width: b.size,
                        height: b.size,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
                        filter: 'blur(44px)',
                        willChange: 'transform',
                    }}
                />
            ))}
        </div>
    );
}
