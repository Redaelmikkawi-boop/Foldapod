import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ============================================
// DIMENSIONS (same as model.js)
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

// Wind parameters
const WIND_SPEED = 10; // m/s
const PARTICLE_COUNT = 200;
const PARTICLE_SPEED = 0.05;

// ============================================
// HELPER FUNCTIONS
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

// ============================================
// FACE CREATION FUNCTIONS
// ============================================
function createTriangularFace(v1, v2, v3, color = 0x66aaff, opacity = 0.85) {
    const group = new THREE.Group();
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    let normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    if (normal.y < 0) normal.negate();
    const extrudeDir = normal.clone().multiplyScalar(THICKNESS * s);
    const v1b = v1.clone().add(extrudeDir);
    const v2b = v2.clone().add(extrudeDir);
    const v3b = v3.clone().add(extrudeDir);
    const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide, shininess: 80, transparent: true, opacity: opacity });
    
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
    
    group.add(createSideFace(v1, v2, v2b, v1b, color));
    group.add(createSideFace(v2, v3, v3b, v2b, color));
    group.add(createSideFace(v3, v1, v1b, v3b, color));
    return group;
}

function createQuadrilateralFace(v1, v2, v3, v4, color = 0x88aaff, opacity = 0.85) {
    const group = new THREE.Group();
    group.add(createTriangularFace(v1, v2, v3, color, opacity));
    group.add(createTriangularFace(v1, v3, v4, color, opacity));
    return group;
}

function createSideFace(p1, p2, p3, p4, color) {
    const geometry = new THREE.BufferGeometry();
    const verts = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z];
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide, shininess: 65, transparent: true, opacity: 0.7 });
    return new THREE.Mesh(geometry, material);
}

function createFullModel() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(0, 0, 0);
    const apex = new THREE.Vector3(0, APEX_Y * s, 0);
    
    for (let i = 0; i < FACES_F1_F4; i++) {
        const angle = i * ANGLE_STEP_FULL;
        const verts = getVerticesAtAngle(angle);
        group.add(createTriangularFace(origin, verts.B, verts.C, 0xff6666, 0.8));
        group.add(createTriangularFace(verts.J, verts.K, apex, 0xff66ff, 0.9));
        const isDoorArea = (i >= DOOR_START_INDEX && i < DOOR_END_INDEX);
        if (!isDoorArea) {
            group.add(createQuadrilateralFace(verts.B, verts.C, verts.G, verts.F, 0x66aaff, 0.85));
            group.add(createQuadrilateralFace(verts.F, verts.G, verts.K, verts.J, 0x66ff66, 0.85));
        }
    }
    return group;
}

