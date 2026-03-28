import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ============================================
// DIMENSIONS (all in mm)
// ============================================
const HEIGHT_F1 = 949;
const BASE_WIDTH_F1 = 378;
const F2_Y = 605.3;
const F2_X = 1210.5;
const F2_TOP_WIDTH = 473.85;
const F3_Y = 1937.3;
const F3_X = 847.5;
const F3_TOP_WIDTH = 329.28;
const APEX_Y = 2300;
const THICKNESS = 2;
const SCALE = 0.0008;
const s = SCALE;

const FACES_F1_F4 = 16;
const ANGLE_STEP_FULL = (Math.PI * 2) / FACES_F1_F4;
const DOOR_START_INDEX = 2;
const DOOR_END_INDEX = 4;

// ============================================
// GEOMETRY FUNCTIONS
// ============================================
function rotateAroundY(vec, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new THREE.Vector3(
        vec.x * cos + vec.z * sin,
        vec.y,
        -vec.x * sin + vec.z * cos
    );
}

function getVerticesAtAngle(angle) {
    const refB = new THREE.Vector3(HEIGHT_F1 * s, 0, -(BASE_WIDTH_F1/2) * s);
    const refC = new THREE.Vector3(HEIGHT_F1 * s, 0, (BASE_WIDTH_F1/2) * s);
    const refF = new THREE.Vector3(F2_X * s, F2_Y * s, -(F2_TOP_WIDTH/2) * s);
    const refG = new THREE.Vector3(F2_X * s, F2_Y * s, (F2_TOP_WIDTH/2) * s);
    const refJ = new THREE.Vector3(F3_X * s, F3_Y * s, -(F3_TOP_WIDTH/2) * s);
    const refK = new THREE.Vector3(F3_X * s, F3_Y * s, (F3_TOP_WIDTH/2) * s);
    
    return {
        B: rotateAroundY(refB, angle),
        C: rotateAroundY(refC, angle),
        F: rotateAroundY(refF, angle),
        G: rotateAroundY(refG, angle),
        J: rotateAroundY(refJ, angle),
        K: rotateAroundY(refK, angle)
    };
}

function createTriangularFace(v1, v2, v3, color, opacity) {
    const group = new THREE.Group();
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    let normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    if (normal.y < 0) normal.negate();
    const extrudeDir = normal.clone().multiplyScalar(THICKNESS * s);
    const v1b = v1.clone().add(extrudeDir);
    const v2b = v2.clone().add(extrudeDir);
    const v3b = v3.clone().add(extrudeDir);
    const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: opacity });
    
    const frontGeo = new THREE.BufferGeometry();
    const frontVerts = [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z];
    frontGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(frontVerts), 3));
    frontGeo.setIndex([0, 1, 2]);
    frontGeo.computeVertexNormals();
    group.add(new THREE.Mesh(frontGeo, material));
    
    const backGeo = new THREE.BufferGeometry();
    const backVerts = [v1b.x, v1b.y, v1b.z, v2b.x, v2b.y, v2b.z, v3b.x, v3b.y, v3b.z];
    backGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(backVerts), 3));
    backGeo.setIndex([0, 1, 2]);
    backGeo.computeVertexNormals();
    group.add(new THREE.Mesh(backGeo, material));
    
    return group;
}

function createQuadrilateralFace(v1, v2, v3, v4, color, opacity) {
    const group = new THREE.Group();
    group.add(createTriangularFace(v1, v2, v3, color, opacity));
    group.add(createTriangularFace(v1, v3, v4, color, opacity));
    return group;
}

function createFullModel() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(0, 0, 0);
    const apex = new THREE.Vector3(0, APEX_Y * s, 0);
    
    for (let i = 0; i < FACES_F1_F4; i++) {
        const angle = i * ANGLE_STEP_FULL;
        const verts = getVerticesAtAngle(angle);
        
        group.add(createTriangularFace(origin, verts.B, verts.C, 0x7a8c9e, 0.6));
        group.add(createTriangularFace(verts.J, verts.K, apex, 0x9b8c7a, 0.6));
        
        const isDoorArea = (i >= DOOR_START_INDEX && i < DOOR_END_INDEX);
        if (!isDoorArea) {
            group.add(createQuadrilateralFace(verts.B, verts.C, verts.G, verts.F, 0x7a9e8c, 0.6));
            group.add(createQuadrilateralFace(verts.F, verts.G, verts.K, verts.J, 0x8c9e7a, 0.6));
        }
    }
    return group;
}

// ============================================
// COLLISION DETECTION
// ============================================
class CollisionDetector {
    constructor() {
        this.boundingBoxes = [];
        this.createBoundingBoxes();
    }
    
