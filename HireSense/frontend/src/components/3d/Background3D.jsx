import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

const damp = THREE.MathUtils.damp;

// ─── Model 1: Glass Sphere ────────────────────────────────────────────
function GlassSphere({ position = [-3, 1.5, -2] }) {
    const ref = useRef();

    useFrame((state, delta) => {
        ref.current.rotation.x += delta * 0.08;
        ref.current.rotation.y += delta * 0.12;
        const tx = position[0] + state.pointer.x * 0.6;
        const ty = position[1] + state.pointer.y * 0.4;
        ref.current.position.x = damp(ref.current.position.x, tx, 2, delta);
        ref.current.position.y = damp(ref.current.position.y, ty, 2, delta);
    });

    return (
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
            <mesh ref={ref} position={position} scale={1.4}>
                <sphereGeometry args={[1, 64, 64]} />
                <MeshDistortMaterial
                    color="#0c0c10"
                    emissive="#08081a"
                    emissiveIntensity={0.5}
                    clearcoat={1}
                    clearcoatRoughness={0.05}
                    metalness={0.95}
                    roughness={0.15}
                    distort={0.25}
                    speed={1.2}
                    transparent
                    opacity={0.85}
                />
            </mesh>
        </Float>
    );
}

// ─── Model 2: Geometric Monolith (Icosahedron) ───────────────────────
function Monolith({ position = [2.5, -0.5, -3] }) {
    const ref = useRef();
    const wireRef = useRef();

    useFrame((state, delta) => {
        ref.current.rotation.x += delta * 0.06;
        ref.current.rotation.y += delta * 0.1;
        wireRef.current.rotation.x -= delta * 0.04;
        wireRef.current.rotation.y -= delta * 0.07;
        const tx = position[0] + state.pointer.x * 0.3;
        const ty = position[1] + state.pointer.y * 0.25;
        ref.current.position.x = damp(ref.current.position.x, tx, 1.8, delta);
        ref.current.position.y = damp(ref.current.position.y, ty, 1.8, delta);
        wireRef.current.position.x = ref.current.position.x;
        wireRef.current.position.y = ref.current.position.y;
    });

    return (
        <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.4}>
            <group>
                <mesh ref={ref} position={position} scale={0.9}>
                    <icosahedronGeometry args={[1, 0]} />
                    <meshStandardMaterial
                        color="#0a0a12"
                        emissive="#0d0d22"
                        metalness={0.9}
                        roughness={0.25}
                        transparent
                        opacity={0.7}
                    />
                </mesh>
                <mesh ref={wireRef} position={position} scale={1.15}>
                    <icosahedronGeometry args={[1, 0]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        wireframe
                        transparent
                        opacity={0.06}
                    />
                </mesh>
            </group>
        </Float>
    );
}

// ─── Model 3: Dynamic Strand Mesh (Torus Knot) ──────────────────────
function StrandMesh({ position = [0.5, -2.5, -4] }) {
    const ref = useRef();

    useFrame((state, delta) => {
        ref.current.rotation.x += delta * 0.04;
        ref.current.rotation.z += delta * 0.06;
        const tx = position[0] + state.pointer.x * 0.2;
        const ty = position[1] + state.pointer.y * 0.15;
        ref.current.position.x = damp(ref.current.position.x, tx, 1.5, delta);
        ref.current.position.y = damp(ref.current.position.y, ty, 1.5, delta);
    });

    return (
        <Float speed={0.6} rotationIntensity={0.08} floatIntensity={0.2}>
            <mesh ref={ref} position={position} scale={1.6}>
                <torusKnotGeometry args={[1, 0.3, 128, 16, 2, 3]} />
                <meshStandardMaterial
                    color="#06060e"
                    emissive="#0a0a1e"
                    emissiveIntensity={0.3}
                    metalness={0.85}
                    roughness={0.3}
                    wireframe
                    transparent
                    opacity={0.12}
                />
            </mesh>
        </Float>
    );
}

// ─── Ambient Particles ──────────────────────────────────────────────
function AmbientParticles({ count = 60 }) {
    const ref = useRef();
    const positions = useMemo(() => {
        const p = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            p[i * 3] = (Math.random() - 0.5) * 25;
            p[i * 3 + 1] = (Math.random() - 0.5) * 25;
            p[i * 3 + 2] = (Math.random() - 0.5) * 25;
        }
        return p;
    }, [count]);

    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * 0.008;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.02} color="#ffffff" transparent opacity={0.25} sizeAttenuation />
        </points>
    );
}

// ─── Main Canvas Export ─────────────────────────────────────────────
export default function Background3D() {
    return (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
            <Canvas
                camera={{ position: [0, 0, 6], fov: 45 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[8, 6, 5]} intensity={0.8} color="#4a5ee8" />
                    <directionalLight position={[-6, -4, -5]} intensity={0.3} color="#8E8E93" />
                    <pointLight position={[0, 0, 3]} intensity={0.2} color="#6366f1" />

                    <GlassSphere />
                    <Monolith />
                    <StrandMesh />
                    <AmbientParticles />
                </Suspense>
            </Canvas>
        </div>
    );
}
