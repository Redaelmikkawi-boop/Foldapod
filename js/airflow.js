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

// ============================================
// SHELTER GEOMETRY FUNCTIONS
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

function createTriangularFace(v1, v2, v3, color = 0x66aaff, opacity = 0.7) {
    const group = new THREE.Group();
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    let normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    if (normal.y < 0) normal.negate();
    const extrudeDir = normal.clone().multiplyScalar(THICKNESS * s);
    const v1b = v1.clone().add(extrudeDir);
    const v2b = v2.clone().add(extrudeDir);
    const v3b = v3.clone().add(extrudeDir);
    const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide, shininess: 60, transparent: true, opacity: opacity });
    
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

function createQuadrilateralFace(v1, v2, v3, v4, color = 0x88aaff, opacity = 0.7) {
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
        group.add(createTriangularFace(origin, verts.B, verts.C, 0x88aaff, 0.6));
        group.add(createTriangularFace(verts.J, verts.K, apex, 0xff88aa, 0.6));
        const isDoorArea = (i >= DOOR_START_INDEX && i < DOOR_END_INDEX);
        if (!isDoorArea) {
            group.add(createQuadrilateralFace(verts.B, verts.C, verts.G, verts.F, 0x88ccff, 0.6));
            group.add(createQuadrilateralFace(verts.F, verts.G, verts.K, verts.J, 0x88ffaa, 0.6));
        }
    }
    return group;
}

// ============================================
// BOUNDING BOX FOR COLLISION DETECTION
// ============================================
class ShelterCollisionDetector {
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
            
            // Base triangle bounding box
            const baseMinX = Math.min(origin.x, verts.B.x, verts.C.x);
            const baseMaxX = Math.max(origin.x, verts.B.x, verts.C.x);
            const baseMinY = Math.min(origin.y, verts.B.y, verts.C.y);
            const baseMaxY = Math.max(origin.y, verts.B.y, verts.C.y);
            const baseMinZ = Math.min(origin.z, verts.B.z, verts.C.z);
            const baseMaxZ = Math.max(origin.z, verts.B.z, verts.C.z);
            
            this.boundingBoxes.push({
                minX: baseMinX, maxX: baseMaxX,
                minY: baseMinY, maxY: baseMaxY,
                minZ: baseMinZ, maxZ: baseMaxZ,
                type: 'base'
            });
            
            // Apex triangle bounding box
            const apexMinX = Math.min(verts.J.x, verts.K.x, apex.x);
            const apexMaxX = Math.max(verts.J.x, verts.K.x, apex.x);
            const apexMinY = Math.min(verts.J.y, verts.K.y, apex.y);
            const apexMaxY = Math.max(verts.J.y, verts.K.y, apex.y);
            const apexMinZ = Math.min(verts.J.z, verts.K.z, apex.z);
            const apexMaxZ = Math.max(verts.J.z, verts.K.z, apex.z);
            
            this.boundingBoxes.push({
                minX: apexMinX, maxX: apexMaxX,
                minY: apexMinY, maxY: apexMaxY,
                minZ: apexMinZ, maxZ: apexMaxZ,
                type: 'apex'
            });
            
