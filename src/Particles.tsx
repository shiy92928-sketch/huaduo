import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { HandState } from './store';

export default function Particles({ handZ = 0 }) {
  const particlesCount = 800; // Trail particles
  const pointsRef = useRef<THREE.Points>(null);
  
  // Track cursor position smoothly
  const targetPos = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3());
  const previousPos = useRef(new THREE.Vector3());
  
  // Particle data
  const particlesData = useMemo(() => {
    const data = [];
    for (let i = 0; i < particlesCount; i++) {
        data.push({
            life: Math.random(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            index: i
        });
    }
    return data;
  }, []);

  const [positions, opacities] = useMemo(() => {
    return [
      new Float32Array(particlesCount * 3),
      new Float32Array(particlesCount)
    ];
  }, []);

  // Material for glowing dust mapped to bloom
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#33FFFF') }
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (100.0 / -mvPosition.z) * vOpacity; // Size attenuates with distance
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (0.5 - dist) * 2.0 * vOpacity;
          // No color boost to reduce glow
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    previousPos.current.copy(currentPos.current);

    // 1. Calculate Hand Target in 3D Space if tracked
    if (HandState.x !== -999) {
      // Convert normalized screen coords (0-1) to NDC (-1 to 1)
      const nx = (HandState.x * 2) - 1;
      const ny = -(HandState.y * 2) + 1;
      
      const vec = new THREE.Vector3(nx, ny, 0.5);
      vec.unproject(state.camera);
      // Project to handZ plane (e.g. z = 0)
      const dir = vec.sub(state.camera.position).normalize();
      const distance = (handZ - state.camera.position.z) / dir.z;
      targetPos.current.copy(state.camera.position).add(dir.multiplyScalar(distance));
      
      // Interpolate for smooth trailing
      currentPos.current.lerp(targetPos.current, 0.2);
    } else {
      // Slowly drift to center if lost
      targetPos.current.lerp(new THREE.Vector3(0,0,0), 0.05);
      currentPos.current.lerp(targetPos.current, 0.1);
    }

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const opacityArray = pointsRef.current.geometry.attributes.opacity.array as Float32Array;

    // Calculate hand speed
    const speed = currentPos.current.distanceTo(previousPos.current) / (delta || 0.016);
    const isStationary = speed < 2.0;
    const time = state.clock.elapsedTime;

    // Number of particles emitted per frame based on movement
    // Higher emission when pinching, or scale dynamically with speed when not pinching
    let toEmit = HandState.isPinching ? 15 : Math.floor(Math.min(10, 1 + speed * 0.4));

    for (let i = 0; i < particlesCount; i++) {
        const p = particlesData[i];
        
        p.life -= delta * 0.8;
        
        if (p.life <= 0 && toEmit > 0) {
            // Respawn
            p.life = 1.0;
            p.velocity.set(
                (Math.random() - 0.5) * 4.0,
                (Math.random() - 0.5) * 4.0,
                (Math.random() - 0.5) * 4.0
            );
            if(HandState.isPinching) {
                // Burst velocity on pinch
                p.velocity.multiplyScalar(3.0);
            }
            
            // Spawn around current hand
            posArray[i * 3 + 0] = currentPos.current.x + (Math.random()-0.5)*0.5;
            posArray[i * 3 + 1] = currentPos.current.y + (Math.random()-0.5)*0.5;
            posArray[i * 3 + 2] = currentPos.current.z + (Math.random()-0.5)*0.5;
            toEmit--;
        } else {
            // Update
            posArray[i * 3 + 0] += p.velocity.x * delta;
            posArray[i * 3 + 1] += p.velocity.y * delta;
            posArray[i * 3 + 2] += p.velocity.z * delta;
            
            // Drag and slow drift
            p.velocity.multiplyScalar(0.95);
            p.velocity.y += delta * 1.5; // Slight buoyancy upward

            // Add swirling/flocking when stationary
            if (isStationary) {
                const px = posArray[i * 3 + 0];
                const py = posArray[i * 3 + 1];
                const pz = posArray[i * 3 + 2];

                // Swirl around current hand position
                const dx = px - currentPos.current.x;
                const dy = py - currentPos.current.y;
                const dz = pz - currentPos.current.z;

                // Swirl force perpendicular to radially outward vector
                const swirlX = -dz;
                const swirlZ = dx;
                
                // Keep particles somewhat contained
                const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const pullBack = distFromCenter > 2.0 ? 1.0 : 0.0;

                p.velocity.x += (swirlX * 1.5 - dx * pullBack) * delta;
                p.velocity.y += (-dy * pullBack) * delta;
                p.velocity.z += (swirlZ * 1.5 - dz * pullBack) * delta;
                
                // Add noise for flocking feeling
                p.velocity.x += Math.sin(py * 3.0 + time * 2.0) * delta;
                p.velocity.y += Math.cos(px * 3.0 + time * 2.0) * delta;
                p.velocity.z += Math.sin(px * 3.0 + py * 3.0 + time * 2.0) * delta;
            }
        }
        
        // Sine ease for opacity
        opacityArray[i] = Math.max(0, p.life * Math.sin(p.life * Math.PI));
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.opacity.needsUpdate = true;
    
    // Pulse color when pinching
    material.uniforms.color.value.set(HandState.isPinching ? '#FF00AA' : '#33FFFF');
  });

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={particlesCount}
          array={opacities}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  );
}
