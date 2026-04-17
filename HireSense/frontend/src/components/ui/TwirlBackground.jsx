import React, { useEffect, useRef } from 'react';

export default function TwirlBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        let animationFrameId;
        
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        // Mouse tracking
        let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
        let prevMouse = { x: -1000, y: -1000 };
        
        const handleMouseMove = (e) => {
            prevMouse.x = mouse.x;
            prevMouse.y = mouse.y;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.vx = mouse.x - prevMouse.x;
            mouse.vy = mouse.y - prevMouse.y;
        };
        
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        
        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        };
        window.addEventListener('resize', handleResize);

        class Particle {
            constructor() {
                this.reset(true);
            }

            reset(randomize = false) {
                this.x = Math.random() * width;
                this.y = randomize ? Math.random() * height : -10;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.size = Math.random() * 1.5 + 0.5;
                this.history = [];
                this.maxHistory = Math.floor(Math.random() * 60 + 20);
                
                // Monochromatic professional palette: shades of black to match the theme
                const colors = [
                    'rgba(0, 0, 0, OPACITY)',
                    'rgba(24, 24, 27, OPACITY)',
                    'rgba(39, 39, 42, OPACITY)',
                    'rgba(9, 9, 11, OPACITY)',
                ];
                this.baseColor = colors[Math.floor(Math.random() * colors.length)];
                this.opacity = Math.random() * 0.5 + 0.1;
                this.speed = Math.random() * 0.8 + 0.2;
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.05 + 0.01;
            }

            update(time) {
                // Tighter flow field for more natural native twirls over the entire screen
                const angle = Math.sin(this.x * 0.005 + time * 0.8) * Math.cos(this.y * 0.005 - time * 0.5) * Math.PI * 4;
                
                this.wobble += this.wobbleSpeed;
                
                let targetVx = Math.cos(angle) * this.speed * 2 + Math.sin(this.wobble) * 0.5;
                let targetVy = Math.sin(angle) * this.speed * 2 + Math.cos(this.wobble) * 0.5;

                // Gravity / Swirl effect from mouse (Graphity)
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 250 && mouse.x > 0) {
                    const force = (250 - dist) / 250;
                    // Create a twirling effect around the cursor
                    const pullAngle = Math.atan2(dy, dx);
                    const twirlAngle = pullAngle + Math.PI / 2.5; // Perpendicular offset creates twirl
                    
                    targetVx += Math.cos(twirlAngle) * force * 10;
                    targetVy += Math.sin(twirlAngle) * force * 10;
                    
                    // Increase opacity when interacting
                    this.opacity = Math.min(1, this.opacity + 0.05);
                } else {
                    // Decay opacity back to normal
                    this.opacity = Math.max(0.1, this.opacity - 0.01);
                }

                // Smooth velocity changes (inertia)
                this.vx += (targetVx - this.vx) * 0.05;
                this.vy += (targetVy - this.vy) * 0.05;

                this.x += this.vx;
                this.y += this.vy;

                // Save history for lines
                this.history.unshift({ x: this.x, y: this.y });
                if (this.history.length > this.maxHistory) {
                    this.history.pop();
                }

                // Screen wrapping
                if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
                    this.history = []; // Break line on wrap
                    
                    if (this.x < -50) this.x = width + 49;
                    if (this.x > width + 50) this.x = -49;
                    if (this.y < -50) this.y = height + 49;
                    if (this.y > height + 50) this.y = -49;
                }
            }

            draw(ctx) {
                if (this.history.length < 2) return;

                ctx.beginPath();
                ctx.moveTo(this.history[0].x, this.history[0].y);
                
                for (let i = 1; i < this.history.length; i++) {
                    // Quadratic bezier curves for smoother lines
                    const current = this.history[i];
                    const next = this.history[i + 1];
                    if (next) {
                        const xc = (current.x + next.x) / 2;
                        const yc = (current.y + next.y) / 2;
                        ctx.quadraticCurveTo(current.x, current.y, xc, yc);
                    } else {
                        ctx.lineTo(current.x, current.y);
                    }
                }

                // Fade trail opacity
                const gradient = ctx.createLinearGradient(
                    this.history[0].x, this.history[0].y,
                    this.history[this.history.length - 1].x, this.history[this.history.length - 1].y
                );
                
                const finalColor = this.baseColor.replace('OPACITY', this.opacity.toString());
                const fadeColor = this.baseColor.replace('OPACITY', '0');
                
                gradient.addColorStop(0, finalColor);
                gradient.addColorStop(1, fadeColor);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = this.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
                
                // Draw head glow
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = finalColor;
                ctx.fill();
            }
        }

        let particles = [];
        const initParticles = () => {
            particles = [];
            // Increased density to automatically fill the entire screen with twirls
            const ptCount = window.innerWidth < 768 ? 100 : 350;
            for (let i = 0; i < ptCount; i++) {
                particles.push(new Particle());
            }
        };

        initParticles();

        let time = 0;
        const render = () => {
            time += 0.005;
            
            // Clear canvas completely each frame
            ctx.clearRect(0, 0, width, height);
            
            // Optional: Draw a subtle vignette/dark gradient behind if needed
            // But usually handled by CSS background in Login.jsx

            // Draw and update particles
            particles.forEach((p) => {
                p.update(time);
                p.draw(ctx);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

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
                opacity: 0.9, // Adjust overall intensity
            }}
        />
    );
}
