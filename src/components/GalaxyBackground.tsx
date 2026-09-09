
import React, { useEffect, useRef } from 'react';

interface Props {
  theme: 'neon' | 'golden' | 'cosmic' | 'forest' | 'indigo' | 'white' | 'grey' | 'cendre' | 'menthe' | 'cherry' | 'red';
  speed: number;
  density: number;
  style: 'constellation' | 'stars_only' | 'static';
}

export const GalaxyBackground: React.FC<Props> = ({ theme, speed, density, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;

    const colors: Record<string, string> = {
      neon: '6, 182, 212',
      golden: '255, 215, 0',
      cosmic: '168, 85, 247',
      forest: '16, 185, 129',
      indigo: '99, 102, 241',
      white: '255, 255, 255',
      grey: '107, 114, 128',
      cendre: '178, 190, 181',
      menthe: '52, 211, 153',
      cherry: '244, 63, 94',
      red: '239, 68, 68'
    };

    class Particle {
      angle: number;
      radius: number;
      orbitalSpeed: number;
      size: number;
      x: number;
      y: number;
      opacity: number;
      glowIntensity: number;
      pulseSpeed: number;
      pulseDir: number;

      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        const distFactor = Math.random();
        this.radius = Math.pow(distFactor, 0.75) * (Math.max(canvas!.width, canvas!.height) * 0.95);
        this.orbitalSpeed = (0.0002 + Math.random() * 0.0006) * (1 + 400 / (this.radius + 50)) * speed;
        this.size = Math.random() * 2.8 + 0.6;
        this.opacity = Math.random() * 0.8 + 0.4;
        this.glowIntensity = Math.random() * 20 + 10;
        this.pulseSpeed = Math.random() * 0.02;
        this.pulseDir = 1;
        this.x = centerX + Math.cos(this.angle) * this.radius;
        this.y = centerY + Math.sin(this.angle) * this.radius;
      }

      update() {
        if (style === 'static') return;
        this.angle += this.orbitalSpeed;
        this.x = centerX + Math.cos(this.angle) * this.radius;
        this.y = centerY + Math.sin(this.angle) * this.radius;

        this.opacity += this.pulseSpeed * this.pulseDir;
        if (this.opacity > 0.9 || this.opacity < 0.3) this.pulseDir *= -1;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        ctx!.shadowBlur = this.size > 1.2 ? this.glowIntensity : 0;
        ctx!.shadowColor = `rgba(${colors[theme] || colors.neon}, 0.9)`;

        ctx!.fillStyle = `rgba(${colors[theme] || colors.neon}, ${this.opacity})`;
        ctx!.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      particles = Array.from({ length: density }, () => new Particle());
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.18)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      if (style === 'constellation') {
        const connectionDistance = 150; 
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < connectionDistance) {
              ctx.beginPath();
              ctx.shadowBlur = 0;
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              const alpha = (1 - dist / connectionDistance) * 0.22;
              ctx.strokeStyle = `rgba(${colors[theme] || colors.neon}, ${alpha})`;
              ctx.lineWidth = 1.0;
              ctx.stroke();
            }
          }
        }
      }
      requestAnimationFrame(animate);
    };

    init();
    animate();
    
    const handleResize = () => init();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [theme, speed, density, style]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0" 
      style={{ opacity: 1 }}
    />
  );
};
