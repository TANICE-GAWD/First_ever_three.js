import React, { useEffect, useRef } from 'react';
import './AeroLeague.css';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { createNoise3D } from 'simplex-noise';

const Animation10 = () => {
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
                // Make particles smaller when they are further away
                gl_PointSize = size * ( 400.0 / -mvPosition.z );
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
                
                // --- NEW STATE MANAGEMENT FOR ANIMATION ---
                this.isExpanding = false;
                this.isExpanded = false;
                this.isDragging = false;
                this.previousMousePosition = { x: 0, y: 0 };
                // ---

                const isMobile = window.innerWidth < 768;
                this.data = {
                    text: isMobile ? '' : ' \nBUILD. FLY. DOMINATE.',
                    amount: isMobile ? 800 : 1500,
                    particleSize: 1.2,
                    textSize: isMobile ? 8 : 12,
                    area: 250,
                    ease: 0.05,
                };

                this.setup();
                this.bindEvents();
            }

            destroy() {
                // Clean up all event listeners
                this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
                this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
                this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
                this.container.removeEventListener('mouseleave', this.onMouseUp.bind(this));
                this.container.removeEventListener('touchstart', this.onTouchStart.bind(this));
                this.container.removeEventListener('touchmove', this.onTouchMove.bind(this));
                this.container.removeEventListener('touchend', this.onMouseUp.bind(this));

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
                this.container.addEventListener('mouseleave', this.onMouseUp.bind(this)); // Use mouseup to stop dragging
                this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
                this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
                this.container.addEventListener('touchend', this.onMouseUp.bind(this)); // Use mouseup for touchend
            }
            
            // --- UPDATED MOUSE/TOUCH HANDLERS ---
            onMouseDown(event) {
                // If text is expanded, we start dragging
                if (this.isExpanded && !this.isExpanding) {
                    this.isDragging = true;
                    this.previousMousePosition.x = event.clientX;
                    this.previousMousePosition.y = event.clientY;
                }
            }

            onMouseMove(event) {
                const x = event.clientX;
                const y = event.clientY;

                // Handle rotation only when dragging on an expanded cloud
                if (this.isDragging && this.isExpanded) {
                    const deltaX = x - this.previousMousePosition.x;
                    const deltaY = y - this.previousMousePosition.y;

                    this.particles.rotation.y += deltaX * 0.005;
                    this.particles.rotation.x += deltaY * 0.005;
                } else {
                    // Standard hover effect when not expanded
                    const rect = this.container.getBoundingClientRect();
                    this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
                    this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
                }

                this.previousMousePosition.x = x;
                this.previousMousePosition.y = y;
            }

            onMouseUp() {
                // If not dragging, it's a click event
                if (!this.isDragging) {
                    if (this.isExpanded) {
                        // Collapse the text
                        this.isExpanded = false;
                        this.isExpanding = false;
                        // Reset rotation for next expansion
                        this.particles.rotation.set(0, 0, 0);
                    } else if (!this.isExpanding) {
                        // Start expanding
                        this.isExpanding = true;
                        setTimeout(() => {
                            if (this.isExpanding) { // Check if it hasn't been cancelled
                                this.isExpanding = false;
                                this.isExpanded = true;
                            }
                        }, 2000); // 2-second expansion time
                    }
                }
                // Stop dragging regardless
                this.isDragging = false;
            }

            onTouchStart(event) {
                event.preventDefault();
                if (event.touches.length > 0) {
                    const touch = event.touches[0];
                    if (this.isExpanded && !this.isExpanding) {
                        this.isDragging = true;
                        this.previousMousePosition.x = touch.clientX;
                        this.previousMousePosition.y = touch.clientY;
                    }
                }
            }

            onTouchMove(event) {
                event.preventDefault();
                if (event.touches.length > 0) {
                    this.onMouseMove(event.touches[0]);
                }
            }

            // onTouchEnd is handled by onMouseUp

            render() {
                if (!this.particles || !this.geometryCopy) return;

                const pos = this.particles.geometry.attributes.position;
                const copy = this.geometryCopy.attributes.position;
                const dronePos = this.geometryCopy.attributes.dronePosition;
                const coulors = this.particles.geometry.attributes.customColor;
                
                // State 1: Expanding into a drone shape
                if (this.isExpanding) {
                    for (let i = 0; i < pos.count; i++) {
                        const targetX = dronePos.getX(i);
                        const targetY = dronePos.getY(i);
                        const targetZ = dronePos.getZ(i);

                        let px = pos.getX(i);
                        let py = pos.getY(i);
                        let pz = pos.getZ(i);

                        px += (targetX - px) * this.data.ease;
                        py += (targetY - py) * this.data.ease;
                        pz += (targetZ - pz) * this.data.ease;

                        pos.setXYZ(i, px, py, pz);
                        this.colorChange.setHSL(0.55, 1.0, 0.7); // Bright cyan
                        coulors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                    }
                } 
                // State 2: Collapsing back to text OR initial state
                else if (!this.isExpanded) {
                     for (let i = 0, l = pos.count; i < l; i++) {
                        const initX = copy.getX(i);
                        const initY = copy.getY(i);
                        const initZ = copy.getZ(i);

                        let px = pos.getX(i);
                        let py = pos.getY(i);
                        let pz = pos.getZ(i);

                        // Ease back to original text position
                        px += (initX - px) * this.data.ease;
                        py += (initY - py) * this.data.ease;
                        pz += (initZ - pz) * this.data.ease;
                        pos.setXYZ(i, px, py, pz);

                        // Standard hover effect
                        this.colorChange.setHSL(0.5, 1, 0.5); // Techy green
                        this.raycaster.setFromCamera(this.mouse, this.camera);
                        const intersects = this.raycaster.intersectObject(this.planeArea);
                        if (intersects.length > 0) {
                            const mx = intersects[0].point.x;
                            const my = intersects[0].point.y;
                            const mouseDistance = this.distance(mx, my, px, py);
                            if (mouseDistance < this.data.area) {
                                this.colorChange.setHSL(0.3, 1.0, 0.6);
                            }
                        }
                        coulors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                    }
                }
                // State 3: Expanded and idle (rotation is handled by mouse events)
                else {
                    // Add a slow ambient rotation to the drone when idle
                    this.particles.rotation.y += 0.0005;
                }

                pos.needsUpdate = true;
                coulors.needsUpdate = true;
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
                
                this.geometryCopy = new THREE.BufferGeometry();
                this.geometryCopy.copy(geoParticles);
                
                // --- CREATE MORE DETAILED DRONE POSITIONS ---
                const dronePositions = [];
                const totalParticles = thePoints.length;

                // Helper to sample points on a box surface
                const sampleBox = (center, size, points) => {
                    const half = { x: size.x / 2, y: size.y / 2, z: size.z / 2 };
                    for (let i = 0; i < points; i++) {
                        const face = Math.floor(Math.random() * 6);
                        let x, y, z;
                        switch (face) {
                            case 0: x = half.x; y = (Math.random() - 0.5) * size.y; z = (Math.random() - 0.5) * size.z; break;
                            case 1: x = -half.x; y = (Math.random() - 0.5) * size.y; z = (Math.random() - 0.5) * size.z; break;
                            case 2: y = half.y; x = (Math.random() - 0.5) * size.x; z = (Math.random() - 0.5) * size.z; break;
                            case 3: y = -half.y; x = (Math.random() - 0.5) * size.x; z = (Math.random() - 0.5) * size.z; break;
                            case 4: z = half.z; x = (Math.random() - 0.5) * size.x; y = (Math.random() - 0.5) * size.y; break;
                            case 5: z = -half.z; x = (Math.random() - 0.5) * size.x; y = (Math.random() - 0.5) * size.y; break;
                        }
                        dronePositions.push(center.x + x, center.y + y, center.z + z);
                    }
                };
                
                // Helper to sample points on a cylinder surface
                const sampleCylinder = (center, radius, height, points) => {
                    for (let i = 0; i < points; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.sqrt(Math.random()) * radius;
                        const y = (Math.random() - 0.5) * height;
                        const x = r * Math.cos(angle);
                        const z = r * Math.sin(angle);
                        dronePositions.push(center.x + x, center.y + y, center.z + z);
                    }
                };

                // Helper for landing gear legs and standoffs
                const sampleLine = (start, end, points) => {
                    for (let i = 0; i < points; i++) {
                        const t = Math.random();
                        dronePositions.push(
                            start.x + (end.x - start.x) * t,
                            start.y + (end.y - start.y) * t,
                            start.z + (end.z - start.z) * t
                        );
                    }
                };

                // Define drone parts and distribute particles
                const particlesLeft = (p) => Math.floor(totalParticles * p);
                const topPlatePoints = particlesLeft(0.12);
                const bottomPlatePoints = particlesLeft(0.12);
                const standoffPoints = particlesLeft(0.01); // Per standoff
                const armPoints = particlesLeft(0.07); // Per arm
                const escPoints = particlesLeft(0.02); // Per ESC
                const motorMountPoints = particlesLeft(0.02); // Per mount
                const rotorPoints = particlesLeft(0.03); // Per rotor
                const cameraPoints = particlesLeft(0.04);
                const lensPoints = particlesLeft(0.01);
                const landingGearPoints = particlesLeft(0.01); // Per leg
                const gpsPoints = particlesLeft(0.02);
                const vtxAntennaPoints = particlesLeft(0.02);
                
                // Drone dimensions
                const plateSize = { x: 35, y: 2, z: 35 };
                const plateY = 4;
                const armSize = { x: 40, y: 3, z: 7 };
                const armY = 0;
                const escSize = { x: 8, y: 2, z: 6 };
                const motorMountSize = { radius: 6, height: 5};
                const rotorSize = { radius: 12, height: 1 };
                const armOffset = 25;
                const motorOffset = armOffset + armSize.x / 2;

                // 1. Frame - Top and Bottom Plates
                sampleBox({x: 0, y: plateY, z: 0}, plateSize, topPlatePoints);
                sampleBox({x: 0, y: -plateY, z: 0}, plateSize, bottomPlatePoints);

                // 2. Frame - Standoffs (connect plates)
                const standoffX = 16;
                const standoffZ = 16;
                sampleLine({x: standoffX, y: -plateY, z: standoffZ}, {x: standoffX, y: plateY, z: standoffZ}, standoffPoints);
                sampleLine({x: -standoffX, y: -plateY, z: standoffZ}, {x: -standoffX, y: plateY, z: standoffZ}, standoffPoints);
                sampleLine({x: standoffX, y: -plateY, z: -standoffZ}, {x: standoffX, y: plateY, z: -standoffZ}, standoffPoints);
                sampleLine({x: -standoffX, y: -plateY, z: -standoffZ}, {x: -standoffX, y: plateY, z: -standoffZ}, standoffPoints);

                // 3. Arms (x4)
                sampleBox({x: armOffset, y: armY, z: 0}, armSize, armPoints);
                sampleBox({x: -armOffset, y: armY, z: 0}, armSize, armPoints);
                sampleBox({x: 0, y: armY, z: armOffset}, {x: armSize.z, y: armSize.y, z: armSize.x}, armPoints);
                sampleBox({x: 0, y: armY, z: -armOffset}, {x: armSize.z, y: armSize.y, z: armSize.x}, armPoints);

                // 4. ESCs on arms (x4)
                sampleBox({x: armOffset, y: armY + 2.5, z: 0}, escSize, escPoints);
                sampleBox({x: -armOffset, y: armY + 2.5, z: 0}, escSize, escPoints);
                sampleBox({x: 0, y: armY + 2.5, z: armOffset}, {x: escSize.z, y: escSize.y, z: escSize.x}, escPoints);
                sampleBox({x: 0, y: armY + 2.5, z: -armOffset}, {x: escSize.z, y: escSize.y, z: escSize.x}, escPoints);

                // 5. Motor Mounts (x4)
                sampleCylinder({x: motorOffset, y: armY, z: 0}, motorMountSize.radius, motorMountSize.height, motorMountPoints);
                sampleCylinder({x: -motorOffset, y: armY, z: 0}, motorMountSize.radius, motorMountSize.height, motorMountPoints);
                sampleCylinder({x: 0, y: armY, z: motorOffset}, motorMountSize.radius, motorMountSize.height, motorMountPoints);
                sampleCylinder({x: 0, y: armY, z: -motorOffset}, motorMountSize.radius, motorMountSize.height, motorMountPoints);

                // 6. Rotors (x4)
                sampleCylinder({x: motorOffset, y: armY + 4, z: 0}, rotorSize.radius, rotorSize.height, rotorPoints);
                sampleCylinder({x: -motorOffset, y: armY + 4, z: 0}, rotorSize.radius, rotorSize.height, rotorPoints);
                sampleCylinder({x: 0, y: armY + 4, z: motorOffset}, rotorSize.radius, rotorSize.height, rotorPoints);
                sampleCylinder({x: 0, y: armY + 4, z: -motorOffset}, rotorSize.radius, rotorSize.height, rotorPoints);

                // 7. FPV Camera
                sampleBox({x: 0, y: 0, z: -18}, {x: 12, y: 10, z: 8}, cameraPoints);
                sampleCylinder({x: 0, y: 0, z: -25}, 4, 4, lensPoints);

                // 8. Landing Gear (x2 Skids)
                const lgX = 15, lgY = -8, lgZ = 20;
                sampleLine({x: -lgX, y: lgY, z: -lgZ}, {x: -lgX, y: lgY, z: lgZ}, landingGearPoints);
                sampleLine({x: lgX, y: lgY, z: -lgZ}, {x: lgX, y: lgY, z: lgZ}, landingGearPoints);

                // 9. GPS Module
                sampleCylinder({x: 0, y: plateY + 2, z: 5}, 8, 4, gpsPoints);

                // 10. VTX Antenna
                sampleCylinder({x: 0, y: plateY + 5, z: 18}, 1, 10, vtxAntennaPoints/2);
                sampleCylinder({x: 0, y: plateY + 10, z: 18}, 5, 5, vtxAntennaPoints/2);

                // Add any remaining particles to the body to ensure all are used
                const remaining = totalParticles - dronePositions.length / 3;
                if (remaining > 0) {
                    sampleBox({x: 0, y: 0, z: 0}, {x:plateSize.x, y:plateY*2, z:plateSize.z}, remaining);
                }

                // Shuffle the drone positions for a more chaotic transition
                for (let i = totalParticles - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    for (let k = 0; k < 3; k++) {
                        const p_i = i * 3 + k;
                        const p_j = j * 3 + k;
                        [dronePositions[p_i], dronePositions[p_j]] = [dronePositions[p_j], dronePositions[p_i]];
                    }
                }
                
                this.geometryCopy.setAttribute('dronePosition', new THREE.Float32BufferAttribute(dronePositions, 3));

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

export default Animation10;
