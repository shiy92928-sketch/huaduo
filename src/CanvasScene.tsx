import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Sparkles } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import Flower from './Flower';
import Particles from './Particles';
import { HandState } from './store';

function SceneManager() {
  const [flowers, setFlowers] = useState<{ id: string; pos: THREE.Vector3; seed: number }[]>([]);
  const { camera } = useThree();
  const targetPlaneZ = 0; // The depth at which we place the flowers

  useFrame(() => {
    if (HandState.pinchPulsed) {
      HandState.pinchPulsed = false; // Consume pulse
      
      if (HandState.x !== -999) {
        const nx = (HandState.x * 2) - 1;
        const ny = -(HandState.y * 2) + 1;
        
        const vec = new THREE.Vector3(nx, ny, 0.5);
        vec.unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const distance = (targetPlaneZ - camera.position.z) / dir.z;
        const pinchWorldPos = camera.position.clone().add(dir.multiplyScalar(distance));
        
        setFlowers(prev => [
          ...prev, 
          { id: uuidv4(), pos: pinchWorldPos, seed: Math.random() }
        ]);
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#030508']} />
      
      {/* Ambient background dust - reduced glow/opacity */}
      <Sparkles count={500} scale={30} size={2} speed={0.4} opacity={0.08} color="#88aaff" />
      <Sparkles count={500} scale={40} size={1} speed={0.2} opacity={0.05} color="#ffaaff" />

      {/* Renders all spawned flowers */}
      {flowers.map(f => (
        <Flower key={f.id} id={f.id} position={f.pos} colorSeed={f.seed} />
      ))}

      {/* The glowing cursor emitting trailing particles */}
      <Particles handZ={targetPlaneZ} />

      {/* Neon Post Processing */}
      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.5} 
          mipmapBlur 
          intensity={0.6} 
          luminanceSmoothing={0.9} 
        />
      </EffectComposer>
    </>
  );
}

export default function CanvasScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 45 }}
      // Note: Setting antialias false removes jaggy artifacts when postprocessing is active
      gl={{ antialias: false, toneMapping: THREE.NoToneMapping }} 
      className="fixed inset-0 z-0 h-full w-full"
    >
      <SceneManager />
    </Canvas>
  );
}