            if (!(i >= DOOR_START_INDEX && i < DOOR_END_INDEX)) {
                // Middle quadrilateral bounding box
                const midMinX = Math.min(verts.B.x, verts.C.x, verts.F.x, verts.G.x);
                const midMaxX = Math.max(verts.B.x, verts.C.x, verts.F.x, verts.G.x);
                const midMinY = Math.min(verts.B.y, verts.C.y, verts.F.y, verts.G.y);
                const midMaxY = Math.max(verts.B.y, verts.C.y, verts.F.y, verts.G.y);
                const midMinZ = Math.min(verts.B.z, verts.C.z, verts.F.z, verts.G.z);
                const midMaxZ = Math.max(verts.B.z, verts.C.z, verts.F.z, verts.G.z);
                
                this.boundingBoxes.push({
                    minX: midMinX, maxX: midMaxX,
                    minY: midMinY, maxY: midMaxY,
                    minZ: midMinZ, maxZ: midMaxZ,
                    type: 'mid'
                });
            }
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
// AIRFLOW PARTICLE WITH COLLISION
// ============================================
class AirParticle {
    constructor(scene, startX, startY, startZ, collisionDetector) {
        this.scene = scene;
        this.collisionDetector = collisionDetector;
        this.position = new THREE.Vector3(startX, startY, startZ);
        this.startPosition = new THREE.Vector3(startX, startY, startZ);
        this.speed = 0.025 + Math.random() * 0.03;
        this.velocity = new THREE.Vector3(this.speed, 0, 0);
        this.size = 0.015 + Math.random() * 0.02;
        this.collided = false;
        this.collisionPoint = null;
        this.trailPoints = [];
        this.maxTrail = 8;
        
        const geometry = new THREE.SphereGeometry(this.size, 12, 12);
        const material = new THREE.MeshPhongMaterial({
            color: 0x44aaff,
            emissive: 0x2266aa,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.9
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
        
        // Trail lines
        this.trailGeometry = new THREE.BufferGeometry();
        this.trailMaterial = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 });
        this.trailLine = new THREE.Line(this.trailGeometry, this.trailMaterial);
        scene.add(this.trailLine);
    }
    
    update() {
        if (this.collided) {
            // Stay at collision point, gradually fade
            if (this.mesh.material.opacity > 0.01) {
                this.mesh.material.opacity -= 0.01;
                this.trailMaterial.opacity -= 0.01;
            }
            return;
        }
        
        const nextPosition = this.position.clone().add(this.velocity);
        
        // Check collision with shelter
        if (this.collisionDetector.checkCollision(nextPosition)) {
            this.collided = true;
            this.collisionPoint = this.position.clone();
            this.mesh.material.color.setHex(0xff4444);
            this.mesh.material.emissiveIntensity = 0.5;
            this.trailMaterial.color.setHex(0xff4444);
            return;
        }
        
        this.position.copy(nextPosition);
        
        // Add turbulence effect in wake region
        if (this.position.x > 0.3) {
            this.velocity.y += (Math.random() - 0.5) * 0.003;
            this.velocity.z += (Math.random() - 0.5) * 0.003;
            this.velocity.y *= 0.99;
            this.velocity.z *= 0.99;
        }
        
        // Add slight vertical oscillation for laminar flow visualization
        if (this.position.x < 0.2) {
            this.velocity.y += Math.sin(Date.now() * 0.002 + this.position.x * 2) * 0.0005;
        }
        
        this.mesh.position.copy(this.position);
        
        // Update trail
        this.trailPoints.unshift(this.position.clone());
        if (this.trailPoints.length > this.maxTrail) {
            this.trailPoints.pop();
        }
        
        // Update trail line geometry
        const points = this.trailPoints.slice().reverse();
        const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
        this.trailLine.geometry.dispose();
        this.trailLine.geometry = trailGeometry;
        
        // Color based on speed and turbulence
        const speedFactor = Math.min(1, this.velocity.length() / 0.04);
        const color = new THREE.Color().setHSL(0.55 - speedFactor * 0.3, 1, 0.5);
        this.mesh.material.color = color;
        
        // Reset if goes too far
        if (this.position.x > 2.2) {
            this.reset();
        }
    }
    
    reset() {
        this.position.copy(this.startPosition);
        this.velocity.set(this.speed, 0, 0);
        this.collided = false;
        this.trailPoints = [];
        this.mesh.material.opacity = 0.9;
        this.mesh.material.color.setHex(0x44aaff);
        this.mesh.material.emissiveIntensity = 0.2;
        this.trailMaterial.color.setHex(0x44aaff);
        this.trailMaterial.opacity = 0.4;
    }
    
    remove() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.trailLine);
        if (this.trailLine.geometry) this.trailLine.geometry.dispose();
    }
}

