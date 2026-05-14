import * as THREE from 'three';
import { extend, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { PetalMaterial, StemMaterial } from './shaders';
import { Billboard } from '@react-three/drei';

extend({ PetalMaterial, StemMaterial }); // make available as <petalMaterial> and <stemMaterial>

export interface FlowerProps {
  id: string;
  position: THREE.Vector3;
  colorSeed: number;
}

export default function Flower({ position, colorSeed }: FlowerProps) {
  const stemMatRef = useRef<any>(null);
  const petalsGroupRef = useRef<THREE.Group>(null);
  
  // Custom colors for this flower instance
  const colors = useMemo(() => {
    return {
      center: new THREE.Color().setHSL(0.1 + colorSeed * 0.05, 0.9, 0.6), // Yellowish
      mid: new THREE.Color().setHSL((colorSeed + 0.8) % 1.0, 0.8, 0.6), // Pinkish variable
      edge: new THREE.Color().setHSL((colorSeed + 0.5) % 1.0, 0.9, 0.4), // Purple/Blue variable
    };
  }, [colorSeed]);

  // Generate a smooth asymmetrical bezier curve for the stem, growing from bottom up to `position`
  const { curve, tubeGeom } = useMemo(() => {
    // Start way below the Y bounds, with slight random X/Z variation for natural look
    const startY = -15; 
    const startScale = 1 + Math.random();
    const start = new THREE.Vector3(
      position.x + (Math.random() - 0.5) * 8 * startScale,
      startY,
      position.z - 5
    );
    // Control point for nice sweeping curve
    const control = new THREE.Vector3(
      start.x + (position.x - start.x) * 2.0 * (Math.random() - 0.5),
      (start.y + position.y) / 2,
      position.z + (Math.random() - 0.5) * 5
    );
    const bezier = new THREE.QuadraticBezierCurve3(start, control, position);
    
    const geom = new THREE.TubeGeometry(bezier, 64, 0.08, 8, false);
    return { curve: bezier, tubeGeom: geom };
  }, [position]);

  // Pre-generate petal properties
  const petalData = useMemo(() => {
    const numPetals = 7 + Math.floor(Math.random() * 4);
    const petals = [];
    for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2;
        // Asymmetry in petals
        const radiusDist = 0.2 + Math.random() * 0.15;
        petals.push({
            angle,
            radiusDist,
            scale: 0.3 + Math.random() * 0.3,
            rotZ: angle - Math.PI/2,
        });
    }
    return petals;
  }, []);

  const progressRef = useRef(0);

  useFrame((state, delta) => {
    // 0 to 1 growth
    if (progressRef.current < 1) {
      progressRef.current += delta * 0.8;
      if (progressRef.current > 1) progressRef.current = 1;

      if (stemMatRef.current) {
        stemMatRef.current.uProgress = Math.min(progressRef.current * 1.5, 1.0);
      }
    }

    // Animate petals scaling and opacity (blooms after stem reaches top)
    if (petalsGroupRef.current && progressRef.current > 0.5) {
      const bloomProgress = Math.min((progressRef.current - 0.5) * 2.0, 1.0);
      const easeBloom = 1 - Math.pow(1 - bloomProgress, 3); // Cubic ease out
      
      petalsGroupRef.current.scale.setScalar(easeBloom);
      
      // Update opacity uniformly
      petalsGroupRef.current.children.forEach((child) => {
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as any;
          if(mat.uOpacity !== undefined) mat.uOpacity = easeBloom;
        }
      });
      
      // Gentle floating rotation
      petalsGroupRef.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <group>
      {/* Stem */}
      <mesh geometry={tubeGeom}>
        {/* @ts-ignore */}
        <stemMaterial ref={stemMatRef} transparent depthWrite={false} color="#11FF77" />
      </mesh>

      {/* Flower Head */}
      <group position={position}>
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          {/* A slight tilt to face camera beautifully */}
          <group ref={petalsGroupRef} scale={0} rotation-x={-0.2}>
            
            {/* Center glowing pollen */}
            <mesh position={[0, 0, 0.1]}>
              <circleGeometry args={[0.15, 32]} />
              <meshBasicMaterial color={colors.center} transparent opacity={0.9} depthWrite={false} blending={THREE.NormalBlending} />
            </mesh>
            
            {/* Petals */}
            {petalData.map((p, i) => (
              <mesh 
                key={i} 
                position={[Math.cos(p.angle) * p.radiusDist, Math.sin(p.angle) * p.radiusDist, 0]}
                rotation={[0, 0, p.rotZ]}
                scale={p.scale}
              >
                {/* 2x2 plane for petal canvas */}
                <planeGeometry args={[3, 3]} />
                {/* @ts-ignore */}
                <petalMaterial 
                  transparent 
                  depthWrite={false} 
                  blending={THREE.NormalBlending}
                  colorCenter={colors.center}
                  colorMid={colors.mid}
                  colorEdge={colors.edge}
                />
              </mesh>
            ))}
          </group>
        </Billboard>
      </group>
    </group>
  );
}
