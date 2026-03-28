import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

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
const HINGE_INDEX = 3;

function rotatePointAroundAxis(point, axisPoint, axisDirection, angleRad) {
    const u = axisDirection.clone().normalize();
    const p = point.clone().sub(axisPoint);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dot = p.dot(u);
    const cross = new THREE.Vector3().crossVectors(u, p);
    const rotated = p.clone().multiplyScalar(cos)
        .add(cross.multiplyScalar(sin))
        .add(u.clone().multiplyScalar(dot * (1 - cos)));
    return rotated.add(axisPoint);
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

function rotateAroundY(vec, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new THREE.Vector3(
        vec.x * cos + vec.z * sin,
        vec.y,
        -vec.x * sin + vec.z * cos
    );
}

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

function createDoorGroup(doorAngleDeg = 0) {
    const doorGroup = new THREE.Group();
    const doorAngleRad = doorAngleDeg * Math.PI / 180;
    const hingeFramePos = getVerticesAtAngle(HINGE_INDEX * ANGLE_STEP_FULL);
    const hingePointBottom = hingeFramePos.B.clone();
    const axisDirection = new THREE.Vector3(0, 1, 0);
    for (let doorIdx = DOOR_START_INDEX; doorIdx < DOOR_END_INDEX; doorIdx++) {
        const angle = doorIdx * ANGLE_STEP_FULL;
        let verts = getVerticesAtAngle(angle);
        if (doorAngleRad !== 0) {
            const rotatedVerts = {};
            for (let key in verts) {
                rotatedVerts[key] = rotatePointAroundAxis(verts[key], hingePointBottom, axisDirection, doorAngleRad);
            }
            verts = rotatedVerts;
        }
        const face2 = createQuadrilateralFace(verts.B, verts.C, verts.G, verts.F, 0xf39c12, 0.9);
        const face3 = createQuadrilateralFace(verts.F, verts.G, verts.K, verts.J, 0xf39c12, 0.9);
        doorGroup.add(face2);
        doorGroup.add(face3);
    }
    return doorGroup;
}

function createFullModelWithoutDoor() {
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

function createSingleFaceModel() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(0, 0, 0);
    const apex = new THREE.Vector3(0, APEX_Y * s, 0);
    const verts = getVerticesAtAngle(0);
    group.add(createTriangularFace(origin, verts.B, verts.C, 0xff6666, 0.85));
    group.add(createQuadrilateralFace(verts.B, verts.C, verts.G, verts.F, 0x66aaff, 0.85));
    group.add(createQuadrilateralFace(verts.F, verts.G, verts.K, verts.J, 0x66ff66, 0.85));
    group.add(createTriangularFace(verts.J, verts.K, apex, 0xff66ff, 0.9));
    return group;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a2a);
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.0015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 15);
camera.position.set(2.2, 1.8, 3.0);
camera.lookAt(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.2, 0);

const ambient = new THREE.AmbientLight(0x505070);
scene.add(ambient);
const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
mainLight.position.set(1.5, 2.5, 1.5);
mainLight.castShadow = true;
scene.add(mainLight);
const fillLight = new THREE.PointLight(0x88aaff, 0.6);
fillLight.position.set(0.8, 1.2, 0.8);
scene.add(fillLight);
const backLight = new THREE.PointLight(0xffaa88, 0.5);
backLight.position.set(-0.5, 1.5, -1.2);
scene.add(backLight);
const topLight = new THREE.PointLight(0xffaa88, 0.8);
topLight.position.set(0, 2.2, 0);
scene.add(topLight);

const gridHelper = new THREE.GridHelper(5.0, 50, 0x88aaff, 0x335588);
gridHelper.position.y = -0.02;
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(2.5);
scene.add(axesHelper);

let currentModel = null;
let doorModel = null;
let isFullModel = false;
let doorAngle = 0;

function updateModel() {
    if (currentModel) scene.remove(currentModel);
    if (doorModel) scene.remove(doorModel);
    if (isFullModel) {
        currentModel = createFullModelWithoutDoor();
        scene.add(currentModel);
        doorModel = createDoorGroup(doorAngle);
        scene.add(doorModel);
        document.getElementById('status').innerHTML = '🟣 Full Model Mode | Door Closed';
        document.getElementById('door-slider-container').style.display = 'flex';
    } else {
        currentModel = createSingleFaceModel();
        scene.add(currentModel);
        document.getElementById('status').innerHTML = '🔴 Single Face Mode';
        document.getElementById('door-slider-container').style.display = 'none';
    }
}

