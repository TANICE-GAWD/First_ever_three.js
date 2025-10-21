import React, { useEffect, useRef } from 'react';
import './AeroLeague.css';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const Animation7 = () => {
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

                // *** NEW: State management for the launch sequence ***
                this.isCharging = false;
                this.chargePoint = new THREE.Vector3();
                this.chargeStartTime = 0;
                this.launches = []; // Manages multiple drone launches

                const isMobile = window.innerWidth < 768;
                this.data = {
                    text: isMobile ? '  \n   67' : ' \n   67',
                    amount: isMobile ? 800 : 1500,
                    particleSize: 1.0,
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
                this.container.addEventListener('mousedown', this.onPointerDown.bind(this));
                this.container.addEventListener('mousemove', this.onPointerMove.bind(this));
                this.container.addEventListener('mouseup', this.onPointerUp.bind(this));
                this.container.addEventListener('mouseleave', this.onPointerUp.bind(this));
                this.container.addEventListener('touchstart', this.onPointerDown.bind(this), { passive: true });
                this.container.addEventListener('touchmove', this.onPointerMove.bind(this), { passive: false });
                this.container.addEventListener('touchend', this.onPointerUp.bind(this));
            }
            
            // *** NEW: Event handlers for the charge & launch sequence ***
            onPointerDown(event) {
                const pointer = event.touches ? event.touches[0] : event;
                const rect = this.container.getBoundingClientRect();
                this.mouse.x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1;
                
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.planeArea);
                if (intersects.length > 0) {
                    this.isCharging = true;
                    this.chargePoint.copy(intersects[0].point);
                    this.chargeStartTime = Date.now();
                }
            }

            onPointerMove(event) {
                const pointer = event.touches ? event.touches[0] : event;
                const rect = this.container.getBoundingClientRect();
                this.mouse.x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1;

                // If charging, update the charge point to follow the cursor
                if (this.isCharging) {
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const intersects = this.raycaster.intersectObject(this.planeArea);
                    if (intersects.length > 0) {
                        this.chargePoint.copy(intersects[0].point);
                    }
                }
            }

            onPointerUp() {
                if (this.isCharging) {
                    this.isCharging = false;
                    // Create a new launch event
                    this.launches.push({
                        point: this.chargePoint.clone(),
                        startTime: Date.now(),
                        chargeDuration: Date.now() - this.chargeStartTime,
                    });
                }
            }

            render() {
                if (!this.particles || !this.geometryCopy) return;

                const pos = this.particles.geometry.attributes.position;
                const copy = this.geometryCopy.attributes.position;
                const colors = this.particles.geometry.attributes.customColor;
                const sizes = this.particles.geometry.attributes.size;

                // Handle the "Power On" (charging) effect
                if (this.isCharging) {
                    const chargeRadius = 20;
                    const chargeTime = (Date.now() - this.chargeStartTime) / 1000; // in seconds
                    for (let i = 0; i < pos.count; i++) {
                        const dist = this.distance(this.chargePoint.x, this.chargePoint.y, pos.getX(i), pos.getY(i));
                        if (dist < chargeRadius) {
                            const pullFactor = (1 - dist / chargeRadius);
                            pos.setX(i, pos.getX(i) + (this.chargePoint.x - pos.getX(i)) * pullFactor * 0.1);
                            pos.setY(i, pos.getY(i) + (this.chargePoint.y - pos.getY(i)) * pullFactor * 0.1);
                            
                            // Tremble and glow effect
                            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * pullFactor * 2.0);
                            sizes.setX(i, this.data.particleSize + pullFactor * 2.0);
                            this.colorChange.setHSL(0.55, 1.0, 0.5 + pullFactor * 0.5); // From green to white-hot cyan
                            colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                        }
                    }
                }

                // Handle the "Ignition Wave" and "Micro-Drone Launch" effects
                this.launches.forEach(launch => {
                    const elapsed = Date.now() - launch.startTime;
                    const ignitionRadius = (elapsed / 300) * 100; // Wave expands over 300ms
                    const droneLaunchDuration = 1000;

                    for (let i = 0; i < pos.count; i++) {
                        const distFromLaunch = this.distance(launch.point.x, launch.point.y, pos.getX(i), pos.getY(i));
                        
                        // Ignition Wave
                        if (elapsed < 500 && distFromLaunch > ignitionRadius - 10 && distFromLaunch < ignitionRadius + 10) {
                            const angle = Math.atan2(pos.getY(i) - launch.point.y, pos.getX(i) - launch.point.x);
                            pos.setX(i, pos.getX(i) + Math.cos(angle) * 10);
                            pos.setY(i, pos.getY(i) + Math.sin(angle) * 10);
                            this.colorChange.setHSL(0.55, 1.0, 0.8);
                            colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                        }

                        // Micro-Drone Launch
                        if (elapsed < droneLaunchDuration && distFromLaunch < 10) {
                            const launchProgress = elapsed / droneLaunchDuration;
                            // Push the particle towards the screen (Z) and away from the center
                            pos.setZ(i, pos.getZ(i) + launchProgress * 15.0);
                            pos.setX(i, pos.getX(i) + (pos.getX(i) - launch.point.x) * launchProgress * 0.5);
                            pos.setY(i, pos.getY(i) + (pos.getY(i) - launch.point.y) * launchProgress * 0.5);

                            sizes.setX(i, this.data.particleSize * (1 - launchProgress) * 3.0); // Shrinks as it flies
                            this.colorChange.setHSL(0.6, 1.0, 0.8); // Bright blue trail
                            colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                        }
                    }
                });

                // Clean up old launches
                this.launches = this.launches.filter(l => (Date.now() - l.startTime) < 1000);

                // Default state and easing back
                for (let i = 0; i < pos.count; i++) {
                    const initX = copy.getX(i);
                    const initY = copy.getY(i);
                    const initZ = copy.getZ(i);

                    let px = pos.getX(i);
                    let py = pos.getY(i);
                    let pz = pos.getZ(i);
                    
                    // Reset particles that are not being actively animated
                    if (!this.isCharging) {
                       px += (initX - px) * this.data.ease;
                       py += (initY - py) * this.data.ease;
                       pz += (initZ - pz) * this.data.ease;
                       pos.setXYZ(i, px, py, pz);

                       sizes.setX(i, this.data.particleSize);
                       this.colorChange.setHSL(0.4, 1.0, 0.5); // Default techy green
                       colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                    }
                }

                pos.needsUpdate = true;
                colors.needsUpdate = true;
                sizes.needsUpdate = true;
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
                        for (let j = 0; j < shape.holes.length; j++) holeShapes.push(shape.holes[j]);
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
                
                this.geometryCopy = new THREE.BufferGeometry();
                this.geometryCopy.copy(geoParticles);
                
                const positions = geoParticles.attributes.position;
                for (let i = 0; i < positions.count; i++) {
                    positions.setXYZ(i, (Math.random() - 0.5) * 400, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
                }

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
            }

            visibleWidthAtZDepth(depth, camera) {
                const height = this.visibleHeightAtZDepth(depth, camera);
                return height * camera.aspect;
            }

             visibleHeightAtZDepth(depth, camera) {
                const cameraOffset = camera.position.z;
                if (depth < cameraOffset) depth -= cameraOffset;
                else depth += cameraOffset;
                const vFOV = (camera.fov * Math.PI) / 180;
                return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
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

export default Animation7;