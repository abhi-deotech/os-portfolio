import React, { useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

// Particle class moved outside component to comply with React hooks rules
class Particle {
  constructor(canvas, mouseRef, accentColor) {
    this.canvas = canvas;
    this.mouseRef = mouseRef;
    this.accentColor = accentColor;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.1;
  }

  update() {
    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Mouse attraction
    if (this.mouseRef.current.active) {
      const dx = this.mouseRef.current.x - this.x;
      const dy = this.mouseRef.current.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 300) {
        const force = (300 - dist) / 3000;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }
    }

    // Friction
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Boundary check
    if (this.x < 0 || this.x > this.canvas.width || this.y < 0 || this.y > this.canvas.height) {
      this.reset();
    }
  }

  draw(ctx) {
    ctx.fillStyle = `${this.accentColor}${Math.floor(this.alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

const QuantumParticles = ({ accentColor = '#a855f7' }) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Particle settings
    const PARTICLE_COUNT = isMobile ? 50 : 150; // Drastically reduced for performance, but increased size to keep visual impact
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(canvas, mouseRef, accentColor));
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Group by alpha to reduce context switching (optional, simpler to just batch all if same color)
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      
      particles.forEach(p => {
        p.update();
        // High performance path batching
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      });
      
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [accentColor, isMobile]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen"
    />
  );
};

export default QuantumParticles;
