import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, PerspectiveCamera } from '@react-three/drei';
import useOSStore from '../../store/osStore';

const Core = () => {
  const meshRef = useRef();
  const { activeAccent } = useOSStore();

  const accentColors = {
    purple: '#cc97ff',
    cyan: '#00d2fd',
    magenta: '#ff68f0',
    green: '#00f5a0'
  };

  const color = accentColors[activeAccent] || accentColors.purple;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.3;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.8}>
        <MeshDistortMaterial
          color={color}
          speed={2}
          distort={0.4}
          radius={1}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>
    </Float>
  );
};

const QuantumWidget = () => {
  const { lowPerformance } = useOSStore();

  if (lowPerformance) return null;

  return (
    <div className="w-full h-48 rounded-[2.5rem] bg-os-surfaceContainerLow/30 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden relative group">
      <div className="absolute top-4 left-6 z-10">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-os-primary opacity-80">Quantum Core</h3>
        <p className="text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-widest mt-1">System Entropy: 0.024</p>
      </div>
      
      <div className="absolute inset-0 cursor-crosshair">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <Suspense fallback={null}>
            <Core />
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-6 flex justify-between items-end z-10 pointer-events-none">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-1 h-3 bg-os-primary/20 rounded-full overflow-hidden">
               <div className="w-full h-full bg-os-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            </div>
          ))}
        </div>
        <span className="text-[9px] font-mono text-os-onSurfaceVariant opacity-50">STABLE_DIFFUSION_V2</span>
      </div>
    </div>
  );
};

export default QuantumWidget;
