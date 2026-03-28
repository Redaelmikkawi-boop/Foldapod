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
    const backVerts = [v1b.x, v1b.y, v1b.z, v2b.x, v2b.y, v2b.z, v3b.x,