    createBoundingBoxes() {
        const origin = new THREE.Vector3(0, 0, 0);
        const apex = new THREE.Vector3(0, APEX_Y * s, 0);
        
        for (let i = 0; i < FACES_F1_F4; i++) {
            const angle = i * ANGLE_STEP_FULL;
            const verts = getVerticesAtAngle(angle);
            
            // Base triangle
            const baseMinX = Math.min(origin.x, verts.B.x, verts.C.x);
            const baseMaxX = Math.max(origin.x, verts.B.x, verts.C.x);
            const baseMinY = Math.min(origin.y, verts.B.y, verts.C.y);
            const baseMaxY = Math.max(origin.y, verts.B.y, verts.C.y);
            const baseMinZ = Math.min(origin.z, verts.B.z, verts.C.z);
            const baseMaxZ = Math.max(origin.z, verts.B.z, verts.C.z);
            
            this.boundingBoxes.push({
                minX: baseMinX, maxX: baseMaxX,
                minY: baseMinY, maxY: baseMaxY,
                minZ: baseMinZ, maxZ: baseMaxZ
            });
            
            // Apex triangle
            const apexMinX = Math.min(verts.J.x, verts.K.x, apex.x);
            const apexMaxX = Math.max(verts.J.x, verts.K.x, apex.x);
            const apexMinY = Math.min(verts.J.y, verts.K.y, apex.y);
            const apexMaxY = Math.max(verts.J.y, verts.K.y, apex.y);
            const apexMinZ = Math.min(verts.J.z, verts.K.z, apex.z);
            const apexMaxZ = Math.max(verts.J.z, verts.K.z, apex.z);
            
            this.boundingBoxes.push({
                minX: apexMinX, maxX: apexMaxX,
                minY: apexMinY, maxY: apexMaxY,
                minZ: apexMinZ, maxZ: apexMaxZ
            });
        }
    }
    
    checkCollision(point) {
        for (const box of this.boundingBoxes) {
            if (point.x >= box.minX && point.x <= box.maxX &&
                point.y >= box.minY && point.y <= box.maxY &&
                point.z >= box.minZ && point.z <= box.maxZ) {
                return true;
            }
        }
        return false;
    }
}

// ============================================
// AIR PARTICLE
// ============================================
class AirParticle {
    constructor(scene, startX, startY, startZ, detector) {
        this.scene = scene;
        this.detector = detector;
        this.position = new THREE.Vector3(startX, startY, startZ);
        this.startPos = new THREE.Vector3(startX, startY, startZ);
        this.velocity = new THREE.Vector3(0.035 + Math.random() * 0.02, 0, 0);
        this.collided = false;
        this.size = 0.018 + Math.random() * 0.015;
        
        const geometry = new THREE.SphereGeometry(this.size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3a86ff,
            emissive: 0x1a4a8a,
            emissiveIntensity: 0.3,
            transparent: true
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }
    
    update() {
        if (this.collided) {
            if (this.mesh.material.opacity > 0.05) {
                this.mesh.material.opacity -= 0.02;
            }
            return;
        }
        
        const nextPos = this.position.clone().add(this.velocity);
        
        if (this.detector.checkCollision(nextPos)) {
            this.collided = true;
            this.mesh.material.color.setHex(0xff4444);
            this.mesh.material.emissive.setHex(0x882222);
            return;
        }
        
        this.position.copy(nextPos);
        
        // Turbulence in wake region
        if (this.position.x > 0.4) {
            this.velocity.y += (Math.random() - 0.5) * 0.002;
            this.velocity.z += (Math.random() - 0.5) * 0.002;
            this.mesh.material.color.setHex(0xff8844);
        } else {
            const t = this.position.x / 0.4;
            const color = new THREE.Color().setHSL(0.55 - t * 0.2, 1, 0.5);
            this.mesh.material.color = color;
        }
        
        this.mesh.position.copy(this.position);
        
        if (this.position.x > 2.0) {
            this.reset();
        }
    }
    
    reset() {
        this.position.copy(this.startPos);
        this.velocity.set(0.035 + Math.random() * 0.02, 0, 0);
        this.collided = false;
        this.mesh.material.opacity = 0.9;
        this.mesh.material.color.setHex(0x3a86ff);
        this.mesh.material.emissive.setHex(0x1a4a8a);
    }
    
    remove() {
        this.scene.remove(this.mesh);
    }
}

// ============================================
// STREAMLINES
// ============================================
function createStreamlines(scene, detector) {
    const lines = [];
    const colors = [0x3a86ff, 0x5a9eff, 0x2a6eff];
    
    for (let i = 0; i < 20; i++) {
        const startY = -0.3 + (i / 20) * 1.8;
        const points = [];
        let x = -1.3;
        
        while (x < 1.5) {
            const point = new THREE.Vector3(x, startY + Math.sin(x * 2.5) * 0.04, -0.5 + Math.cos(x * 1.8) * 0.3);
            
            if (!detector.checkCollision(point)) {
                points.push(point.clone());
            } else {
                break;
            }
            x += 0.05;
        }
        
        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: colors[i % 3], transparent: true, opacity: 0.4 });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            lines.push(line);
        }
    }
    
    return lines;
}

