import React, { useRef, useEffect } from 'react';

/**
 * A premium, high-performance background animation using Canvas.
 * Creates a "HireSense aesthetic" continuous flowing gold/indigo wave matrix
 * that gently reacts to mouse movement.
 */
export default function TwirlBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Configuration
        const PARTICLE_COUNT = 100;
        const CONNECTION_DISTANCE = 170;
        const MOUSE_RADIUS = 250;

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
            // Support high DPI displays
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            init();
        };

        class Particle {
            constructor() {
                this.x = Math.random() * (window.innerWidth);
                this.y = Math.random() * (window.innerHeight);
                this.size = Math.random() * 2 + 0.8;
                this.density = (Math.random() * 20) + 1;
                this.speedX = (Math.random() * 0.8) - 0.4;
                this.speedY = (Math.random() * 0.8) - 0.4;
                this.angle = Math.random() * Math.PI * 2;
                
                // Color palette: deep indigo to gold accent
                const colors = ['#818CF8', '#C7D2FE', '#FBBF24', '#4F46E5', '#1E1B4B'];
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

            update(time) {
                // Wave-like floating movement
                this.angle += 0.01;
                this.x += this.speedX + Math.sin(this.angle) * 0.3;
                this.y += this.speedY + Math.cos(this.angle) * 0.3;

                // Mouse interaction - gentle repulsion
                if (mouse.x != null && mouse.y != null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < MOUSE_RADIUS) {
                        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
                        const directionX = dx / distance;
                        const directionY = dy / distance;
                        // Smoothly ease away from cursor
                        this.x -= directionX * force * 3;
                        this.y -= directionY * force * 3;
                    }
                }

                // Seamless screen wrapping
                if (this.x > window.innerWidth + 50) this.x = -50;
                else if (this.x < -50) this.x = window.innerWidth + 50;
                
                if (this.y > window.innerHeight + 50) this.y = -50;
                else if (this.y < -50) this.y = window.innerHeight + 50;
            }
        }

        const init = () => {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle());
            }
        };

        const drawLines = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DISTANCE) {
                        const opacity = 1 - (distance / CONNECTION_DISTANCE);
                        const mixFactor = ((particles[a].x + particles[b].y) % 100) / 100; // Fake gradient based on position
                        
                        // Use a rich gradient mix for lines
                        ctx.strokeStyle = `rgba(${129 + mixFactor*100}, ${140 + mixFactor*50}, 248, ${opacity * 0.25})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const render = (time) => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            
            // Draw lines first so they are behind particles
            drawLines();

            particles.forEach((p) => {
                p.update(time);
                p.draw(ctx);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);
        
        handleResize();
        render(0);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                // Optional: Adds a slight glassmorphism/blur to back layer
                filter: 'blur(0.5px)' 
            }}
        />
    );
}
