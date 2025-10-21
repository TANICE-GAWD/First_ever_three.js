import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Global Styles Component ---
// This injects styles required for the animation to display correctly.
const GlobalStyles = () => (
  <style jsx global>{`
    /* A reset for the animation container */
    .animation-container, .animation-container canvas {
      width: 100vw;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
    }
    body {
      margin: 0;
      overflow: hidden;
      background: #000;
      color: white;
    }
    #fileInput {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 10;
      background-color: rgba(0,0,0,0.5);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
    }
  `}</style>
);

// --- Particle Shader Definitions ---
const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  void main(){
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  void main(){
    float d = distance(gl_PointCoord, vec2(0.5));
    if(d > 0.5) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

// --- Particle Logic Component ---
// This is an internal component that contains the core logic for the particles.
function VideoParticleEffect({ videoRef, videoSize }) {
  // --- Constants & Refs ---
  const PARTICLE_SIZE = 3;
  const DENSITY = 2;

  const pointsRef = useRef();
  const mouse = useRef({ x: -9999, y: -9999, isDown: false });
  const { size: viewportSize } = useThree();

  // --- Memos for costly objects ---
  const { sampler, ctx } = useMemo(() => {
    const sampler = document.createElement('canvas');
    const ctx = sampler.getContext('2d');
    return { sampler, ctx };
  }, []);

  const { COLOR_BRIGHT, COLOR_DARK, COLOR_HOVER } = useMemo(() => ({
    COLOR_BRIGHT: new THREE.Color(0xffffff),
    COLOR_DARK: new THREE.Color(0x222222),
    COLOR_HOVER: new THREE.Color().setHSL(0.15, 1, 0.5),
  }), []);

  const [particleData, bufferKey] = useMemo(() => {
    if (!videoSize) return [null, 0];

    const { w, h } = videoSize;
    const step = DENSITY;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    const particleCount = cols * rows;

    sampler.width = cols;
    sampler.height = rows;

    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const initialColor = new THREE.Color().setHSL(0.5, 1, 1);
    const halfW = cols / 2;
    const halfH = rows / 2;
    let i = 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        positions[i * 3 + 0] = (x - halfW) * PARTICLE_SIZE;
        positions[i * 3 + 1] = (halfH - y) * PARTICLE_SIZE;
        positions[i * 3 + 2] = 0;
        sizes[i] = PARTICLE_SIZE;
        initialColor.toArray(colors, i * 3);
        i++;
      }
    }
    
    const data = { particleCount, positions, velocities, sizes, colors, rows, cols };
    return [data, Date.now()]; // Return data and a unique key to force re-creation
  }, [videoSize, sampler, ctx]);

  // --- Event Listeners ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const handleMouseLeave = () => { mouse.current.x = -9999; mouse.current.y = -9999; };
    const handleMouseDown = () => { mouse.current.isDown = true; };
    const handleMouseUp = () => { mouse.current.isDown = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- Render Loop ---
  useFrame((state, delta) => {
    const video = videoRef.current;
    if (!pointsRef.current || !video || video.paused || video.readyState < 2) return;

    ctx.drawImage(video, 0, 0, particleData.cols, particleData.rows);
    const imgData = ctx.getImageData(0, 0, particleData.cols, particleData.rows).data;

    const positions = pointsRef.current.geometry.attributes.position.array;
    const velocities = pointsRef.current.geometry.attributes.velocity.array;
    const sizes = pointsRef.current.geometry.attributes.size.array;
    const colors = pointsRef.current.geometry.attributes.customColor.array;

    const worldMouse = new THREE.Vector3(
      mouse.current.x * viewportSize.width / 2,
      mouse.current.y * viewportSize.height / 2,
      0
    );

    const time = state.clock.getElapsedTime();
    const particlePos = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const animColor = new THREE.Color();

    for (let i = 0; i < particleData.particleCount; i++) {
        const i4 = i * 4;
        const i3 = i * 3;
        const r = imgData[i4] / 255;
        const g = imgData[i4 + 1] / 255;
        const b = imgData[i4 + 2] / 255;
        
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness > 0.5) {
          COLOR_BRIGHT.toArray(colors, i3);
        } else {
          COLOR_DARK.toArray(colors, i3);
        }

        particlePos.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        diff.subVectors(particlePos, worldMouse);
        const dist = diff.length();

        if (dist < 100) {
          const force = (100 - dist) / 100 * 5;
          velocities[i3] += diff.x / dist * force;
          velocities[i3 + 1] += diff.y / dist * force;
          COLOR_HOVER.toArray(colors, i3);
        }

        if (mouse.current.isDown && dist < 150) {
          const animHue = (0.5 + Math.sin(time * 5)) % 1;
          animColor.setHSL(animHue, 1, 0.5);
          animColor.toArray(colors, i3);
        }

        velocities[i3] *= 0.85;
        velocities[i3 + 1] *= 0.85;
        positions[i3] += velocities[i3];
        positions[i3 + 1] += velocities[i3 + 1];

        sizes[i] = PARTICLE_SIZE + (100 - dist) / 10 * (dist < 100 ? 1 : 0);
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.velocity.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;
    pointsRef.current.geometry.attributes.customColor.needsUpdate = true;
  });

  if (!particleData) return null;

  return (
    <points ref={pointsRef} key={bufferKey}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleData.particleCount} array={particleData.positions} itemSize={3} />
        <bufferAttribute attach="attributes-velocity" count={particleData.particleCount} array={particleData.velocities} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={particleData.particleCount} array={particleData.sizes} itemSize={1} />
        <bufferAttribute attach="attributes-customColor" count={particleData.particleCount} array={particleData.colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        vertexColors={true}
      />
    </points>
  );
}

// --- Main Exported Component ---
export default function Animation0() {
  const videoRef = useRef();
  const [videoSize, setVideoSize] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    video.src = url;
    video.load();
    video.play();
    video.addEventListener('loadedmetadata', () => {
        setVideoSize({ w: video.videoWidth, h: video.videoHeight });
      }, { once: true }
    );
  };

  return (
    <div className="animation-container">
      <GlobalStyles />
      <input type="file" id="fileInput" accept="video/*" onChange={handleFileChange} />
      <video id="video" ref={videoRef} loop playsInline style={{ display: 'none' }}></video>
      <Canvas
        camera={{ fov: 45, near: 1, far: 5000, position: [0, 0, 800] }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        {videoSize && (
          <VideoParticleEffect videoRef={videoRef} videoSize={videoSize} />
        )}
      </Canvas>
    </div>
  );
}
