import React, { useEffect, useRef } from 'react';
import './AeroLeague.css';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const Animation4 = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountPoint = mountRef.current;
    let isMounted = true;
    let env;

    const vertexShader = `
      attribute float size;
      attribute vec3 customColor;
      varying vec3 vColor;
      void main() {
        vColor = customColor;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 300.0 / -mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform vec3 color;
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4( color * vColor, 1.0 );
        gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
      }
    `;

    class Environment {
      constructor(font, particle, container) {
        this.font = font;
        this.particle = particle;
        this.container = container;
        this.scene = new THREE.Scene();
        this.renderer = null;
        this.camera = null;
        this.createParticles = null;
        this.boundOnWindowResize = this.onWindowResize.bind(this);
        
        this.createCamera();
        this.createRenderer();
        this.setup();
        this.bindEvents();
      }

      bindEvents() {
        window.addEventListener('resize', this.boundOnWindowResize);
      }

      setup() {
        this.createParticles = new CreateParticles(
          this.scene,
          this.font,
          this.particle,
          this.camera,
          this.renderer,
          this.container
        );
      }

      render() {
        if (this.createParticles) this.createParticles.render();
        if (this.renderer) this.renderer.render(this.scene, this.camera);
      }

      createCamera() {
        this.camera = new THREE.PerspectiveCamera(
          65,
          this.container.clientWidth / this.container.clientHeight,
          1,
          10000
        );
        this.camera.position.set(0, 0, 100);
      }

      createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(
          this.container.clientWidth,
          this.container.clientHeight
        );
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(() => {
          this.render();
        });
      }

      onWindowResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        this.camera.aspect =
          this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(
          this.container.clientWidth,
          this.container.clientHeight
        );
        if (this.createParticles) {
          this.createParticles.destroy();
          this.setup();
        }
      }
      
      destroy() {
        if (this.renderer) this.renderer.setAnimationLoop(null);
        if (this.createParticles) this.createParticles.destroy();
        window.removeEventListener('resize', this.boundOnWindowResize);
        if (this.renderer && this.renderer.domElement.parentNode === this.container) {
          this.container.removeChild(this.renderer.domElement);
        }
        if (this.renderer) this.renderer.dispose();
        this.scene.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        this.scene.clear();
      }
    }

    class CreateParticles {
      constructor(scene, font, particleImg, camera, renderer, container) {
        this.scene = scene;
        this.font = font;
        this.particleImg = particleImg;
        this.camera = camera;
        this.renderer = renderer;
        this.container = container;
        this.particles = null;
        this.geometryCopy = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-200, 200);
        this.colorChange = new THREE.Color();

        // **FIXED:** `buttom` renamed to `button` for clarity
        this.button = false; 

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isScrolling = false;
        this.touchMoveThreshold = 10;

        const isMobile = window.innerWidth < 768;
        this.data = {
          text: isMobile ? '  \n   67' : ' \n   67',
          amount: isMobile ? 800 : 1500,
          particleSize: 1,
          particleColor: 0xffffff,
          textSize: isMobile ? 7 : 12,
          area: 250,
          ease: 0.05,
        };

        this.setup();
        this.bindEvents();
      }

      destroy() {
        if (this.particles) {
          this.scene.remove(this.particles);
          this.particles.geometry.dispose();
          this.particles.material.dispose();
        }
      }

      setup() {
        const geometry = new THREE.PlaneGeometry(
          this.visibleWidthAtZDepth(100, this.camera),
          this.visibleHeightAtZDepth(100, this.camera)
        );
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true });
        this.planeArea = new THREE.Mesh(geometry, material);
        this.planeArea.visible = false;
        this.scene.add(this.planeArea);
        this.createText();
      }

      bindEvents() {
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.container.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
        this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.onTouchEnd.bind(this));
      }
      
      onMouseDown(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.button = true; 
        // **REMOVED:** No longer changing ease on click for a smoother return animation
      }
      
      onMouseUp() {
        this.button = false;
        // **REMOVED:** No longer changing ease on click
      }

      onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }
      
      onTouchStart(event) {
        if (event.touches.length > 0) {
          const touch = event.touches[0];
          this.touchStartX = touch.clientX;
          this.touchStartY = touch.clientY;
          this.isScrolling = false;
          this.onMouseDown(touch);
        }
      }

      onTouchMove(event) {
        if (event.touches.length > 0) {
          const touch = event.touches[0];
          const deltaX = touch.clientX - this.touchStartX;
          const deltaY = touch.clientY - this.touchStartY;

          if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.touchMoveThreshold) {
            this.isScrolling = true;
            this.onMouseUp();
            return;
          }
          if (!this.isScrolling) {
            event.preventDefault();
            this.onMouseMove(touch);
          }
        }
      }

      onTouchEnd() {
        this.isScrolling = false;
        this.onMouseUp();
      }

      render() {
        if (!this.particles || !this.geometryCopy) return;

        const time = ((0.001 * performance.now()) % 12) / 12;
        const zigzagTime = (1 + Math.sin(time * 2 * Math.PI)) / 6;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.planeArea);

        if (intersects.length > 0) {
          const pos = this.particles.geometry.attributes.position;
          const copy = this.geometryCopy.attributes.position;
          const coulors = this.particles.geometry.attributes.customColor;
          const size = this.particles.geometry.attributes.size;

          const mx = intersects[0].point.x;
          const my = intersects[0].point.y;

          for (var i = 0, l = pos.count; i < l; i++) {
            const initX = copy.getX(i);
            const initY = copy.getY(i);
            const initZ = copy.getZ(i);

            let px = pos.getX(i);
            let py = pos.getY(i);
            let pz = pos.getZ(i);

            this.colorChange.setHSL(0.5, 1, 1);
            coulors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
            coulors.needsUpdate = true;
            size.array[i] = this.data.particleSize;
            size.needsUpdate = true;

            let dx = mx - px;
            let dy = my - py;
            const mouseDistance = this.distance(mx, my, px, py);
            let d = dx * dx + dy * dy;
            // Prevent division by zero
            if (d === 0) d = 0.001; 
            const f = -this.data.area / d;
            
            // =================================================================
            // START OF MODIFIED LOGIC
            // =================================================================
            if (this.button) {
              // The new vortex/swirl effect on click
              if (mouseDistance < this.data.area) {
                const angle = Math.atan2(dy, dx);
                
                // Tangential force for the swirl
                px += f * Math.cos(angle + Math.PI / 2) * 0.8; // Strength of swirl
                py += f * Math.sin(angle + Math.PI / 2) * 0.8;
                
                // A bit of repulsion to push particles out
                px += f * Math.cos(angle) * 0.1;
                py += f * Math.sin(angle) * 0.1;

                this.colorChange.setHSL(0.6 + zigzagTime, 1.0, 0.5);
                coulors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
              }
            } else {
              // The original hover effect
              if (mouseDistance < this.data.area) {
                if (i % 5 === 0) {
                  const t = Math.atan2(dy, dx);
                  px -= 0.03 * Math.cos(t);
                  py -= 0.03 * Math.sin(t);
                  this.colorChange.setHSL(0.15, 1.0, 0.5);
                  coulors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                  size.array[i] = this.data.particleSize / 1.2;
                } else {
                  const t = Math.atan2(dy, dx);
                  px += f * Math.cos(t);
                  py += f * Math.sin(t);
                  pos.setXYZ(i, px, py, pz);
                  size.array[i] = this.data.particleSize * 1.3;
                }
                if (px > initX + 10 || px < initX - 10 || py > initY + 10 || py < initY - 10) {
                  this.colorChange.setHSL(0.15, 1.0, 0.5);
                  coulors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                  size.array[i] = this.data.particleSize / 1.8;
                }
              }
            }
            // =================================================================
            // END OF MODIFIED LOGIC
            // =================================================================

            px += (initX - px) * this.data.ease;
            py += (initY - py) * this.data.ease;
            pz += (initZ - pz) * this.data.ease;
            
            pos.setXYZ(i, px, py, pz);
            pos.needsUpdate = true;
            coulors.needsUpdate = true;
            size.needsUpdate = true;
          }
        }
      }

      createText() {
        let thePoints = [];
        let shapes = this.font.generateShapes(this.data.text, this.data.textSize);
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
          const amountPoints = shape.type === 'Path' ? this.data.amount / 2 : this.data.amount;
          let points = shape.getSpacedPoints(amountPoints);
          points.forEach((element) => {
            thePoints.push(new THREE.Vector3(element.x, element.y, 0));
            colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b);
            sizes.push(1);
          });
        }
        let geoParticles = new THREE.BufferGeometry().setFromPoints(thePoints);
        geoParticles.translate(xMid, yMid, 0);
        geoParticles.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
        geoParticles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        const material = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            pointTexture: { value: this.particleImg },
          },
          vertexShader,
          fragmentShader,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          transparent: true,
        });
        this.particles = new THREE.Points(geoParticles, material);
        this.scene.add(this.particles);
        this.geometryCopy = new THREE.BufferGeometry();
        this.geometryCopy.copy(this.particles.geometry);
      }

      visibleHeightAtZDepth(depth, camera) {
        const cameraOffset = camera.position.z;
        if (depth < cameraOffset) depth -= cameraOffset;
        else depth += cameraOffset;
        const vFOV = (camera.fov * Math.PI) / 180;
        return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
      }

      visibleWidthAtZDepth(depth, camera) {
        const height = this.visibleHeightAtZDepth(depth, camera);
        return height * camera.aspect;
      }

      distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
      }
    }

    const fontLoader = new FontLoader();
    const textureLoader = new THREE.TextureLoader();
    const particle = textureLoader.load('https://res.cloudinary.com/dfvtkoboz/image/upload/v1605013866/particle_a64uzf.png');

    fontLoader.load(
      'https://res.cloudinary.com/dydre7amr/raw/upload/v1612950355/font_zsd4dr.json',
      (loadedFont) => {
        if (isMounted && mountPoint) {
          env = new Environment(loadedFont, particle, mountPoint);
        }
      },
      undefined,
      (err) => console.log('An error happened during font loading', err)
    );

    return () => {
      isMounted = false;
      if (env) {
        env.destroy();
      }
    };
  }, []);

  return (
    <>
      <section className="team-section">
        <section className="animation-section" ref={mountRef}>
          {/* Three.js canvas will be appended here */}
        </section>
      </section>
    </>
  );
};

export default Animation4;