// ============================================
// STREAMLINES (Flow Lines)
// ============================================
class Streamline {
    constructor(scene, startX, startY, startZ, collisionDetector) {
        this.scene = scene;
        this.collisionDetector = collisionDetector;
        this.points = [];
        this.currentPoint = new THREE.Vector3(startX, startY, startZ);
        this.startPoint = new THREE.Vector3(startX, startY, startZ);
        this.velocity = new THREE.Vector3(0.03, 0, 0);
        this.maxPoints = 80;
        this.completed = false;
        
        this.material = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true });
        this.geometry = new THREE.BufferGeometry();
        this.line = new THREE.Line(this.geometry, this.material);
        scene.add(this.line);
        
        this.generate();
    }
    
    generate() {
        let point = this.currentPoint.clone();
        let steps = 0;
        
        while (steps < this.maxPoints && !this.completed) {
            this.points.push(point.clone());
            
            const nextPoint = point.clone().add(this.velocity);
            
            if (this.collisionDetector.checkCollision(nextPoint)) {
                this.completed = true;
                break;
            }
            
            point = nextPoint;
            steps++;
            
            // Add flow separation effect at edges
            if (point.x > 0.2 && point.x < 0.6) {
                this.velocity.y += Math.sin(point.x * 8) * 0.0008;
                this.velocity.z += Math.cos(point.x * 6) * 0.0008;
            }
            
            // Turbulent wake region
            if (point.x > 0.8) {
                this.velocity.y += (Math.random() - 0.5) * 0.002;
                this.velocity.z += (Math.random() - 0.5) * 0.002;
            }
            
            this.velocity.x = 0.03;
            
            if (point.x > 1.8) break;
        }
        
        this.updateGeometry();
        
        // Color based on flow regime
        const isTurbulent = this.points.some(p => p.x > 0.8);
        if (isTurbulent) {
            this.material.color.setHex(0xff8844);
        } else {
            this.material.color.setHex(0x44aaff);
        }
    }
    
    updateGeometry() {
        const positions = [];
        for (let i = 0; i < this.points.length; i++) {
            positions.push(this.points[i].x, this.points[i].y, this.points[i].z);
        }
        this.geometry.dispose();
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        this.line.geometry = this.geometry;
    }
    
    remove() {
        this.scene.remove(this.line);
        this.geometry.dispose();
    }
}