// ============================================
// PARTICLE SYSTEM FOR AIRFLOW
// ============================================
class AirParticle {
    constructor(scene, startX, startY, startZ) {
        this.scene = scene;
        this.position = new THREE.Vector3(startX, startY, startZ);
        this.speed = 0.03 + Math.random() * 0.04;
        this.size = 0.02 + Math.random() * 0.03;
        
        const geometry = new THREE.SphereGeometry(this.size, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            emissive: 0x2266aa,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.7
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
        
        // Trail effect
        this.trailPositions = [];
        this.trailLength = 5;
    }
    
    update() {
        // Move from negative X to positive X
        this.position.x += this.speed;
        
        // Add slight vertical and lateral oscillation for turbulence effect
        this.position.y += Math.sin(Date.now() * 0.003 + this.position.x * 0.5) * 0.002;
        this.position.z += Math.cos(Date.now() * 0.002 + this.position.x * 0.3) * 0.002;
        
        // Reset when goes beyond positive X limit
        if (this.position.x > 1.8) {
            this.position.x = -1.5;
            this.position.y = -0.2 + Math.random() * 1.4;
            this.position.z = -0.8 + Math.random() * 1.6;
        }
        
        this.mesh.position.copy(this.position);
        
        // Update trail
        this.trailPositions.unshift(this.position.clone());
        if (this.trailPositions.length > this.trailLength) {
            this.trailPositions.pop();
        }
    }
    
    updateTrail() {
        // Update trail opacity based on age
        for (let i = 0; i < this.trailPositions.length; i++) {
            const age = i / this.trailLength;
            // Trail would be drawn with lines, but for performance we skip
        }
    }
    
    remove() {
        this.scene.remove(this.mesh);
    }
}

// ============================================
// FLOW LINES (Streamlines)
// ============================================
function createFlowLines(scene, startX, startY, startZ, endX, count) {
    const lines = [];
    const material = new THREE.LineBasicMaterial({ color: 0x44aaff });
    
    for (let i = 0; i < count; i++) {
        const yOffset = (i / count) * 1.5 - 0.5;
        const points = [];
        for (let x = startX; x <= endX; x += 0.05) {
            points.push(new THREE.Vector3(x, startY + yOffset + Math.sin(x * 3) * 0.05, startZ));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        lines.push(line);
    }
    return lines;
}

// ============================================
// INITIALIZE AIRFLOW SIMULATION
// ============================================
export function initAirflowSimulation(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('Container not found');
        return;
    }
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    scene.fog = new THREE.FogExp2(0x0a0a2a, 0.003);
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 20);
    camera.position.set(2.5, 1.5, 3.5);
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
    controls.enableZoom = true;
    
    // Lights
    const ambient = new THREE.AmbientLight(0x404060);
    scene.add(ambient);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(2, 3, 2);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    const fillLight = new THREE.PointLight(0x4488ff, 0.5);
    fillLight.position.set(1, 1.5, 1);
    scene.add(fillLight);
    
    const backLight = new THREE.PointLight(0xffaa66, 0.4);
    backLight.position.set(-1, 1.2, -1.5);
    scene.add(backLight);
    
    const rimLight = new THREE.PointLight(0xff8866, 0.5);
    rimLight.position.set(1.5, 1, 1.2);
    scene.add(rimLight);
    
