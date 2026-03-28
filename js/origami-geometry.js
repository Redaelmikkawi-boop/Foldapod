import * as THREE from 'three';

export function createOrigamiMesh(alpha, beta, n, wA) {
    const group = new THREE.Group();
    const radius = 2;
    const height = wA / 50; // Scale for visualization
    
    // Create 2n triangles arranged radially
    for (let i = 0; i < n * 2; i++) {
        const angle = (i / n) * Math.PI * 2;
        
        // Vertex positions
        const v1 = new THREE.Vector3(0, 0, 0);
        const v2 = new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0);
        const v3 = new THREE.Vector3(radius * Math.cos(angle + Math.PI/n), 
                                      radius * Math.sin(angle + Math.PI/n), height);
        
        // Create triangle geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z];
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.computeVertexNormals();
        
        // Material with color based on stress (green = low, red = high)
        const color = new THREE.Color().setHSL(0.3, 1, 0.5);
        const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide });
        
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
    }
    
    return group;
}