// ============================================
// INITIALIZE AIRFLOW SIMULATION
// ============================================
export function initAirflowSimulation(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('Container not found');
        return () => {};
    }
    
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    scene.fog = new THREE.FogExp2(0x0a0a2a, 0.002);
    
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 20);
    camera.position.set(2.8, 1.8, 3.8);
    camera.lookAt(0, 0.8, 0);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
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
    const fillLight = new THREE.PointLight(0x4488ff, 0.4);
    fillLight.position.set(0.5, 1, 1);
    scene.add(fillLight);
    const backLight = new THREE.PointLight(0xffaa66, 0.3);
    backLight.position.set(-0.5, 1, -1);
    scene.add(backLight);
    
    // Grid
    const gridHelper = new THREE.GridHelper(4.5, 35, 0x88aaff, 0x335588);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);
    
    // Create shelter model
    const shelterModel = createFullModel();
    scene.add(shelterModel);
    
    // Add wireframe edges to shelter for better visibility
    shelterModel.traverse(child => {
        if (child.isMesh) {
            const edgesGeo = new THREE.EdgesGeometry(child.geometry);
            const edgesMat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.3 });
            const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
            child.add(wireframe);
        }
    });
    
    // Add apex marker
    const apexMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xff88aa })
    );
    apexMarker.position.set(0, APEX_Y * s, 0);
    scene.add(apexMarker);
    
    // Collision detector
    const collisionDetector = new ShelterCollisionDetector();
    
    // Particles
    const particles = [];
    const particleCount = 300;
    
    for (let i = 0; i < particleCount; i++) {
        const startX = -1.6;
        const startY = -0.3 + Math.random() * 1.8;
        const startZ = -1.0 + Math.random() * 2.0;
        const particle = new AirParticle(scene, startX, startY, startZ, collisionDetector);
        particles.push(particle);
    }
    
    // Streamlines
    const streamlines = [];
    const streamlineCount = 24;
    
    for (let i = 0; i < streamlineCount; i++) {
        const startY = -0.2 + (i / streamlineCount) * 1.7;
        const startZ = -0.9 + (i % 8) * 0.25;
        const streamline = new Streamline(scene, -1.5, startY, startZ, collisionDetector);
        streamlines.push(streamline);
    }
    
    // Wind direction arrow
    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1.5, 1.3, 0.9),
        0.9,
        0x88aaff,
        0.4,
        0.25
    );
    scene.add(arrowHelper);
    
    // CSS2D Labels
    const css2DRenderer = new CSS2DRenderer();
    css2DRenderer.setSize(container.clientWidth, container.clientHeight);
    css2DRenderer.domElement.style.position = 'absolute';
    css2DRenderer.domElement.style.top = '0px';
    css2DRenderer.domElement.style.left = '0px';
    css2DRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(css2DRenderer.domElement);
    
    const windLabelDiv = document.createElement('div');
    windLabelDiv.innerHTML = '💨 Wind Direction → 10 m/s<br><span style="font-size:10px">Blue = Laminar | Orange = Turbulent | Red = Impact</span>';
    windLabelDiv.style.color = '#88aaff';
    windLabelDiv.style.fontSize = '12px';
    windLabelDiv.style.fontWeight = 'bold';
    windLabelDiv.style.fontFamily = 'monospace';
    windLabelDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    windLabelDiv.style.padding = '6px 12px';
    windLabelDiv.style.borderRadius = '8px';
    windLabelDiv.style.borderLeft = '3px solid #88aaff';
    const windLabel = new CSS2DObject(windLabelDiv);
    windLabel.position.set(-1.5, 1.5, 1.2);
    scene.add(windLabel);
    
    const bcPanelDiv = document.createElement('div');
    bcPanelDiv.innerHTML = `
        <strong style="color:#ffaa66">🌬️ CFD ANALYSIS</strong><br>
        ─────────────────<br>
        Inlet Velocity: <span style="color:#88aaff">10 m/s</span><br>
        Reynolds Number: <span style="color:#88aaff">~1.2×10⁶</span><br>
        Flow Regime: <span style="color:#ff8844">Turbulent</span><br>
        Wall Interaction: <span style="color:#ff4444">Red = Impact</span><br>
        Separation Zone: <span style="color:#ff8844">Orange = Wake</span>
    `;
    bcPanelDiv.style.backgroundColor = 'rgba(0,0,0,0.75)';
    bcPanelDiv.style.color = '#ccc';
    bcPanelDiv.style.fontSize = '10px';
    bcPanelDiv.style.fontFamily = 'monospace';
    bcPanelDiv.style.padding = '10px 14px';
    bcPanelDiv.style.borderRadius = '8px';
    bcPanelDiv.style.borderLeft = '3px solid #ffaa66';
    bcPanelDiv.style.width = '200px';
    const bcPanel = new CSS2DObject(bcPanelDiv);
    bcPanel.position.set(-1.6, 1.3, -1.2);
    scene.add(bcPanel);
    
    // Flow legend
    const legendDiv = document.createElement('div');
    legendDiv.innerHTML = `
        <strong>Flow Visualization</strong><br>
        <span style="color:#44aaff">●</span> Laminar Flow<br>
        <span style="color:#ff8844">●</span> Turbulent Wake<br>
        <span style="color:#ff4444">●</span> Impact/Separation
    `;
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
    legendDiv.style.borderLeft = '3px solid #44aaff';
    container.appendChild(legendDiv);
    
    let animationId = null;
    let frame = 0;
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        frame++;
        
        // Update particles every frame
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        
        // Update streamlines occasionally to show flow patterns
        if (frame % 180 === 0) {
            for (let i = 0; i < streamlines.length; i++) {
                const newStreamline = new Streamline(scene, -1.5, streamlines[i].startPoint.y, streamlines[i].startPoint.z, collisionDetector);
                streamlines[i].remove();
                streamlines[i] = newStreamline;
            }
        }
        
        controls.update();
        renderer.render(scene, camera);
        css2DRenderer.render(scene, camera);
    }
    
    animate();
    
    function handleResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        css2DRenderer.setSize(width, height);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Button controls
    const resetViewBtn = document.getElementById('reset-view');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            camera.position.set(2.8, 1.8, 3.8);
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
        });
    }
    
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        for (let i = 0; i < particles.length; i++) particles[i].remove();
        for (let i = 0; i < streamlines.length; i++) streamlines[i].remove();
        while (container.firstChild) container.removeChild(container.firstChild);
    };
}
