import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Animated Icosahedron that rotates and pulses
function AnimatedSphere() {
    const meshRef = useRef();
    const wireRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.rotation.x = t * 0.15;
            meshRef.current.rotation.y = t * 0.2;
            meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.05);
        }
        if (wireRef.current) {
            wireRef.current.rotation.x = t * 0.1;
            wireRef.current.rotation.y = -t * 0.15;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
            <group>
                {/* Inner solid */}
                <mesh ref={meshRef}>
                    <icosahedronGeometry args={[1.8, 1]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.03}
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {/* Wireframe overlay */}
                <mesh ref={wireRef}>
                    <icosahedronGeometry args={[2, 1]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        wireframe
                        transparent
                        opacity={0.15}
                    />
                </mesh>
                {/* Outer glow ring */}
                <mesh>
                    <torusGeometry args={[2.5, 0.01, 16, 64]} />
                    <meshStandardMaterial color="#ffffff" transparent opacity={0.08} />
                </mesh>
            </group>
        </Float>
    );
}

// Floating particles
function Particles({ count = 80 }) {
    const mesh = useRef();
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return pos;
    }, [count]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (mesh.current) {
            mesh.current.rotation.y = t * 0.02;
            mesh.current.rotation.x = t * 0.01;
        }
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.03} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
        </points>
    );
}

export default function CinematicIntro({ onComplete }) {
    const [phase, setPhase] = useState(0); // 0: logo, 1: tagline, 2: fade out

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 1500);
        const t2 = setTimeout(() => setPhase(2), 4000);
        const t3 = setTimeout(() => onComplete(), 5200);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={onComplete}>

            {/* 3D Background */}
            <div className="absolute inset-0">
                <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
                    <ambientLight intensity={0.3} />
                    <pointLight position={[5, 5, 5]} intensity={0.5} />
                    <pointLight position={[-5, -5, -5]} intensity={0.3} color="#666" />
                    <AnimatedSphere />
                    <Particles />
                    <Stars radius={50} depth={50} count={1000} factor={3} saturation={0} fade speed={0.5} />
                </Canvas>
            </div>

            {/* Overlay content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
                <AnimatePresence>
                    {phase < 2 && (
                        <motion.div
                            className="flex flex-col items-center"
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.8 }}
                        >
                            {/* HIRE SENSE */}
                            <motion.h1
                                className="text-white font-light tracking-[0.5em] uppercase select-none"
                                style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
                                initial={{ opacity: 0, letterSpacing: '1em' }}
                                animate={{ opacity: 1, letterSpacing: '0.5em' }}
                                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                            >
                                HIRE SENSE
                            </motion.h1>

                            {/* Divider line */}
                            <motion.div
                                className="h-[0.5px] bg-white/30 mt-8 mb-8"
                                initial={{ width: 0 }}
                                animate={{ width: '200px' }}
                                transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            />

                            {/* Tagline */}
                            <AnimatePresence>
                                {phase >= 1 && (
                                    <motion.p
                                        className="text-white/60 text-[12px] tracking-[0.4em] uppercase font-light"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        Intelligence Meets Talent
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Skip button */}
            <motion.div
                className="absolute bottom-10 right-10 z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onComplete(); }}
                    className="text-white/30 text-[10px] tracking-[0.2em] uppercase hover:text-white/60 transition-colors duration-300 border border-white/10 px-4 py-2 hover:border-white/30"
                >
                    Skip
                </button>
            </motion.div>

            {/* Scan line effect */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)'
                }}
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
            />
        </div>
    );
}
