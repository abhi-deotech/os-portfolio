import React, { useEffect, useRef } from 'react';

const Visualizer = ({ isPlaying, accentColor = '#a855f7' }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const barCount = 48;
    const bars = [];
    const peaks = new Array(barCount).fill(0);
    
    // Physical constants for the "Music Simulator"
    const damping = 0.15;
    const gravity = 0.2;
    
    for (let i = 0; i < barCount; i++) {
        bars.push({
            height: 0,
            targetHeight: 0,
            velocity: 0,
            phase: Math.random() * Math.PI * 2,
            speed: 0.05 + Math.random() * 0.1
        });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width / barCount;
      const time = performance.now() * 0.001;

      // Complex Spectral Simulation Logic
      // We simulate 3 main frequency components:
      // 1. Bass: Low frequency, high amplitude pulses
      // 2. Mid: Constant rhythmic movement
      // 3. High: Fast jittery spikes
      
      const bass = Math.max(0, Math.sin(time * 2) * 0.5 + Math.sin(time * 5) * 0.5);
      const mid = Math.sin(time * 8) * 0.3 + 0.3;
      const treble = Math.random() * 0.2;

      bars.forEach((bar, i) => {
        if (isPlaying) {
          // Calculate theoretical "Spectral Intensity" for this bar's frequency slice
          let spectralIntensity = 0;
          
          if (i < barCount * 0.2) { // Bass region
             spectralIntensity = bass * 0.8 + Math.random() * 0.2;
          } else if (i < barCount * 0.6) { // Mid region
             spectralIntensity = mid * 0.6 + Math.random() * 0.1;
          } else { // Treble region
             spectralIntensity = treble * 1.5 + Math.cos(time * 12 + i) * 0.1;
          }

          // Apply physics: target height based on intensity + small sine variation
          bar.targetHeight = spectralIntensity * canvas.height * 0.8;
          bar.height += (bar.targetHeight - bar.height) * damping;
        } else {
          bar.height *= 0.85; // Settle down smoothly
        }

        // Draw the bar
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - bar.height);
        gradient.addColorStop(0, `${accentColor}44`);
        gradient.addColorStop(1, `${accentColor}aa`);
        
        ctx.fillStyle = gradient;
        const x = i * width;
        const h = Math.max(2, bar.height);
        
        // Rounded top bars
        ctx.beginPath();
        ctx.roundRect(x + 1, canvas.height - h, width - 2, h, [4, 4, 0, 0]);
        ctx.fill();

        // Draw Peak Marker
        if (bar.height > peaks[i]) {
            peaks[i] = bar.height;
        } else {
            peaks[i] -= gravity;
        }
        
        if (peaks[i] > 2) {
            ctx.fillStyle = `${accentColor}cc`;
            ctx.fillRect(x + 1, canvas.height - peaks[i] - 4, width - 2, 2);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, accentColor]);

  return <canvas ref={canvasRef} className="w-full h-full opacity-40 pointer-events-none" />;
};

export default Visualizer;
