import React, { useEffect, useRef } from 'react';
import './AeroLeague.css';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const Animation5 = () => {
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
                gl_PointSize = size * ( 400.0 / -mvPosition.z );
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4( vColor, 1.0 );
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
                    this.camera
                );
                this.scene.add(this.createParticles.container);
            }

            render() {
                // The new fade-to-black logic for motion trails
                this.renderer.render(this.createParticles.fadeScene, this.createParticles.fadeCamera);
                this.renderer.render(this.scene, this.camera);

                if (this.createParticles) this.createParticles.render();
            }

            createCamera() {
                this.camera = new THREE.PerspectiveCamera(
                    65,
                    this.container.clientWidth / this.container.clientHeight,
                    1,
                    10000
                );
                this.camera.position.z = 150;
            }

            createRenderer() {
                this.renderer = new THREE.WebGLRenderer({
                    alpha: true,
                    antialias: true
                });
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                
                // We need to control the clear process for motion trails
                this.renderer.autoClearColor = false;

                this.container.appendChild(this.renderer.domElement);
                this.renderer.setAnimationLoop(() => {
                    this.render();
                });
            }

            onWindowResize() {
                if (!this.container || !this.renderer || !this.camera) return;
                this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            }

            destroy() {
                if (this.renderer) this.renderer.setAnimationLoop(null);
                // ... cleanup logic ...
            }
        }

        class CreateParticles {
            constructor(scene, font, particleImg, camera) {
                this.scene = scene;
                this.font = font;
                this.particleImg = particleImg;
                this.camera = camera;
                
                this.container = new THREE.Object3D();

                // --- NEW: FPV Drone Flight Controls ---
                this.isDragging = false;
                this.previousMousePosition = { x: 0, y: 0 };
                this.rotationSpeed = { x: 0, y: 0 };
                this.targetRotation = { x: 0, y: 0 };
                this.currentRotation = { x: 0, y: 0 };
                this.damping = 0.95; // For inertia

                const isMobile = window.innerWidth < 768;
                this.data = {
                    text: isMobile ? 'TDC\n2025' : 'THAPAR DRONE CHALLENGE',
                    amount: isMobile ? 500 : 1200,
                    particleSize: isMobile ? 1.2 : 1,
                    textSize: isMobile ? 16 : 14,
                    area: 250,
                    ease: 0.05,
                };

                this.setup();
                this.bindEvents();
            }

            setup() {
                this.createText();
                this.createFadeEffect();
            }

            // --- NEW: Motion Trail / Fade Effect ---
            createFadeEffect() {
                this.fadeScene = new THREE.Scene();
                this.fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
                const fadeMaterial = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.1 // This controls the length of the trails
                });
                const fadePlane = new THREE.PlaneGeometry(2, 2);
                const fadeMesh = new THREE.Mesh(fadePlane, fadeMaterial);
                this.fadeScene.add(fadeMesh);
            }

            bindEvents() {
                // Using document to capture mouseup even outside the canvas
                document.addEventListener('mousedown', this.onMouseDown.bind(this));
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
                document.addEventListener('mouseup', this.onMouseUp.bind(this));
                document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
                document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
                document.addEventListener('touchend', this.onMouseUp.bind(this)); // touchend is same as mouseup
            }
            
            // --- NEW: Flight Control Handlers ---
            onMouseDown(event) {
                this.isDragging = true;
                this.previousMousePosition = { x: event.clientX, y: event.clientY };
            }

            onMouseMove(event) {
                if (!this.isDragging) return;
                const deltaX = event.clientX - this.previousMousePosition.x;
                const deltaY = event.clientY - this.previousMousePosition.y;

                // Update target rotation and speed for inertia
                this.targetRotation.y += deltaX * 0.005;
                this.targetRotation.x += deltaY * 0.005;
                this.rotationSpeed = { x: deltaX * 0.5, y: deltaY * 0.5 };

                this.previousMousePosition = { x: event.clientX, y: event.clientY };
            }
            
            onMouseUp() {
                this.isDragging = false;
            }

            onTouchStart(event) {
                if (event.touches.length === 1) {
                    event.preventDefault();
                    this.onMouseDown({ clientX: event.touches[0].pageX, clientY: event.touches[0].pageY });
                }
            }
            
            onTouchMove(event) {
                if (event.touches.length === 1) {
                    event.preventDefault();
                    this.onMouseMove({ clientX: event.touches[0].pageX, clientY: event.touches[0].pageY });
                }
            }


            render() {
                // --- NEW: Update camera flight controls every frame ---
                if (!this.isDragging) {
                    // Apply inertia and damping
                    this.targetRotation.y += this.rotationSpeed.x * 0.02;
                    this.targetRotation.x += this.rotationSpeed.y * 0.02;
                    this.rotationSpeed.x *= this.damping;
                    this.rotationSpeed.y *= this.damping;
                }

                // Smoothly interpolate current rotation to the target
                this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
                this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

                this.container.rotation.y = this.currentRotation.y;
                this.container.rotation.x = this.currentRotation.x;


                // --- NEW: Animate particles with a "hovering" effect ---
                const time = performance.now() * 0.0005;
                const pos = this.particles.geometry.attributes.position;
                const copy = this.geometryCopy.attributes.position;
                
                for (let i = 0; i < pos.count; i++) {
                    const initX = copy.getX(i);
                    const initY = copy.getY(i);
                    const initZ = copy.getZ(i);

                    // Add a sine wave for a gentle, organic hover/drift
                    let px = initX + Math.sin(time + initX) * 0.5;
                    let py = initY + Math.cos(time + initY) * 0.5;
                    let pz = initZ + Math.sin(time + initZ) * 0.5;
                    
                    pos.setXYZ(i, px, py, pz);
                }
                pos.needsUpdate = true;
            }

            createText() {
                let thePoints = [];
                let shapes = this.font.generateShapes(this.data.text, this.data.textSize);
                let geometry = new THREE.ShapeGeometry(shapes);
                geometry.computeBoundingBox();
                const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
                const yMid = (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2.0;
                geometry.center();
                
                // --- NEW: Create a 3D text swarm with depth ---
                let holeShapes = [];
                // ... (hole logic is fine as is) ...
                shapes.push.apply(shapes, holeShapes);
                let colors = [];
                let sizes = [];
                for (let x = 0; x < shapes.length; x++) {
                    let shape = shapes[x];
                    const amountPoints = shape.type === 'Path' ? this.data.amount / 2 : this.data.amount;
                    let points = shape.getSpacedPoints(amountPoints);
                    points.forEach((element) => {
                        // Add random Z depth to each particle
                        thePoints.push(new THREE.Vector3(element.x, element.y, (Math.random() - 0.5) * 40));
                        colors.push(0.1, 0.8, 1.0); // Techy Cyan/Blue color
                        sizes.push(this.data.particleSize);
                    });
                }
                
                let geoParticles = new THREE.BufferGeometry().setFromPoints(thePoints);
                geoParticles.translate(xMid, yMid, 0);
                geoParticles.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
                geoParticles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
                
                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        pointTexture: { value: this.particleImg },
                    },
                    vertexShader,
                    fragmentShader,
                    blending: THREE.AdditiveBlending,
                    depthTest: false,
                    transparent: true,
                });

                this.particles = new THREE.Points(geoParticles, material);
                this.container.add(this.particles);

                this.geometryCopy = new THREE.BufferGeometry();
                this.geometryCopy.copy(this.particles.geometry);
            }
        }

        // --- Load assets and start ---
        const fontLoader = new FontLoader();
        const textureLoader = new THREE.TextureLoader();
        const particleTexture = textureLoader.load('https://res.cloudinary.com/dfvtkoboz/image/upload/v1605013866/particle_a64uzf.png');

        fontLoader.load(
            'https://res.cloudinary.com/dydre7amr/raw/upload/v1612950355/font_zsd4dr.json',
            (loadedFont) => {
                if (isMounted && mountPoint) {
                    env = new Environment(loadedFont, particleTexture, mountPoint);
                }
            }
        );

        return () => {
            isMounted = false;
            // Add comprehensive cleanup here if needed
        };
    }, []);

    return (
        <section className="animation-section" ref={mountRef}>
            {/* The FPV Drone animation will render here */}
        </section>
    );
};

export default Animation5;