    // Grid and axes
    const gridHelper = new THREE.GridHelper(4, 30, 0x88aaff, 0x335588);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);
    
    // Create the shelter model
    const shelterModel = createFullModel();
    scene.add(shelterModel);
    
    // Add markers for reference
    const apexMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xff88ff, emissive: 0xff44ff, emissiveIntensity: 0.4 })
    );
    apexMarker.position.set(0, APEX_Y * s, 0);
    scene.add(apexMarker);
    
    const originMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xff6666 })
    );
    originMarker.position.set(0, 0, 0);
    scene.add(originMarker);
    
    // ============================================
    // AIRFLOW PARTICLES (moving from -X to +X)
    // ============================================
    const particles = [];
    const particleCount = 250;
    
    for (let i = 0; i < particleCount; i++) {
        const startX = -1.5 + Math.random() * 0.5;
        const startY = -0.2 + Math.random() * 1.5;
        const startZ = -0.8 + Math.random() * 1.6;
        const particle = new AirParticle(scene, startX, startY, startZ);
        particles.push(particle);
    }
    
    // ============================================
    // STREAMLINES (flow lines)
    // ============================================
    const streamlines = [];
    const streamlineCount = 12;
    
    for (let i = 0; i < streamlineCount; i++) {
        const yPos = -0.2 + (i / streamlineCount) * 1.6;
        const points = [];
        for (let x = -1.4; x <= 1.8; x += 0.08) {
            points.push(new THREE.Vector3(x, yPos + Math.sin(x * 2.5) * 0.03, -0.6 + Math.cos(x * 1.8) * 0.3));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        streamlines.push(line);
    }
    
    for (let i = 0; i < streamlineCount; i++) {
        const yPos = -0.2 + (i / streamlineCount) * 1.6;
        const points = [];
        for (let x = -1.4; x <= 1.8; x += 0.08) {
            points.push(new THREE.Vector3(x, yPos + Math.sin(x * 2.5 + 1) * 0.03, 0.5 + Math.cos(x * 1.8) * 0.3));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        streamlines.push(line);
    }
    
    // ============================================
    // WIND DIRECTION INDICATOR (Arrow)
    // ============================================
    const arrowColor = 0x88aaff;
    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1.2, 1.2, 0.8),
        0.8,
        arrowColor,
        0.3,
        0.2
    );
    scene.add(arrowHelper);
    
    // Add wind speed text label
    const windLabelDiv = document.createElement('div');
    windLabelDiv.textContent = '💨 Wind Direction → 10 m/s';
    windLabelDiv.style.color = '#88aaff';
    windLabelDiv.style.fontSize = '14px';
    windLabelDiv.style.fontWeight = 'bold';
    windLabelDiv.style.fontFamily = 'monospace';
    windLabelDiv.style.backgroundColor = 'rgba(0,0,0,0.6)';
    windLabelDiv.style.padding = '4px 12px';
    windLabelDiv.style.borderRadius = '20px';
    windLabelDiv.style.borderLeft = '3px solid #88aaff';
    
    const windLabel = new CSS2DObject(windLabelDiv);
    windLabel.position.set(-1.2, 1.4, 0.8);
    scene.add(windLabel);
    
    // ============================================
    // BOUNDARY CONDITIONS PANEL (CSS2D)
    // ============================================
    const bcPanelDiv = document.createElement('div');
    bcPanelDiv.innerHTML = `
        <strong style="color:#ffaa66">🌬️ BOUNDARY CONDITIONS</strong><br>
        ─────────────────<br>
        Inlet Velocity: <span style="color:#88aaff">10 m/s</span> (Normal Wind)<br>
        Outlet Pressure: <span style="color:#88aaff">101325 Pa</span><br>
        Turbulence Intensity: <span style="color:#88aaff">5%</span><br>
        Wall Shear Stress: <span style="color:#88aaff">0.5 Pa</span><br>
        Air Density: <span style="color:#88aaff">1.225 kg/m³</span><br>
        Reynolds Number: <span style="color:#88aaff">~1.2×10⁶</span> (Turbulent)<br>
        Wind Direction: <span style="color:#88aaff">-X → +X</span>
    `;
    bcPanelDiv.style.backgroundColor = 'rgba(0,0,0,0.75)';
    bcPanelDiv.style.color = '#ccc';
    bcPanelDiv.style.fontSize = '11px';
    bcPanelDiv.style.fontFamily = 'monospace';
    bcPanelDiv.style.padding = '12px 16px';
    bcPanelDiv.style.borderRadius = '8px';
    bcPanelDiv.style.borderLeft = '3px solid #ffaa66';
    bcPanelDiv.style.backdropFilter = 'blur(5px)';
    bcPanelDiv.style.width = '220px';
    
    const bcPanel = new CSS2DObject(bcPanelDiv);
    bcPanel.position.set(-1.5, 1.2, -1);
    scene.add(bcPanel);
    
    // ============================================
    // ANIMATION LOOP
    // ============================================
    let animationId = null;
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        // Update particles
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        
        // Update controls and render
        controls.update();
        renderer.render(scene, camera);
        
        // CSS2D renderer
        if (window.css2DRenderer) {
            window.css2DRenderer.render(scene, camera);
        }
    }
    
    // CSS2D Renderer for labels
    const css2DRenderer = new CSS2DRenderer();
    css2DRenderer.setSize(container.clientWidth, container.clientHeight);
    css2DRenderer.domElement.style.position = 'absolute';
    css2DRenderer.domElement.style.top = '0px';
    css2DRenderer.domElement.style.left = '0px';
    css2DRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(css2DRenderer.domElement);
    window.css2DRenderer = css2DRenderer;
    
    // Handle window resize
    function handleResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        css2DRenderer.setSize(width, height);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Start animation
    animate();
    
    // Return cleanup function
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        for (let i = 0; i < particles.length; i++) {
            particles[i].remove();
        }
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    };
}
