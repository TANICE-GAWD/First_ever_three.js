import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Animation0 = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const samplerRef = useRef(null);
  const ctxRef = useRef(null);
  const geometryRef = useRef(null);
  const materialRef = useRef(null);
  const pointsRef = useRef(null);
  const animationIdRef = useRef(null);

  
  const particleCountRef = useRef(0);
  const PARTICLE_SIZE = 3;
  const DENSITY = 2;
  const pointerRef = useRef(new THREE.Vector2(-9999, -9999));
  const mouseDownRef = useRef(false);

  
  const COLOR_BRIGHT = new THREE.Color(0xffffff);
  const COLOR_DARK = new THREE.Color(0x222222);
  const COLOR_DEFAULT = new THREE.Color().setHSL(0.5, 1, 1);
  const COLOR_HOVER = new THREE.Color().setHSL(0.15, 1, 0.5);

  useEffect(() => {
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 0, 800);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    
    const sampler = document.createElement('canvas');
    const ctx = sampler.getContext('2d');
    samplerRef.current = sampler;
    ctxRef.current = ctx;

    
    const handleMouseMove = (e) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleMouseLeave = () => {
      pointerRef.current.set(-9999, -9999);
    };

    const handleMouseDown = () => {
      mouseDownRef.current = true;
    };

    const handleMouseUp = () => {
      mouseDownRef.current = false;
    };

    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (geometryRef.current) updateParticles();
      renderer.render(scene, camera);
    };

    animate();

    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (geometryRef.current) geometryRef.current.dispose();
      if (materialRef.current) materialRef.current.dispose();
      if (pointsRef.current && sceneRef.current) {
        sceneRef.current.remove(pointsRef.current);
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }

      renderer.dispose();
    };
  }, []);

  const initParticles = (w, h) => {
    const step = DENSITY;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    particleCountRef.current = cols * rows;

    samplerRef.current.width = cols;
    samplerRef.current.height = rows;

    
    if (geometryRef.current) geometryRef.current.dispose();
    if (materialRef.current) materialRef.current.dispose();
    if (pointsRef.current) sceneRef.current.remove(pointsRef.current);

    const positions = new Float32Array(particleCountRef.current * 3);
    const velocities = new Float32Array(particleCountRef.current * 3);
    const sizes = new Float32Array(particleCountRef.current);
    const colors = new Float32Array(particleCountRef.current * 3);

    let i = 0;
    const halfW = cols / 2;
    const halfH = rows / 2;
    const scale = 6; 

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        positions[i * 3 + 0] = (x - halfW) * scale;
        positions[i * 3 + 1] = (halfH - y) * scale;
        positions[i * 3 + 2] = 0;

        velocities[i * 3 + 0] = velocities[i * 3 + 1] = velocities[i * 3 + 2] = 0;
        sizes[i] = PARTICLE_SIZE * 2;
        COLOR_DEFAULT.toArray(colors, i * 3);
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;
        void main() {
          vColor = customColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if(d > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
      transparent: true,
      vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    sceneRef.current.add(points);

    geometryRef.current = geometry;
    materialRef.current = material;
    pointsRef.current = points;
  };

  const updateParticles = () => {
    const video = videoRef.current;
    if (!video || video.paused || video.readyState < 2) return;

    ctxRef.current.drawImage(video, 0, 0, samplerRef.current.width, samplerRef.current.height);
    const img = ctxRef.current.getImageData(0, 0, samplerRef.current.width, samplerRef.current.height).data;

    const posAttr = geometryRef.current.getAttribute('position');
    const velAttr = geometryRef.current.getAttribute('velocity');
    const sizeAttr = geometryRef.current.getAttribute('size');
    const colAttr = geometryRef.current.getAttribute('customColor');

    const positions = posAttr.array;
    const velocities = velAttr.array;
    const sizes = sizeAttr.array;
    const colors = colAttr.array;

    const time = performance.now() * 0.001;
    let idx = 0;

    for (let y = 0; y < samplerRef.current.height; y++) {
      for (let x = 0; x < samplerRef.current.width; x++) {
        const pixelIndex = (y * samplerRef.current.width + x) * 4;
        const r = img[pixelIndex] / 255;
        const g = img[pixelIndex + 1] / 255;
        const b = img[pixelIndex + 2] / 255;

        
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness > 0.5) {
          COLOR_BRIGHT.toArray(colors, idx * 3);
        } else {
          COLOR_DARK.toArray(colors, idx * 3);
        }

        
        const particlePos = new THREE.Vector3(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
        const mouse = new THREE.Vector3(
          pointerRef.current.x * 400,
          pointerRef.current.y * 300,
          0
        );
        const diff = new THREE.Vector3().subVectors(particlePos, mouse);
        const dist = diff.length();

        if (dist < 100) {
          const force = (100 - dist) / 100 * 5;
          velocities[idx * 3] += diff.x / dist * force;
          velocities[idx * 3 + 1] += diff.y / dist * force;
          COLOR_HOVER.toArray(colors, idx * 3);
        }

        if (mouseDownRef.current && dist < 150) {
          const animHue = (0.5 + Math.sin(time * 5)) % 1;
          const animColor = new THREE.Color().setHSL(animHue, 1, 0.5);
          animColor.toArray(colors, idx * 3);
        }

        
        velocities[idx * 3] *= 0.85;
        velocities[idx * 3 + 1] *= 0.85;
        positions[idx * 3] += velocities[idx * 3];
        positions[idx * 3 + 1] += velocities[idx * 3 + 1];

        
        sizes[idx] = (PARTICLE_SIZE * 2) + (100 - dist) / 10 * (dist < 100 ? 1 : 0);
        idx++;
      }
    }

    posAttr.needsUpdate = true;
    velAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    video.src = url;
    video.load();
    video.play();

    video.addEventListener('loadedmetadata', () => {
      initParticles(video.videoWidth, video.videoHeight);
    }, { once: true });
  };

  return (
    <div style={{ margin: 0, overflow: 'hidden', background: '#000', width: '100vw', height: '100vh' }}>
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 10
        }}
      />
      <video
        ref={videoRef}
        loop
        playsInline
        style={{ display: 'none' }}
      />
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Animation0;