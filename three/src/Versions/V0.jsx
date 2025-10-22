import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';



const GlobalStyles = () => (
  <style jsx global>{`
   
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
    @keyframes pulse {
      0%, 100% { 
        opacity: 1; 
        transform: translateX(-50%) scale(1);
      }
      50% { 
        opacity: 0.8; 
        transform: translateX(-50%) scale(1.05);
      }
    }

  `}</style>
);


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

const textFragmentShader = `
  uniform vec3 color;
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4( color * vColor, 1.0 );
    gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
  }
`;



function TextParticleEffect({ font, particleTexture, onClick }) {
  const pointsRef = useRef();
  const geometryCopyRef = useRef();
  const mouse = useRef({ x: -200, y: 200, isDown: false });
  const { size: viewportSize, camera } = useThree();

  const colorChange = useMemo(() => new THREE.Color(), []);
  const clickTime = useRef(0);


  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isSmallMobile = screenWidth < 480;

  const data = useMemo(() => {
    let textSize, amount, area;

    if (isSmallMobile) {
      textSize = 1.5;
      amount = 600;
      area = 150;
    } else if (isMobile) {
      textSize = 2.5;
      amount = 800;
      area = 200;
    } else if (isTablet) {
      textSize = 6;
      amount = 1200;
      area = 220;
    } else {
      textSize = 10;
      amount = 1500;
      area = 250;
    }

    return {
      text: isSmallMobile ? 'AWS was down\nClick to See WHY\nVolume Up' : 'AWS was down. Click to See WHY \n Volume Up',
      amount,
      particleSize: 1,
      textSize,
      area,
      ease: 0.05,
    };
  }, [isSmallMobile, isMobile, isTablet]);


  useEffect(() => {
    if (!font || !particleTexture) return;

    let thePoints = [];
    let shapes = font.generateShapes(data.text, data.textSize);
    let geometry = new THREE.ShapeGeometry(shapes);
    geometry.computeBoundingBox();
    const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    const yMid = (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2.85;
    geometry.center();

    let holeShapes = [];
    for (let q = 0; q < shapes.length; q++) {
      let shape = shapes[q];
      if (shape.holes && shape.holes.length > 0) {
        for (let j = 0; j < shape.holes.length; j++) {
          holeShapes.push(shape.holes[j]);
        }
      }
    }
    shapes.push.apply(shapes, holeShapes);

    let colors = [];
    let sizes = [];
    for (let x = 0; x < shapes.length; x++) {
      let shape = shapes[x];
      const amountPoints = shape.type === 'Path' ? data.amount / 2 : data.amount;
      let points = shape.getSpacedPoints(amountPoints);
      points.forEach((element) => {
        thePoints.push(new THREE.Vector3(element.x, element.y, 0));
        colors.push(colorChange.r, colorChange.g, colorChange.b);
        sizes.push(1);
      });
    }

    let geoParticles = new THREE.BufferGeometry().setFromPoints(thePoints);
    geoParticles.translate(xMid, yMid, 0);
    geoParticles.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geoParticles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    if (pointsRef.current) {
      pointsRef.current.geometry.dispose();
      pointsRef.current.geometry = geoParticles;

      geometryCopyRef.current = new THREE.BufferGeometry();
      geometryCopyRef.current.copy(geoParticles);
    }
  }, [font, particleTexture, data, colorChange]);


  useEffect(() => {
    const handleMouseMove = (event) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleTouchMove = (event) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        mouse.current.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      }
    };

    const handleClick = () => {
      mouse.current.isDown = true;
      clickTime.current = Date.now();
      setTimeout(() => {
        mouse.current.isDown = false;
      }, 300);
      onClick();
    };

    const handleMouseDown = () => {
      mouse.current.isDown = true;
      clickTime.current = Date.now();
    };

    const handleMouseUp = () => {
      mouse.current.isDown = false;
    };

    const handleTouchEnd = (event) => {
      event.preventDefault();
      mouse.current.isDown = true;
      clickTime.current = Date.now();
      setTimeout(() => {
        mouse.current.isDown = false;
      }, 300);
      onClick();
    };


    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);


    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClick]);


  useFrame((state) => {
    if (!pointsRef.current || !geometryCopyRef.current) return;

    const time = state.clock.getElapsedTime();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse.current, camera);


    const planeGeometry = new THREE.PlaneGeometry(
      visibleWidthAtZDepth(100, camera),
      visibleHeightAtZDepth(100, camera)
    );
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const planeArea = new THREE.Mesh(planeGeometry, planeMaterial);

    const intersects = raycaster.intersectObject(planeArea);

    if (intersects.length > 0) {
      const pos = pointsRef.current.geometry.attributes.position;
      const copy = geometryCopyRef.current.attributes.position;
      const colors = pointsRef.current.geometry.attributes.customColor;
      const size = pointsRef.current.geometry.attributes.size;

      const mx = intersects[0].point.x;
      const my = intersects[0].point.y;

      // Click effect timing
      const timeSinceClick = Date.now() - clickTime.current;
      const clickEffect = Math.max(0, 1 - timeSinceClick / 1000);

      for (let i = 0, l = pos.count; i < l; i++) {
        const initX = copy.getX(i);
        const initY = copy.getY(i);
        const initZ = copy.getZ(i);

        let px = pos.getX(i);
        let py = pos.getY(i);
        let pz = pos.getZ(i);

        // Base color with subtle animation
        const baseHue = 0.6 + Math.sin(time * 0.5 + i * 0.01) * 0.1;
        colorChange.setHSL(baseHue, 0.8, 0.9);
        colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
        size.array[i] = data.particleSize * (1 + Math.sin(time * 2 + i * 0.05) * 0.1);

        let dx = mx - px;
        let dy = my - py;
        const mouseDistance = distance(mx, my, px, py);

        // Enhanced hover effect
        if (mouseDistance < data.area) {
          const normalizedDistance = mouseDistance / data.area;
          const intensity = 1 - normalizedDistance;

          // Stronger repulsion force
          const f = -data.area * intensity * intensity * 2;
          const t = Math.atan2(dy, dx);

          // Create ripple effect
          const ripple = Math.sin(time * 8 - mouseDistance * 0.1) * intensity * 0.5;

          if (i % 3 === 0) {
            // Attract some particles
            px += Math.cos(t) * f * 0.3 + ripple;
            py += Math.sin(t) * f * 0.3 + ripple;

            // Bright cyan hover color
            colorChange.setHSL(0.5, 1.0, 0.8 + intensity * 0.2);
            colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
            size.array[i] = data.particleSize * (2 + intensity * 2);
          } else {
            // Repel other particles
            px -= Math.cos(t) * f * 0.1;
            py -= Math.sin(t) * f * 0.1;

            // Orange hover color
            colorChange.setHSL(0.1, 1.0, 0.7 + intensity * 0.3);
            colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
            size.array[i] = data.particleSize * (1.5 + intensity * 1.5);
          }

          // Add Z-axis movement for depth
          pz = initZ + Math.sin(time * 4 + i * 0.1) * intensity * 5;
        }

        // Realistic Black Hole with Accretion Disk
        if (mouse.current.isDown || clickEffect > 0) {
          const blackHoleRadius = data.area * 4;
          if (mouseDistance < blackHoleRadius) {
            const intensity = clickEffect * (1 - mouseDistance / blackHoleRadius);
            
            // Calculate angle to mouse (black hole center)
            const angleToCenter = Math.atan2(dy, dx);
            
            // Create flat accretion disk - particles move primarily in horizontal plane
            const diskHeight = Math.abs(dy); // Distance from horizontal plane
            const diskRadius = Math.abs(dx); // Distance from center horizontally
            
            // Only affect particles that are roughly in the disk plane
            const diskThickness = data.area * 0.6;
            const inDiskPlane = diskHeight < diskThickness;
            
            if (inDiskPlane) {
              // Orbital velocity for accretion disk (Keplerian motion)
              const orbitalSpeed = Math.sqrt(1 / Math.max(diskRadius, 1)) * intensity * 12;
              const orbitalAngle = Math.atan2(dy, dx) + Math.PI / 2; // Perpendicular to radius
              
              // Add orbital motion - stronger horizontal movement
              px += Math.cos(orbitalAngle) * orbitalSpeed;
              py += Math.sin(orbitalAngle) * orbitalSpeed * 0.2; // Much flatter disk
              
              // Gradual inward spiral
              const spiralForce = intensity * intensity * 6;
              px -= Math.cos(angleToCenter) * spiralForce;
              py -= Math.sin(angleToCenter) * spiralForce * 0.3; // Less vertical movement
              
              // Event horizon (dark center)
              const eventHorizonRadius = data.area * 0.25;
              if (mouseDistance < eventHorizonRadius) {
                // Complete darkness at event horizon
                colorChange.setHSL(0.0, 0.0, 0.0);
                colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
                size.array[i] = data.particleSize * 0.05;
                
                // Strong inward pull
                px -= Math.cos(angleToCenter) * intensity * 80;
                py -= Math.sin(angleToCenter) * intensity * 20;
              } else {
                // Accretion disk - temperature gradient from center outward
                const diskIntensity = 1 - (mouseDistance / blackHoleRadius);
                const temperature = diskIntensity * diskIntensity;
                
                // Yellow center to red outer ring
                let hue, saturation, lightness;
                if (temperature > 0.7) {
                  // Center - bright yellow
                  hue = 0.15; // Yellow hue
                  saturation = 1.0;
                  lightness = 0.9;
                } else if (temperature > 0.5) {
                  // Inner ring - yellow-orange
                  hue = 0.12; // Yellow-orange
                  saturation = 1.0;
                  lightness = 0.8;
                } else if (temperature > 0.3) {
                  // Middle ring - orange
                  hue = 0.08; // Orange
                  saturation = 1.0;
                  lightness = 0.7;
                } else if (temperature > 0.1) {
                  // Outer ring - orange-red
                  hue = 0.04; // Orange-red
                  saturation = 1.0;
                  lightness = 0.6;
                } else {
                  // Outermost ring - bright red
                  hue = 0.0; // Pure red
                  saturation = 1.0;
                  lightness = 0.5;
                }
                
                colorChange.setHSL(hue, saturation, lightness);
                colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
                size.array[i] = data.particleSize * (0.3 + temperature * 2.5);
              }
              
              // Gravitational lensing effect - bend light around black hole
              const lensingRadius = data.area * 1.2;
              if (mouseDistance < lensingRadius && mouseDistance > eventHorizonRadius) {
                const lensingStrength = (lensingRadius - mouseDistance) / lensingRadius;
                const bendAngle = lensingStrength * 0.8;
                
                // Bend particle path around the black hole
                px += Math.cos(angleToCenter + bendAngle) * lensingStrength * 8;
                py += Math.sin(angleToCenter + bendAngle) * lensingStrength * 3;
              }
            } else {
              // Particles outside disk plane - create the "shadow" effect
              if (mouseDistance < data.area * 1.5) {
                // Dim particles that are behind the black hole
                const shadowIntensity = 1 - (mouseDistance / (data.area * 1.5));
                colorChange.setHSL(0.0, 0.0, 0.1 * shadowIntensity);
                colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
                size.array[i] = data.particleSize * (0.1 + shadowIntensity * 0.2);
                
                // Minimal gravitational effect
                const weakPull = intensity * 1;
                px -= Math.cos(angleToCenter) * weakPull;
                py -= Math.sin(angleToCenter) * weakPull;
              }
            }
          }
        }

        colors.needsUpdate = true;
        size.needsUpdate = true;

        // Enhanced return animation with bounce
        const returnSpeed = data.ease * (1 + Math.abs(px - initX) * 0.01);
        px += (initX - px) * returnSpeed;
        py += (initY - py) * returnSpeed;
        pz += (initZ - pz) * returnSpeed * 2;

        pos.setXYZ(i, px, py, pz);
        pos.needsUpdate = true;
      }
    }
  });

  const visibleHeightAtZDepth = (depth, camera) => {
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;
    const vFOV = (camera.fov * Math.PI) / 180;
    return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
  };

  const visibleWidthAtZDepth = (depth, camera) => {
    const height = visibleHeightAtZDepth(depth, camera);
    return height * camera.aspect;
  };

  const distance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  };

  if (!font || !particleTexture) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <shaderMaterial
        uniforms={{
          color: { value: new THREE.Color(0xffffff) },
          pointTexture: { value: particleTexture },
        }}
        vertexShader={vertexShader}
        fragmentShader={textFragmentShader}
        blending={THREE.AdditiveBlending}
        depthTest={false}
        transparent={true}
      />
    </points>
  );
}

