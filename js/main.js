import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Dimensions in mm
const HEIGHT = 949;      // Height of triangle (origin to top vertex)
const BASE = 378;        // Base width at bottom
const SLANT = 605.3;     // Slant edge length (hypotenuse of side face)
const THICKNESS = 5;     // Thickness of the face (mm)

// Convert mm to scene units (scale down for better viewing)
const SCALE = 0.001;     // 1 mm = 0.001 units, so 949mm = 0.949 units
const s = SCALE;

// Calculate vertex positions in 3D space
// Triangle lies in YZ plane initially (X = 0 for front face)
// Vertex A: Top point at origin (0, height, 0)
// Vertex B: Bottom left (-base/2, 0, 0)
// Vertex C: Bottom right (base/2, 0, 0)

const vertices = {
    A: new THREE.Vector3(0, HEIGHT * s, 0),
    B: new THREE.Vector3(-(BASE/2) * s, 0, 0),
    C: new THREE.Vector3((BASE/2) * s, 0, 0)
};

// Verify slant edge length (should be ~605.3mm)
const computedSlant = vertices.B.distanceTo(vertices.A) / s;
console.log(`Computed slant: ${computedSlant.toFixed(1)} mm (expected: ${SLANT} mm)`);

// Function to create a single triangular face with thickness
function createTriangularFaceWithThickness(v1, v2, v3, thickness, color = 0x88aaff) {
    const group = new THREE.Group();
    
    // Calculate face normal (front face)
    const normal = new THREE.Vector3();
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    normal.crossVectors(edge1, edge2).normalize();
    
    // Extrude direction (perpendicular to face)
    const extrudeDir = normal.clone().multiplyScalar(thickness);
    
    // Back face vertices
    const v1b = v1.clone().add(extrudeDir);
    const v2b = v2.clone().add(extrudeDir);
    const v3b = v3.clone().add(extrudeDir);
    
    // Material
    const material = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide,
        shininess: 60,
        transparent: true,
        opacity: 0.85
    });
    
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: false });
    
    // Create all 5 faces of the extruded triangular prism
    
    // 1. Front face (original triangle)
    const frontGeometry = new THREE.BufferGeometry();
    const frontVertices = [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z];
    frontGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(frontVertices), 3));
    frontGeometry.setIndex([0, 1, 2]);
    frontGeometry.computeVertexNormals();
    const frontMesh = new THREE.Mesh(frontGeometry, material);
    group.add(frontMesh);
    
    // 2. Back face (extruded triangle)
    const backGeometry = new THREE.BufferGeometry();
    const backVertices = [v1b.x, v1b.y, v1b.z, v2b.x, v2b.y, v2b.z, v3b.x, v3b.y, v3b.z];
    backGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(backVertices), 3));
    backGeometry.setIndex([0, 1, 2]);
    backGeometry.computeVertexNormals();
    const backMesh = new THREE.Mesh(backGeometry, material);
    group.add(backMesh);
    
    // 3. Side faces (rectangular)
    // Side A-B (edge from v1 to v2)
    const sideAB = createSideFace(v1, v2, v2b, v1b, color);
    group.add(sideAB);
    
    // Side B-C (edge from v2 to v3)
    const sideBC = createSideFace(v2, v3, v3b, v2b, color);
    group.add(sideBC);
    
    // Side C-A (edge from v3 to v1)
    const sideCA = createSideFace(v3, v1, v1b, v3b, color);
    group.add(sideCA);
    
    return group;
}

// Helper function to create a rectangular side face between four vertices
function createSideFace(p1, p2, p3, p4, color) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [
        p1.x, p1.y, p1.z,
        p2.x, p2.y, p2.z,
        p3.x, p3.y, p3.z,
        p4.x, p4.y, p4.z
    ];
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    // Two triangles to form rectangle: (p1,p2,p3) and (p1,p3,p4)
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide,
        shininess: 60,
        transparent: true,
        opacity: 0.85
    });
    
    return new THREE.Mesh(geometry, material);
}

// Function to add edges (wireframe) for better visualization
function addEdgesToGroup(group, vertices, thickness) {
    const extrudeDir = new THREE.Vector3(0, 0, thickness);
    const v1b = vertices.A.clone().add(extrudeDir);
    const v2b = vertices.B.clone().add(extrudeDir);
    const v3b = vertices.C.clone().add(extrudeDir);
    
    const allVertices = [vertices.A, vertices.B, vertices.C, v1b, v2b, v3b];
    const edges = [
        [0,1], [1,2], [2,0], // Front face edges
        [3,4], [4,5], [5,3], // Back face edges
        [0,3], [1,4], [2,5]  // Connecting edges
    ];
    
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    
    edges.forEach(edge => {
        const points = [allVertices[edge[0]], allVertices[edge[1]]];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, edgeMaterial);
        group.add(line);
    });
}

// Setup scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);
scene.fog = new THREE.FogExp2(0x111122, 0.005);

// Setup camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(1, 0.8, 1.5);
camera.lookAt(0, 0.5, 0);

// Setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.target.set(0, 0.5, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(2, 5, 3);
mainLight.castShadow = true;
mainLight.receiveShadow = true;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x4466cc, 0.3);
fillLight.position.set(-1, 1, 2);
scene.add(fillLight);

const backLight = new THREE.PointLight(0xffaa66, 0.2);
backLight.position.set(0, 1, -2);
scene.add(backLight);

const rimLight = new THREE.PointLight(0xffaa88, 0.5);
rimLight.position.set(1, 1.5, -1);
scene.add(rimLight);

// Add grid helper (ground reference)
const gridHelper = new THREE.GridHelper(2, 20, 0x88aaff, 0x335588);
gridHelper.position.y = -0.05;
scene.add(gridHelper);

// Add axes helper (optional)
const axesHelper = new THREE.AxesHelper(0.8);
scene.add(axesHelper);

// Create the triangular face with thickness
const triangleGroup = createTriangularFaceWithThickness(vertices.A, vertices.B, vertices.C, THICKNESS * s, 0x66aaff);

// Add edges for better visualization
addEdgesToGroup(triangleGroup, vertices, THICKNESS * s);

scene.add(triangleGroup);

// Add vertex markers (spheres) to show key points
const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x441111 });
const markers = [
    { pos: vertices.A, color: 0xff6666, label: "Top Vertex (949mm)" },
    { pos: vertices.B, color: 0x66ff66, label: "Bottom Left (-189mm, 0)" },
    { pos: vertices.C, color: 0x66ff66, label: "Bottom Right (189mm, 0)" }
];

markers.forEach(m => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), new THREE.MeshStandardMaterial({ color: m.color, emissive: 0x331100 }));
    sphere.position.copy(m.pos);
    scene.add(sphere);
});

// Add dimension labels using CSS2DRenderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

function createLabel(text, position, color = '#ffffff') {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = color;
    div.style.fontSize = '14px';
    div.style.fontWeight = 'bold';
    div.style.textShadow = '1px 1px 0px black';
    div.style.backgroundColor = 'rgba(0,0,0,0.6)';
    div.style.padding = '2px 6px';
    div.style.borderRadius = '4px';
    div.style.borderLeft = `3px solid ${color}`;
    div.style.fontFamily = 'monospace';
    const label = new CSS2DObject(div);
    label.position.copy(position);
    scene.add(label);
    return label;
}

// Add dimension labels at key positions
createLabel('Top Vertex (949 mm)', vertices.A.clone().add(new THREE.Vector3(0.05, 0.05, 0.05)), '#ff8888');
createLabel('Base Width: 378 mm', new THREE.Vector3(0, -0.05, 0.05), '#88ff88');
createLabel('Slant Edge: 605.3 mm', new THREE.Vector3(-0.15, 0.4, 0.08), '#ffaa66');
createLabel(`Thickness: ${THICKNESS} mm`, new THREE.Vector3(0.15, 0.2, 0.12), '#88aaff');

// Add a line to visualize the slant edge
const slantLinePoints = [vertices.A, vertices.B];
const slantGeometry = new THREE.BufferGeometry().setFromPoints(slantLinePoints);
const slantLine = new THREE.Line(slantGeometry, new THREE.LineBasicMaterial({ color: 0xffaa66, linewidth: 2 }));
scene.add(slantLine);

// Add a line for the base
const baseLinePoints = [vertices.B, vertices.C];
const baseGeometry = new THREE.BufferGeometry().setFromPoints(baseLinePoints);
const baseLine = new THREE.Line(baseGeometry, new THREE.LineBasicMaterial({ color: 0x88ff88, linewidth: 2 }));
scene.add(baseLine);

// Add a line for the height (vertical from base center to top)
const heightCenter = new THREE.Vector3(0, 0, 0);
const heightLinePoints = [heightCenter, vertices.A];
const heightGeometry = new THREE.BufferGeometry().setFromPoints(heightLinePoints);
const heightLine = new THREE.Line(heightGeometry, new THREE.LineBasicMaterial({ color: 0xff8888, linewidth: 2, transparent: true, opacity: 0.5 }));
scene.add(heightLine);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update controls
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

// Toggle wireframe mode
let wireframeMode = false;
document.getElementById('toggle-wireframe').addEventListener('click', () => {
    wireframeMode = !wireframeMode;
    scene.traverse(child => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.wireframe = wireframeMode);
            } else {
                child.material.wireframe = wireframeMode;
            }
        }
    });
});

// Reset view
document.getElementById('reset-view').addEventListener('click', () => {
    camera.position.set(1, 0.8, 1.5);
    camera.lookAt(0, 0.5, 0);
    controls.target.set(0, 0.5, 0);
    controls.update();
});

console.log('Triangle dimensions:');
console.log(`  Height: ${HEIGHT} mm`);
console.log(`  Base: ${BASE} mm`);
console.log(`  Slant (computed): ${computedSlant.toFixed(1)} mm`);
console.log(`  Slant (expected): ${SLANT} mm`);
console.log(`  Thickness: ${THICKNESS} mm`);