function updateDoorAngle(angleDeg) {
    doorAngle = angleDeg;
    if (doorModel && isFullModel) {
        scene.remove(doorModel);
        doorModel = createDoorGroup(doorAngle);
        scene.add(doorModel);
        const statusText = doorAngle === 0 ? 'Door Closed' : (doorAngle >= 90 ? 'Door Fully Open' : `Door ${doorAngle}° Open`);
        document.getElementById('status').innerHTML = `🟣 Full Model Mode | ${statusText}`;
        document.getElementById('door-angle-value').innerText = `${doorAngle}°`;
    }
}

const apexMarker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff88ff, emissive: 0xff44ff, emissiveIntensity: 0.5 }));
apexMarker.position.set(0, APEX_Y * s, 0);
scene.add(apexMarker);

const originMarker = new THREE.Mesh(new THREE.SphereGeometry(0.018, 24, 24), new THREE.MeshStandardMaterial({ color: 0xff6666, emissive: 0xff3333, emissiveIntensity: 0.3 }));
originMarker.position.set(0, 0, 0);
scene.add(originMarker);

const hingeFramePos = getVerticesAtAngle(HINGE_INDEX * ANGLE_STEP_FULL);
const hingeMarkerBottom = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0xf39c12, emissiveIntensity: 0.4 }));
hingeMarkerBottom.position.copy(hingeFramePos.B);
scene.add(hingeMarkerBottom);

const hingeMarkerTop = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0xf39c12, emissiveIntensity: 0.4 }));
hingeMarkerTop.position.copy(hingeFramePos.J);
scene.add(hingeMarkerTop);

const hingeLinePoints = [hingeFramePos.B.clone(), hingeFramePos.J.clone()];
const hingeLineGeo = new THREE.BufferGeometry().setFromPoints(hingeLinePoints);
const hingeLineMat = new THREE.LineBasicMaterial({ color: 0xf39c12 });
const hingeLine = new THREE.Line(hingeLineGeo, hingeLineMat);
scene.add(hingeLine);

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
    div.style.fontSize = '10px';
    div.style.fontWeight = 'bold';
    div.style.fontFamily = 'monospace';
    div.style.textShadow = '1px 1px 0px black';
    div.style.backgroundColor = 'rgba(0,0,0,0.6)';
    div.style.padding = '2px 6px';
    div.style.borderRadius = '4px';
    div.style.borderLeft = `3px solid ${color}`;
    const label = new CSS2DObject(div);
    label.position.copy(position);
    scene.add(label);
}

createLabel('🔴 ORIGIN', new THREE.Vector3(0.1, -0.08, 0.1), '#ff8888');
createLabel(`🟣 APEX (0, ${APEX_Y}, 0)`, new THREE.Vector3(0.15, APEX_Y * s + 0.08, 0.15), '#ff88ff');
createLabel('🚪 HINGE AXIS', hingeFramePos.B.clone().add(new THREE.Vector3(0.1, 0.3, 0.1)), '#f39c12');

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

document.getElementById('reset-view').addEventListener('click', () => {
    camera.position.set(2.2, 1.8, 3.0);
    camera.lookAt(0, 1.2, 0);
    controls.target.set(0, 1.2, 0);
    controls.update();
});

let gridVisible = true;
document.getElementById('toggle-grid').addEventListener('click', () => {
    gridVisible = !gridVisible;
    gridHelper.visible = gridVisible;
});

document.getElementById('toggle-full-model').addEventListener('click', () => {
    isFullModel = !isFullModel;
    updateModel();
});

document.getElementById('toggle-door').addEventListener('click', () => {
    if (isFullModel) {
        const newAngle = doorAngle === 0 ? 90 : 0;
        updateDoorAngle(newAngle);
    }
});

const doorSlider = document.getElementById('door-angle');
if (doorSlider) {
    doorSlider.addEventListener('input', (e) => {
        if (isFullModel) {
            updateDoorAngle(parseInt(e.target.value));
        }
    });
}

updateModel();