function VideoParticleEffect({ videoRef, videoSize }) {
  const pointsRef = useRef();
  const mouse = useRef({ x: -9999, y: -9999, isDown: false });
  const { size: viewportSize } = useThree();


  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isSmallMobile = screenWidth < 480;

  const PARTICLE_SIZE = isMobile ? 2 : 3;
  const DENSITY = isSmallMobile ? 3 : isMobile ? 2.5 : 2;


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


    let scale;
    if (isSmallMobile) {
      scale = 0.15;
    } else if (isMobile) {
      scale = 0.18;
    } else if (isTablet) {
      scale = 0.2;
    } else {
      scale = 0.25;
    }
    const halfW = cols / 2;
    const halfH = rows / 2;
    let i = 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        positions[i * 3 + 0] = (x - halfW) * PARTICLE_SIZE * scale;
        positions[i * 3 + 1] = (halfH - y) * PARTICLE_SIZE * scale;
        positions[i * 3 + 2] = 0;
        sizes[i] = PARTICLE_SIZE;
        initialColor.toArray(colors, i * 3);
        i++;
      }
    }

    const data = { particleCount, positions, velocities, sizes, colors, rows, cols };
    return [data, Date.now()];
  }, [videoSize, sampler, ctx]);


  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mouse.current.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      }
    };

    const handleMouseLeave = () => { mouse.current.x = -9999; mouse.current.y = -9999; };
    const handleMouseDown = () => { mouse.current.isDown = true; };
    const handleMouseUp = () => { mouse.current.isDown = false; };

    const handleTouchStart = () => { mouse.current.isDown = true; };
    const handleTouchEnd = () => { mouse.current.isDown = false; };


    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);


    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);


  useFrame((state, delta) => {
    const video = videoRef.current;
    if (!pointsRef.current || !video || video.paused || video.readyState < 2) return;

    ctx.drawImage(video, 0, 0, particleData.cols, particleData.rows);
    const imgData = ctx.getImageData(0, 0, particleData.cols, particleData.rows).data;

    const positions = pointsRef.current.geometry.attributes.position.array;
    const velocities = pointsRef.current.geometry.attributes.velocity.array;
    const sizes = pointsRef.current.geometry.attributes.size.array;
    const colors = pointsRef.current.geometry.attributes.customColor.array;


    const mouseScale = isMobile ? 30 : 50;
    const worldMouse = new THREE.Vector3(
      mouse.current.x * mouseScale,
      mouse.current.y * mouseScale,
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


      const hoverDistance = isMobile ? 12 : 15;
      const clickDistance = isMobile ? 18 : 25;
      const force = isMobile ? 0.8 : 1.2;

      if (dist < hoverDistance) {
        const intensity = 1 - (dist / hoverDistance);
        const forceAmount = intensity * intensity * force;

        // Enhanced repulsion with rotation
        const angle = Math.atan2(diff.y, diff.x) + Math.sin(time * 3) * 0.5;
        velocities[i3] += Math.cos(angle) * forceAmount;
        velocities[i3 + 1] += Math.sin(angle) * forceAmount;

        // Dynamic hover colors
        const hoverHue = (0.15 + Math.sin(time * 2 + i * 0.01) * 0.1) % 1;
        animColor.setHSL(hoverHue, 1.0, 0.6 + intensity * 0.4);
        animColor.toArray(colors, i3);

        // Dramatic size increase
        sizes[i] = PARTICLE_SIZE * (1 + intensity * 3);
      }

      if (mouse.current.isDown && dist < clickDistance) {
        const intensity = 1 - (dist / clickDistance);
        
        // Realistic accretion disk physics
        const angleToCenter = Math.atan2(-diff.y, -diff.x);
        const diskHeight = Math.abs(diff.y);
        const diskRadius = Math.abs(diff.x);
        
        // Check if particle is in the accretion disk plane
        const diskThickness = clickDistance * 0.4;
        const inDiskPlane = diskHeight < diskThickness;
        
        if (inDiskPlane) {
          // Keplerian orbital motion
          const orbitalSpeed = Math.sqrt(1 / Math.max(diskRadius, 1)) * intensity * 6;
          const orbitalAngle = angleToCenter + Math.PI / 2;
          
          // Add orbital velocity
          velocities[i3] += Math.cos(orbitalAngle) * orbitalSpeed;
          velocities[i3 + 1] += Math.sin(orbitalAngle) * orbitalSpeed * 0.25; // Flatten disk
          
          // Inward spiral
          const spiralForce = intensity * intensity * 4;
          velocities[i3] += Math.cos(angleToCenter) * spiralForce;
          velocities[i3 + 1] += Math.sin(angleToCenter) * spiralForce * 0.3;
          
          // Event horizon
          const eventHorizonDistance = clickDistance * 0.2;
          if (dist < eventHorizonDistance) {
            // Complete darkness
            animColor.setHSL(0.0, 0.0, 0.0);
            animColor.toArray(colors, i3);
            sizes[i] = PARTICLE_SIZE * 0.1;
            
            // Extreme pull
            velocities[i3] += Math.cos(angleToCenter) * intensity * 25;
            velocities[i3 + 1] += Math.sin(angleToCenter) * intensity * 8;
          } else {
            // Temperature-based coloring
            const temperature = intensity * intensity;
            
            let hue, saturation, lightness;
            if (temperature > 0.8) {
              // White hot
              hue = 0.15;
              saturation = 0.2;
              lightness = 0.95;
            } else if (temperature > 0.5) {
              // Yellow hot
              hue = 0.08;
              saturation = 0.9;
              lightness = 0.8;
            } else if (temperature > 0.2) {
              // Orange
              hue = 0.05;
              saturation = 1.0;
              lightness = 0.6;
            } else {
              // Red
              hue = 0.0;
              saturation = 1.0;
              lightness = 0.4;
            }
            
            animColor.setHSL(hue, saturation, lightness);
            animColor.toArray(colors, i3);
            sizes[i] = PARTICLE_SIZE * (0.5 + temperature * 3);
          }
          
          // Gravitational lensing
          const lensingRadius = clickDistance * 0.8;
          if (dist < lensingRadius && dist > eventHorizonDistance) {
            const lensingStrength = (lensingRadius - dist) / lensingRadius;
            const bendAngle = lensingStrength * 0.6;
            
            velocities[i3] += Math.cos(angleToCenter + bendAngle) * lensingStrength * 3;
            velocities[i3 + 1] += Math.sin(angleToCenter + bendAngle) * lensingStrength * 1;
          }
        } else {
          // Outside disk plane - shadow effect
          if (dist < clickDistance * 0.7) {
            const shadowIntensity = 1 - (dist / (clickDistance * 0.7));
            animColor.setHSL(0.0, 0.0, 0.1 * shadowIntensity);
            animColor.toArray(colors, i3);
            sizes[i] = PARTICLE_SIZE * (0.2 + shadowIntensity * 0.3);
          }
        }
      }

      velocities[i3] *= 0.85;
      velocities[i3 + 1] *= 0.85;
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];

      sizes[i] = PARTICLE_SIZE + (hoverDistance - dist) / hoverDistance * (dist < hoverDistance ? 1 : 0);
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


export default function Animation0() {
  const videoRef = useRef();
  const fileInputRef = useRef();
  const [videoSize, setVideoSize] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [font, setFont] = useState(null);
  const [particleTexture, setParticleTexture] = useState(null);
  const [isCustomVideo, setIsCustomVideo] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);


  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 768;
  const isSmallMobile = screenWidth < 480;

  useEffect(() => {

    const fontLoader = new FontLoader();
    const textureLoader = new THREE.TextureLoader();

    const particle = textureLoader.load('https://res.cloudinary.com/dfvtkoboz/image/upload/v1605013866/particle_a64uzf.png');
    setParticleTexture(particle);

    fontLoader.load(
      'https://res.cloudinary.com/dydre7amr/raw/upload/v1612950355/font_zsd4dr.json',
      (loadedFont) => {
        setFont(loadedFont);
      },
      undefined,
      (err) => console.log('An error happened during font loading', err)
    );


    loadVideo('/assets/rickroll.mp4');
  }, []);

  const loadVideo = (src) => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log('Video loaded:', video.videoWidth, 'x', video.videoHeight);
      setVideoSize({ w: video.videoWidth, h: video.videoHeight });
      setVideoLoaded(true);
    };

    const handleError = (e) => {
      console.error('Video error:', e);
    };


    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    video.removeEventListener('error', handleError);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    video.src = src;
    video.load();
  };

  const handleStartClick = async () => {
    if (!videoLoaded) return;

    const video = videoRef.current;
    setShowStartScreen(false);

    try {

      if (video.readyState >= 2) {
        await video.play();
        console.log('Video started playing successfully');
      } else {

        video.addEventListener('canplay', async () => {
          try {
            await video.play();
            console.log('Video started playing after canplay event');
          } catch (err) {
            console.error('Play failed after canplay:', err);

            video.muted = true;
            await video.play();
            console.log('Video started playing muted as fallback');
          }
        }, { once: true });
      }
    } catch (err) {
      console.error('Play failed:', err);
      try {

        video.muted = true;
        await video.play();
        console.log('Video started playing muted as fallback');
      } catch (mutedErr) {
        console.error('Even muted playback failed:', mutedErr);
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;


    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM, etc.)');
      return;
    }


    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }


    const url = URL.createObjectURL(file);
    setCurrentVideoUrl(url);
    setIsCustomVideo(true);


    loadVideo(url);
    setShowStartScreen(false);


    setTimeout(async () => {
      const video = videoRef.current;
      if (video) {
        try {
          await video.play();
          console.log('Custom video started playing');
        } catch (err) {
          console.error('Custom video play failed:', err);

          try {
            video.muted = true;
            await video.play();
            console.log('Custom video started playing muted');
          } catch (mutedErr) {
            console.error('Even muted custom video failed:', mutedErr);
          }
        }
      }
    }, 100);
  };

  const resetToRickroll = () => {

    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      setCurrentVideoUrl(null);
    }

    setIsCustomVideo(false);
    setShowStartScreen(true);
    loadVideo('/assets/rickroll.mp4');


    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="animation-container">
      <GlobalStyles />

      {/* Video Upload Controls */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '10px' : '20px',
        right: isMobile ? '10px' : '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '8px' : '10px'
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: isMobile ? '6px 8px' : '8px 12px',
            fontSize: isMobile ? '10px' : '12px',
            fontFamily: 'Arial, sans-serif',
            cursor: 'pointer',
            width: isSmallMobile ? '120px' : 'auto'
          }}
        />

        {isCustomVideo && (
          <button
            onClick={resetToRickroll}
            style={{
              backgroundColor: 'rgba(255, 69, 0, 0.9)',
              color: 'white',
              border: '1px solid #ff4500',
              borderRadius: '4px',
              padding: isMobile ? '6px 8px' : '8px 12px',
              fontSize: isMobile ? '10px' : '12px',
              fontFamily: 'Arial, sans-serif',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: isSmallMobile ? '120px' : 'auto'
            }}
          >
            {isSmallMobile ? 'Reset' : 'Reset to Rickroll'}
          </button>
        )}
      </div>

      {/* Warning Message */}
      {!showStartScreen && (
        <div style={{
          position: 'absolute',
          bottom: isMobile ? '10px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: isCustomVideo ? 'rgba(0, 100, 255, 0.9)' : 'rgba(255, 69, 0, 0.9)',
          color: 'white',
          padding: isMobile ? '10px 15px' : '15px 25px',
          borderRadius: isMobile ? '8px' : '12px',
          border: isCustomVideo ? '2px solid #0064ff' : '2px solid #ff4500',
          fontSize: isSmallMobile ? '12px' : isMobile ? '14px' : '16px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          boxShadow: isCustomVideo ? '0 4px 20px rgba(0, 100, 255, 0.5)' : '0 4px 20px rgba(255, 69, 0, 0.5)',
          animation: 'pulse 2s infinite',
          maxWidth: isMobile ? '95vw' : '90vw',
          margin: isMobile ? '0 10px' : '0'
        }}>
          {isCustomVideo
            ? (isSmallMobile ? '🎬 Custom video playing!' : '🎬 Your custom video is now playing as particles!')
            : (isSmallMobile ? '🚨 GET RICKROLLED! 🎵' : '🚨 Don\'t trust links or messages... GET RICKROLLED! 🎵')
          }
        </div>
      )}

      <video
        id="video"
        ref={videoRef}
        loop
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      <Canvas
        camera={{ fov: 65, near: 1, far: 10000, position: [0, 0, 100] }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        {showStartScreen && font && particleTexture && (
          <TextParticleEffect
            font={font}
            particleTexture={particleTexture}
            onClick={handleStartClick}
          />
        )}
        {videoSize && !showStartScreen && (
          <VideoParticleEffect videoRef={videoRef} videoSize={videoSize} />
        )}
      </Canvas>
    </div>
  );
}
