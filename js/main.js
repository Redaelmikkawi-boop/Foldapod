import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createOrigamiMesh } from './origami-geometry.js';
import { computeCompatibleHeight } from './calculations.js';

// Setup scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0e0e0);

// Setup camera
const camera = new THREE.PerspectiveCamera(45, 800/600, 0.1, 1000);
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Setup renderer
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Add controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 2, 1);
scene.add(directionalLight);

// Current model
let currentModel = null;

function updateModel() {
    const alpha = parseFloat(document.getElementById('alpha').value);
    const beta = parseFloat(document.getElementById('beta').value);
    const n = parseFloat(document.getElementById('n').value);
    const wA = parseFloat(document.getElementById('wA').value);
    
    // Update displayed values
    document.getElementById('alpha-value').innerText = alpha + '°';
    document.getElementById('beta-value').innerText = beta + '°';
    document.getElementById('n-value').innerText = n;
    document.getElementById('wA-value').innerText = wA;
    
    // Remove old model
    if (currentModel) scene.remove(currentModel);
    
    // Create new model
    currentModel = createOrigamiMesh(alpha, beta, n, wA);
    scene.add(currentModel);
}

// Toggle to deployed state
document.getElementById('toggle-state').addEventListener('click', () => {
    const alpha = parseFloat(document.getElementById('alpha').value);
    const beta = parseFloat(document.getElementById('beta').value);
    const AB = 2; // Reference edge length
    const wA_c = computeCompatibleHeight(AB, alpha, beta);
    document.getElementById('wA').value = wA_c;
    updateModel();
});

// Add event listeners to sliders
document.getElementById('alpha').addEventListener('input', updateModel);
document.getElementById('beta').addEventListener('input', updateModel);
document.getElementById('n').addEventListener('input', updateModel);
document.getElementById('wA').addEventListener('input', updateModel);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Initial model
updateModel();
