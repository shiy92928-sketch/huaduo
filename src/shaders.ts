import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

export const PetalMaterial = shaderMaterial(
  {
    colorCenter: new THREE.Color('#FFDD00'),
    colorMid: new THREE.Color('#FF0099'),
    colorEdge: new THREE.Color('#7700FF'),
    uOpacity: 0.0,
  },
  // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  /* glsl */ `
    varying vec2 vUv;
    uniform vec3 colorCenter;
    uniform vec3 colorMid;
    uniform vec3 colorEdge;
    uniform float uOpacity;

    void main() {
      // Offset center slightly to give petal shape (anchored at bottom)
      vec2 center = vec2(0.5, 0.2); 
      // Elongate shape by scaling distance check on Y
      float d = distance(vUv * vec2(1.0, 0.7), center * vec2(1.0, 0.7)); 

      if (d > 0.5) discard;

      // Radial gradient flow
      vec3 color = mix(colorCenter, colorMid, smoothstep(0.0, 0.25, d));
      color = mix(color, colorEdge, smoothstep(0.25, 0.5, d));

      // Soft feather edge 
      float alpha = smoothstep(0.5, 0.35, d) * uOpacity;

      gl_FragColor = vec4(color, alpha);
    }
  `
);

export const StemMaterial = shaderMaterial(
  {
    uProgress: 0.0,
    color: new THREE.Color('#00FF66'),
  },
  // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  /* glsl */ `
    varying vec2 vUv;
    uniform float uProgress;
    uniform vec3 color;

    void main() {
      // TubeGeometry UV x-axis represents the path length 0 to 1
      if (vUv.x > uProgress) discard;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
);
