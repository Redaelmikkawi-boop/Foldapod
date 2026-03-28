import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ============================================
// DIMENSIONS (all in mm)
// ============================================
const GROUND_Y = 0;           // Ground level
const BASE_WIDTH = 378;       // Bottom edge length (mm)
const SLANT_EDGE = 605.3;     // Slant edge length (mm)
const HEIGHT = 949;           // Vertical height from ground to top (mm)
const THICKNESS = 5;          // Panel thickness (mm)

// Slant face midpoint coordinates (given)
const SLANT_MID_X = 1210.5;   // X coordinate of slant face midpoint
const SLANT_MID_Y = 605.3;    // Y coordinate (height) of slant face midpoint

// Scale for visualization (1 mm = 0.001 units, so model fits in view)
const SCALE = 0.001;
const s = SCALE;

// ============================================
// VERTEX CALCULATIONS
// ============================================
// Triangle is on ground with bottom edge along X-axis
// Bottom edge from (-BASE_WIDTH/2, 0, 0) to (BASE_WIDTH/2, 0, 0)
// Top vertex at (0, HEIGHT, 0)

const vertices = {
    // Bottom left (on ground)
    B: new THREE.Vector3(-(BASE_WIDTH/2) * s, GROUND_Y * s, 0),
    // Bottom right (on ground)
    C: new THREE.Vector3((BASE_WIDTH/2) * s, GROUND_Y * s, 0),
    // Top vertex (at height)
    A: new THREE.Vector3(0, HEIGHT * s, 0)
};

// Verify slant edge length (should be 605.3 mm)
const computedSlant = vertices.B.distanceTo(vertices.A) / s;
console.log(`✓ Slant edge: ${computedSlant.toFixed(1)} mm (expected: ${SLANT_EDGE} mm)`);

// Verify bottom edge
const computedBase = vertices.B.distanceTo(vertices.C) / s;
console.log(`✓ Base width: ${computedBase.toFixed(1)} mm (expected: ${BASE_WIDTH} mm)`);

// ============================================
// CREATE TRIANGULAR FACE WITH THICKNESS
// ============================================
function createTriangularFaceWithThickness(v1, v2, v3, thickness, color = 0x66aaff) {
    const group = new THREE.Group();
    
    // Calculate face normal (pointing outward)
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    
    // Extrude in the direction of the normal (creates thickness)
    const extrudeDir = normal.clone().multiplyScalar(thickness);
    
    // Back face vertices
    const v1b = v1.clone().add(extrudeDir);
    const v2b = v2.clone().add(extrudeDir);
    const v3b = v3.clone().add(extrudeDir);
    
    const material = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide,
        shininess: 65,
        transparent: true,
        opacity: 0.85,
        emissive: 0x001133
    });
    
    // Front face
    const frontGeo = new THREE.BufferGeometry();
    const frontVerts = [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z];
    frontGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(frontVerts), 3));
    frontGeo.setIndex([0, 1, 2]);
    frontGeo.computeVertexNormals();
    group.add(new THREE.Mesh(frontGeo, material));
    
    // Back face
    const backGeo = new THREE.BufferGeometry();
    const backVerts = [v1b.x, v1b.y, v1b.z, v2b.x, v2b.y, v2b.z, v3b.x, v3b.y, v3b.z];
    backGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(backVerts), 3));
    backGeo.setIndex([0, 1, 2]);
    backGeo.computeVertexNormals();
    group.add(new THREE.Mesh(backGeo, material));
    
    // Side faces
    group.add(createSideFace(v1, v2, v2b, v1b, color));
    group.add(createSideFace(v2, v3, v3b, v2b, color));
    group.add(createSideFace(v3, v1, v1b, v3b, color));
    
    return group;
}

function createSideFace(p1, p2, p3, p4, color) {
    const geometry = new THREE.BufferGeometry();
    const verts = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z];
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide, shininess: 65, transparent: true, opacity: 0.85 });
    return new THREE.Mesh(geometry, material);
}

// ============================================
// ADD WIREFRAME EDGES
// ============================================
function addEdgesToGroup(group, verts, thickness) {
    const normal = new THREE.Vector3(0, 0, 1);
    const extrudeDir = normal.multiplyScalar(thickness);
    const v1b = verts.A.clone().add(extrudeDir);
    const v2b = verts.B.clone().add(extrudeDir);
    const v3b = verts.C.clone().add(extrudeDir);
    
    const allVerts = [verts.A, verts.B, verts.C, v1b, v2b, v3b];
    const edges = [[0,1], [1,2], [2,0], [3,4], [4,5], [5,3], [0,3], [1,4], [2,5]];
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000 });
    
    edges.forEach(edge => {
        const points = [allVerts[edge[0]], allVerts[edge[1]]];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        group.add(new THREE.Line(geo, edgeMat));
    });
}

// ============================================
// SCENE SETUP
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a2a);
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10);
camera.position.set(1.5, 1.2, 2);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.5, 0);

// ============================================
// LIGHTS
// ============================================
const ambient = new THREE.AmbientLight(0x404060);
scene.add(ambient);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(2, 3, 2);
mainLight.castShadow = true;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x4488ff, 0.4);
fillLight.position.set(-1, 1.5, 1.5);
scene.add(fillLight);

const backLight = new THREE.PointLight(0xffaa66, 0.3);
backLight.position.set(0.5, 1, -1.5);
scene.add(backLight);

