import React, { useRef, useEffect } from 'react';

/**
 * A premium, high-performance background animation using Canvas.
 * Creates a "HireSense aesthetic" continuous flowing gold/indigo wave matrix
 * that gently reacts to mouse movement.
 *
 * Rendered fixed to the viewport so it always covers the full screen,
 * regardless of how tall the page content is or how far it's scrolled.
 */
export default function TwirlBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId = null;

        const prefersReducedMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Viewport-sized drawing surface (CSS pixels). The canvas is fixed to
        // the viewport, so these always equal the visible area.
        let viewW = window.innerWidth;
        let viewH = window.innerHeight;

        // Configuration
        const CONNECTION_DISTANCE = 170;
        const MOUSE_RADIUS = 250;
        // Scale particle count to screen area so large displays stay populated
        // and small ones stay light. Clamped to a sane range.
        const particleCount = () =>
            Math.max(60, Math.min(160, Math.round((viewW * viewH) / 16000)));

        let particles = [];
        let mouse = { x: null, y: null };

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
        };

        const handleResize = () => {
            viewW = window.innerWidth;
            viewH = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            // Backing-store resolution for crisp rendering on HiDPI displays.
            canvas.width = Math.floor(viewW * dpr);
            canvas.height = Math.floor(viewH * dpr);
            canvas.style.width = `${viewW}px`;
            canvas.style.height = `${viewH}px`;

            // Reset (don't compound) the transform, then scale to DPR so all
            // drawing can use CSS-pixel coordinates.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            init();
        };

        class Particle {
            constructor() {
                this.x = Math.random() * viewW;
                this.y = Math.random() * viewH;
                this.size = Math.random() * 2 + 0.8;
                this.density = (Math.random() * 20) + 1;
                this.speedX = (Math.random() * 0.8) - 0.4;
                this.speedY = (Math.random() * 0.8) - 0.4;
                this.angle = Math.random() * Math.PI * 2;

                // Color palette: deep indigo to gold accent
                const colors = ['#b08a5a', '#e0d3bb', '#d4a94f', '#7a5a3a', '#1E1B4B'];
                this.baseColor = colors[Math.floor(Math.random() * colors.length)];
            }

            draw(ctx) {
                ctx.fillStyle = this.baseColor;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            update() {
                // Wave-like floating movement
                this.angle += 0.01;
                this.x += this.speedX + Math.sin(this.angle) * 0.3;
                this.y += this.speedY + Math.cos(this.angle) * 0.3;

                // Mouse interaction - gentle repulsion
                if (mouse.x != null && mouse.y != null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < MOUSE_RADIUS && distance > 0) {
                        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
                        const directionX = dx / distance;
                        const directionY = dy / distance;
                        // Smoothly ease away from cursor
                        this.x -= directionX * force * 3;
                        this.y -= directionY * force * 3;
                    }
                }

                // Seamless screen wrapping (uses live viewport dimensions)
                if (this.x > viewW + 50) this.x = -50;
                else if (this.x < -50) this.x = viewW + 50;

                if (this.y > viewH + 50) this.y = -50;
                else if (this.y < -50) this.y = viewH + 50;
            }
        }

        const init = () => {
            particles = [];
            const count = particleCount();
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        };

        const drawLines = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a + 1; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DISTANCE) {
                        const opacity = 1 - (distance / CONNECTION_DISTANCE);
                        const mixFactor = ((particles[a].x + particles[b].y) % 100) / 100; // Fake gradient based on position

                        // Use a rich gradient mix for lines
                        ctx.strokeStyle = `rgba(${129 + mixFactor * 100}, ${140 + mixFactor * 50}, 248, ${opacity * 0.25})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const drawFrame = () => {
            ctx.clearRect(0, 0, viewW, viewH);
            // Draw lines first so they are behind particles
            drawLines();
            particles.forEach((p) => p.draw(ctx));
        };

        const render = () => {
            particles.forEach((p) => p.update());
            drawFrame();
            animationFrameId = requestAnimationFrame(render);
        };

        const start = () => {
            if (animationFrameId == null) {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        const stop = () => {
            if (animationFrameId != null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };

        // Pause the loop while the tab is hidden to save CPU/battery.
        const handleVisibility = () => {
            if (document.hidden) stop();
            else if (!prefersReducedMotion) start();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibility);

        handleResize();

        if (prefersReducedMotion) {
            // Honor reduced-motion: render a single static frame, no animation.
            drawFrame();
        } else {
            start();
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibility);
            stop();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                pointerEvents: 'none',
                // Optional: Adds a slight glassmorphism/blur to back layer
                filter: 'blur(0.5px)',
            }}
        />
    );
}
