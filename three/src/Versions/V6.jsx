import React, { useEffect, useRef } from 'react';
import './AeroLeague.css';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const Animation6 = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const mountPoint = mountRef.current;
        let isMounted = true;
        let env;

        // *** NEW: Updated Shaders to handle a 'glow' attribute ***
        const vertexShader = `
          attribute float size;
          attribute vec3 customColor;
          attribute float glow; // Glow attribute for flight trails
          varying vec3 vColor;
          varying float vGlow;
          void main() {
            vColor = customColor;
            vGlow = glow;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
          }
        `;

        const fragmentShader = `
          uniform vec3 color;
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          varying float vGlow; // Glow value from vertex shader
          void main() {
            vec3 baseColor = color * vColor;
            // Make the particle brighter based on its glow value
            vec3 finalColor = baseColor + baseColor * vGlow * 3.0;
            gl_FragColor = vec4( finalColor, 1.0 );
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

                // *** NEW: State management for touch gestures ***
                this.isDragging = false;
                this.dragStartTime = 0;
                this.dragStartPos = new THREE.Vector2();
                this.previousMousePos = new THREE.Vector2();
                this.ripple = null; // For tap effect

                const isMobile = window.innerWidth < 768;
                this.data = {
                    text: isMobile ? ' 67\n   67' : '67\n   67',
                    amount: isMobile ? 800 : 1500,
                    particleSize: 1.2,
                    particleColor: 0xffffff,
                    textSize: isMobile ? 7 : 12,
                    area: 150,
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
            
            // *** NEW: Updated event handlers to distinguish Taps from Drags ***
            bindEvents() {
                this.container.addEventListener('mousedown', this.onPointerDown.bind(this));
                this.container.addEventListener('mousemove', this.onPointerMove.bind(this));
                this.container.addEventListener('mouseup', this.onPointerUp.bind(this));
                this.container.addEventListener('mouseleave', this.onPointerUp.bind(this));
                this.container.addEventListener('touchstart', this.onPointerDown.bind(this), { passive: true });
                this.container.addEventListener('touchmove', this.onPointerMove.bind(this), { passive: false });
                this.container.addEventListener('touchend', this.onPointerUp.bind(this));
            }

            onPointerDown(event) {
                const pointer = event.touches ? event.touches[0] : event;
                this.isDragging = false;
                this.dragStartTime = Date.now();
                this.dragStartPos.set(pointer.clientX, pointer.clientY);
                this.previousMousePos.set(pointer.clientX, pointer.clientY);
            }

            onPointerMove(event) {
                const pointer = event.touches ? event.touches[0] : event;
                const distance = this.dragStartPos.distanceTo(new THREE.Vector2(pointer.clientX, pointer.clientY));
                if (distance > 10) { // If moved more than 10 pixels, it's a drag
                    this.isDragging = true;
                }
                
                const rect = this.container.getBoundingClientRect();
                this.mouse.x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1;

                if (this.isDragging && (event.touches || event.buttons === 1)) {
                    if (event.cancelable) event.preventDefault();
                }
            }

            onPointerUp(event) {
                const duration = Date.now() - this.dragStartTime;
                if (!this.isDragging && duration < 200) { // If not dragged and held for < 200ms, it's a tap
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const intersects = this.raycaster.intersectObject(this.planeArea);
                    if (intersects.length > 0) {
                        this.ripple = {
                            x: intersects[0].point.x,
                            y: intersects[0].point.y,
                            startTime: Date.now(),
                            duration: 400,
                            maxRadius: 80,
                        };
                    }
                }
                this.isDragging = false;
            }

            render() {
                if (!this.particles || !this.geometryCopy) return;

                const pos = this.particles.geometry.attributes.position;
                const copy = this.geometryCopy.attributes.position;
                const colors = this.particles.geometry.attributes.customColor;
                const sizes = this.particles.geometry.attributes.size;
                const glows = this.particles.geometry.attributes.glow;

                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.planeArea);
                
                // *** NEW: Handle the "Target Lock" ripple effect ***
                let rippleRadius = -1;
                if (this.ripple) {
                    const elapsed = Date.now() - this.ripple.startTime;
                    if (elapsed < this.ripple.duration) {
                        rippleRadius = (elapsed / this.ripple.duration) * this.ripple.maxRadius;
                    } else {
                        this.ripple = null; // Ripple finished
                    }
                }
                
                // *** NEW: Handle the "Flight Path" drag effect ***
                if (this.isDragging && intersects.length > 0) {
                    const mx = intersects[0].point.x;
                    const my = intersects[0].point.y;

                    // Calculate swipe direction
                    const currentMousePos = new THREE.Vector2(mx, my);
                    const swipeDirection = currentMousePos.clone().sub(this.previousMousePos).normalize();
                    this.previousMousePos.copy(currentMousePos);

                    for(let i = 0; i < pos.count; i++) {
                        const px = pos.getX(i);
                        const py = pos.getY(i);
                        const mouseDistance = this.distance(mx, my, px, py);
                        
                        if (mouseDistance < 20) { // Activate particles near the drag path
                            const force = Math.max(0, 1 - mouseDistance / 20);
                            pos.setX(i, px + swipeDirection.x * force * 2.0);
                            pos.setY(i, py + swipeDirection.y * force * 2.0);
                            glows.setX(i, 1.0); // Set glow to maximum
                        }
                    }
                }


                for (let i = 0; i < pos.count; i++) {
                    const initX = copy.getX(i);
                    const initY = copy.getY(i);
                    const initZ = copy.getZ(i);

                    let px = pos.getX(i);
                    let py = pos.getY(i);
                    let pz = pos.getZ(i);

                    // Decay the glow effect over time
                    glows.setX(i, glows.getX(i) * 0.96);

                    // Default particle color (a techy green)
                    this.colorChange.setHSL(0.4, 1.0, 0.5);
                    colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                    
                    // Ripple effect overrides color
                    if(this.ripple) {
                        const distFromRipple = this.distance(this.ripple.x, this.ripple.y, px, py);
                        if (distFromRipple > rippleRadius - 5 && distFromRipple < rippleRadius + 5) {
                            this.colorChange.setHSL(0.55, 1.0, 0.7); // Bright cyan
                            colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
                            glows.setX(i, 0.5);
                        }
                    }

                    // Prop-wash for mouse hover (only when not dragging)
                    if (!this.isDragging && intersects.length > 0) {
                        const mx = intersects[0].point.x;
                        const my = intersects[0].point.y;
                        const mouseDistance = this.distance(mx, my, px, py);
                        if (mouseDistance < this.data.area) {
                           glows.setX(i, Math.max(glows.getX(i), (1 - mouseDistance / this.data.area) * 0.2));
                        }
                    }

                    // Ease particles back to their original position
                    px += (initX - px) * this.data.ease;
                    py += (initY - py) * this.data.ease;
                    pz += (initZ - pz) * this.data.ease;
                    pos.setXYZ(i, px, py, pz);
                }

                pos.needsUpdate = true;
                colors.needsUpdate = true;
                glows.needsUpdate = true;
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
                let glows = []; // *** NEW: Glow attribute array ***
                for (let x = 0; x < shapes.length; x++) {
                    let shape = shapes[x];
                    const amountPoints = shape.type === 'Path' ? this.data.amount / 2 : this.data.amount;
                    let points = shape.getSpacedPoints(amountPoints);
                    points.forEach((element) => {
                        thePoints.push(new THREE.Vector3(element.x, element.y, 0));
                        colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b);
                        sizes.push(1);
                        glows.push(0); // Initialize all glows to 0
                    });
                }
                let geoParticles = new THREE.BufferGeometry().setFromPoints(thePoints);
                geoParticles.translate(xMid, yMid, 0);
                geoParticles.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
                geoParticles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
                geoParticles.setAttribute('glow', new THREE.Float32BufferAttribute(glows, 1)); // *** NEW: Set glow attribute ***
                
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

export default Animation6;