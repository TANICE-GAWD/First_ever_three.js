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
  const mouse = useRef({ x: -200, y: 200 });
  const { size: viewportSize, camera } = useThree();

  const colorChange = useMemo(() => new THREE.Color(), []);

  const isMobile = window.innerWidth < 768;
  const data = useMemo(() => ({
    text: 'AWS was down. Click to See WHY',
    amount: isMobile ? 800 : 1500,
    particleSize: 1,
    textSize: isMobile ? 2 : 10,
    area: 250,
    ease: 0.05,
  }), [isMobile]);

  // Create text particles
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

  // Mouse events
  useEffect(() => {
    const handleMouseMove = (event) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleClick = () => {
      onClick();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [onClick]);

  // Animation loop
  useFrame(() => {
    if (!pointsRef.current || !geometryCopyRef.current) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse.current, camera);

    // Create invisible plane for raycasting
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

      for (let i = 0, l = pos.count; i < l; i++) {
        const initX = copy.getX(i);
        const initY = copy.getY(i);
        const initZ = copy.getZ(i);

        let px = pos.getX(i);
        let py = pos.getY(i);
        let pz = pos.getZ(i);

        // Set default color and size
        colorChange.setHSL(0.5, 1, 1);
        colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
        size.array[i] = data.particleSize;

        let dx = mx - px;
        let dy = my - py;
        const mouseDistance = distance(mx, my, px, py);

        // Hover effect
        if (mouseDistance < data.area) {
          const f = -data.area / (dx * dx + dy * dy);

          if (i % 5 === 0) {
            const t = Math.atan2(dy, dx);
            px -= 0.03 * Math.cos(t);
            py -= 0.03 * Math.sin(t);
            colorChange.setHSL(0.15, 1.0, 0.5);
            colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
            size.array[i] = data.particleSize / 1.2;
          } else {
            const t = Math.atan2(dy, dx);
            px += f * Math.cos(t);
            py += f * Math.sin(t);
            pos.setXYZ(i, px, py, pz);
            size.array[i] = data.particleSize * 1.3;
          }
          if (px > initX + 10 || px < initX - 10 || py > initY + 10 || py < initY - 10) {
            colorChange.setHSL(0.15, 1.0, 0.5);
            colors.setXYZ(i, colorChange.r, colorChange.g, colorChange.b);
            size.array[i] = data.particleSize / 1.8;
          }
        }

        colors.needsUpdate = true;
        size.needsUpdate = true;

        // Return to original position
        px += (initX - px) * data.ease;
        py += (initY - py) * data.ease;
        pz += (initZ - pz) * data.ease;
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

  const PARTICLE_SIZE = 3;
  const DENSITY = 2;

  const pointsRef = useRef();
  const mouse = useRef({ x: -9999, y: -9999, isDown: false });
  const { size: viewportSize } = useThree();


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

    // Scale down the particles to fit the screen better
    const scale = 0.2; // Reduce particle spread
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
      mouse.current.x * 50, // Scale down mouse interaction area
      mouse.current.y * 50,
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

      if (dist < 10) { // Reduce interaction distance
        const force = (10 - dist) / 10 * 0.5; // Reduce force
        velocities[i3] += diff.x / dist * force;
        velocities[i3 + 1] += diff.y / dist * force;
        COLOR_HOVER.toArray(colors, i3);
      }

      if (mouse.current.isDown && dist < 15) { // Reduce click interaction distance
        const animHue = (0.5 + Math.sin(time * 5)) % 1;
        animColor.setHSL(animHue, 1, 0.5);
        animColor.toArray(colors, i3);
      }

      velocities[i3] *= 0.85;
      velocities[i3 + 1] *= 0.85;
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];

      sizes[i] = PARTICLE_SIZE + (10 - dist) / 10 * (dist < 10 ? 1 : 0);
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
  const [videoSize, setVideoSize] = useState(null);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [font, setFont] = useState(null);
  const [particleTexture, setParticleTexture] = useState(null);

  useEffect(() => {
    // Load font and particle texture
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

    // Load video
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

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    video.src = '/assets/rickroll.mp4';
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const handleStartClick = () => {
    if (!videoLoaded) return;

    const video = videoRef.current;
    setShowStartScreen(false);

    // Start playing the video
    video.play().catch(err => console.error('Play failed:', err));
  };

  return (
    <div className="animation-container">
      <GlobalStyles />

      {/* Rickroll Warning Message */}
      {!showStartScreen && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 69, 0, 0.9)',
          color: 'white',
          padding: '15px 25px',
          borderRadius: '12px',
          border: '2px solid #ff4500',
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(255, 69, 0, 0.5)',
          animation: 'pulse 2s infinite',
          maxWidth: '90vw'
        }}>
          ⚠️ Don't trust links or messages... GET RICKROLLED! 
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