// ============================================
// MAIN INITIALIZATION
// ============================================
export function initAirflowSimulation(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return () => {};
    }
    
    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    scene.fog = new THREE.FogExp2(0x0a0a2a, 0.0015);
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 20);
    camera.position.set(2.5, 1.6, 3.2);
    camera.lookAt(0, 0.8, 0);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.8, 0);
    
    // Lights
    const ambient = new THREE.AmbientLight(0x404060);
    scene.add(ambient);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(1, 2, 1.5);
    scene.add(mainLight);
    
    const fillLight = new THREE.PointLight(0x4466aa, 0.5);
    fillLight.position.set(0.5, 1, 1);
    scene.add(fillLight);
    
    const backLight = new THREE.PointLight(0xaa8866, 0.4);
    backLight.position.set(-0.5, 1, -1);
    scene.add(backLight);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(4.5, 30, 0x88aaff, 0x335588);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);
    
    // Axes helper for reference
    const axesHelper = new THREE.AxesHelper(1.5);
    scene.add(axesHelper);
    
    // Create shelter model
    const shelterModel = createFullModel();
    scene.add(shelterModel);
    
    // Add wireframe edges to shelter
    shelterModel.traverse(child => {
        if (child.isMesh) {
            const edgesGeo = new THREE.EdgesGeometry(child.geometry);
            const edgesMat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.25 });
            const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
            child.add(wireframe);
        }
    });
    
    // Apex marker
    const apexMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xffaa88 })
    );
    apexMarker.position.set(0, APEX_Y * s, 0);
    scene.add(apexMarker);
    
    // Collision detector
    const detector = new CollisionDetector();
    
    // Create particles
    const particles = [];
    const particleCount = 350;
    
    for (let i = 0; i < particleCount; i++) {
        const startX = -1.5;
        const startY = -0.4 + Math.random() * 1.9;
        const startZ = -1.0 + Math.random() * 2.0;
        const particle = new AirParticle(scene, startX, startY, startZ, detector);
        particles.push(particle);
    }
    
    // Create streamlines
    const streamlines = createStreamlines(scene, detector);
    
    // Wind direction arrow
    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1.4, 1.2, 0.8),
        0.85,
        0x88aaff,
        0.35,
        0.2
    );
    scene.add(arrowHelper);
    
    // CSS2D Labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);
    
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = 'Wind Direction → 10 m/s<br><span style="font-size:9px">Blue: Laminar | Orange: Wake | Red: Impact</span>';
    infoDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    infoDiv.style.color = '#88aaff';
    infoDiv.style.fontSize = '11px';
    infoDiv.style.fontFamily = 'monospace';
    infoDiv.style.padding = '6px 12px';
    infoDiv.style.borderRadius = '8px';
    infoDiv.style.borderLeft = '3px solid #88aaff';
    const infoLabel = new CSS2DObject(infoDiv);
    infoLabel.position.set(-1.4, 1.4, 1.0);
    scene.add(infoLabel);
    
    const bcDiv = document.createElement('div');
    bcDiv.innerHTML = 'BOUNDARY CONDITIONS<br>─────────<br>Inlet: 10 m/s<br>Outlet: 101325 Pa<br>Re: 1.2×10⁶ (Turbulent)';
    bcDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    bcDiv.style.color = '#ccc';
    bcDiv.style.fontSize = '10px';
    bcDiv.style.fontFamily = 'monospace';
    bcDiv.style.padding = '8px 12px';
    bcDiv.style.borderRadius = '8px';
    bcDiv.style.borderLeft = '3px solid #ffaa66';
    const bcLabel = new CSS2DObject(bcDiv);
    bcLabel.position.set(-1.5, 1.1, -1.1);
    scene.add(bcLabel);
    
    // Legend
    const legendDiv = document.createElement('div');
    legendDiv.innerHTML = 'FLOW VISUALIZATION<br>● Laminar Flow<br>● Turbulent Wake<br>● Impact Zone';
    legendDiv.style.backgroundColor = 'rgba(0,0,0,0.6)';
    legendDiv.style.color = '#ccc';
    legendDiv.style.fontSize = '10px';
    legendDiv.style.fontFamily = 'monospace';
    legendDiv.style.padding = '8px 12px';
    legendDiv.style.borderRadius = '8px';
    legendDiv.style.position = 'absolute';
    legendDiv.style.bottom = '80px';
    legendDiv.style.left = '20px';
    legendDiv.style.zIndex = '100';
    legendDiv.style.borderLeft = '3px solid #3a86ff';
    container.appendChild(legendDiv);
    
    // Animation
    let animationId = null;
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
    }
    
    animate();
    
    // Handle resize
    function handleResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        labelRenderer.setSize(width, height);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Button controls
    const resetBtn = document.getElementById('reset-view');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            camera.position.set(2.5, 1.6, 3.2);
            camera.lookAt(0, 0.8, 0);
            controls.target.set(0, 0.8, 0);
            controls.update();
        });
    }
    
    const toggleGridBtn = document.getElementById('toggle-grid');
    let gridVisible = true;
    if (toggleGridBtn) {
        toggleGridBtn.addEventListener('click', () => {
            gridVisible = !gridVisible;
            gridHelper.visible = gridVisible;
            axesHelper.visible = gridVisible;
        });
    }
    
    // Cleanup function
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        for (let i = 0; i < particles.length; i++) particles[i].remove();
        for (let i = 0; i < streamlines.length; i++) scene.remove(streamlines[i]);
        while (container.firstChild) container.removeChild(container.firstChild);
    };
}