const groundLight = new THREE.PointLight(0x88aaff, 0.3);
groundLight.position.set(0, 0.2, 0.5);
scene.add(groundLight);

// ============================================
// GROUND REFERENCE
// ============================================
const gridHelper = new THREE.GridHelper(2.5, 25, 0x88aaff, 0x335588);
gridHelper.position.y = -0.02;
scene.add(gridHelper);

// Ground plane (transparent)
const groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.5),
    new THREE.MeshPhongMaterial({ color: 0x226688, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = -0.02;
scene.add(groundPlane);

// Axes helper
const axesHelper = new THREE.AxesHelper(1.2);
scene.add(axesHelper);

// ============================================
// CREATE THE TRIANGULAR FACE
// ============================================
const triangleGroup = createTriangularFaceWithThickness(vertices.A, vertices.B, vertices.C, THICKNESS * s, 0x66aaff);
addEdgesToGroup(triangleGroup, vertices, THICKNESS * s);
scene.add(triangleGroup);

// ============================================
// MARKERS FOR KEY POINTS
// ============================================
function addMarker(pos, color, size = 0.018) {
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(size, 24, 24),
        new THREE.MeshStandardMaterial({ color: color, emissive: 0x331100 })
    );
    sphere.position.copy(pos);
    scene.add(sphere);
}

addMarker(vertices.A, 0xff6666);
addMarker(vertices.B, 0x66ff66);
addMarker(vertices.C, 0x66ff66);

// Slant face midpoint marker
const slantMidpoint = new THREE.Vector3(SLANT_MID_X * s, SLANT_MID_Y * s, 0);
addMarker(slantMidpoint, 0xffaa66, 0.022);

// ============================================
// CSS2D LABELS
// ============================================
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

function createLabel(text, position, color = '#ffffff', bgOpacity = 0.7) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = color;
    div.style.fontSize = '12px';
    div.style.fontWeight = 'bold';
    div.style.fontFamily = 'monospace';
    div.style.textShadow = '1px 1px 0px black';
    div.style.backgroundColor = `rgba(0,0,0,${bgOpacity})`;
    div.style.padding = '2px 8px';
    div.style.borderRadius = '4px';
    div.style.borderLeft = `3px solid ${color}`;
    div.style.whiteSpace = 'nowrap';
    const label = new CSS2DObject(div);
    label.position.copy(position);
    scene.add(label);
    return label;
}

createLabel('Top Vertex (949 mm)', vertices.A.clone().add(new THREE.Vector3(0.08, 0.05, 0.05)), '#ff8888');
createLabel('Bottom Edge (378 mm)', new THREE.Vector3(0, -0.08, 0.08), '#88ff88');
createLabel('Slant Edge (605.3 mm)', new THREE.Vector3(-0.18, 0.45, 0.08), '#ffaa66');
createLabel(`Thickness: ${THICKNESS} mm`, new THREE.Vector3(0.12, 0.25, 0.12), '#88aaff');
createLabel('📌 Slant Face Midpoint', slantMidpoint.clone().add(new THREE.Vector3(0.12, 0.05, 0.05)), '#ffaa66', 0.6);

// ============================================
// VISUAL LINES FOR DIMENSIONS
// ============================================
// Slant edge line
const slantLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([vertices.A, vertices.B]),
    new THREE.LineBasicMaterial({ color: 0xffaa66, linewidth: 2 })
);
scene.add(slantLine);

// Base line
const baseLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([vertices.B, vertices.C]),
    new THREE.LineBasicMaterial({ color: 0x88ff88, linewidth: 2 })
);
scene.add(baseLine);

// Height line (from ground center to top)
const groundCenter = new THREE.Vector3(0, 0, 0);
const heightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([groundCenter, vertices.A]),
    new THREE.LineBasicMaterial({ color: 0xff8888, linewidth: 1.5, transparent: true, opacity: 0.6 })
);
scene.add(heightLine);

// Slant midpoint to top reference line
const midToTop = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([slantMidpoint, vertices.A]),
    new THREE.LineBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 0.4 })
);
scene.add(midToTop);

// ============================================
// ANIMATION & CONTROLS
// ============================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Toggle wireframe
let wireframe = false;
document.getElementById('toggle-wireframe').addEventListener('click', () => {
    wireframe = !wireframe;
    scene.traverse(child => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.wireframe = wireframe);
            else child.material.wireframe = wireframe;
        }
    });
});

// Reset view
document.getElementById('reset-view').addEventListener('click', () => {
    camera.position.set(1.5, 1.2, 2);
    camera.lookAt(0, 0.5, 0);
    controls.target.set(0, 0.5, 0);
    controls.update();
});

// Toggle grid
let gridVisible = true;
document.getElementById('toggle-grid').addEventListener('click', () => {
    gridVisible = !gridVisible;
    gridHelper.visible = gridVisible;
    groundPlane.visible = gridVisible;
});

console.log('========================================');
console.log('✓ Triangle positioned on ground');
console.log(`  Bottom edge: ${BASE_WIDTH} mm at Y=0`);
console.log(`  Height: ${HEIGHT} mm`);
console.log(`  Slant edge: ${SLANT_EDGE} mm`);
console.log(`  Slant midpoint: (${SLANT_MID_X} mm, ${SLANT_MID_Y} mm)`);
console.log('========================================');
