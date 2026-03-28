// ============================================
// ORIGAMI GEOMETRY CALCULATIONS
// Based on the research paper
// ============================================

// Parameter Definitions
// α (alpha): Internal angle at vertex A (degrees)
// β (beta): Internal angle at vertex B (degrees)
// ||AB||: Length of edge AB (mm)
// w_A: Deployment height of vertex A (mm)

// ============================================
// 1. VOLUME CALCULATION
// ============================================
function calculateVolume(AB, wA, alphaDeg, betaDeg) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    
    const term1 = (wA * Math.pow(AB, 2)) / 6;
    const term2 = Math.sin(alphaRad) / Math.sin(alphaRad + betaRad);
    const term3 = Math.sqrt(Math.pow(Math.sin(betaRad), 2) - Math.pow(wA / AB, 2));
    
    return term1 * term2 * term3;
}

// ============================================
// 2. COMPATIBLE DEPLOYMENT HEIGHT
// ============================================
function calculateCompatibleHeight(AB, alphaDeg, betaDeg) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    
    const term = 1 - Math.pow(Math.cos(betaRad), 2) / Math.pow(Math.sin(alphaRad + betaRad), 2);
    if (term < 0) return 0;
    return AB * Math.sqrt(term);
}

// ============================================
// 3. MAXIMUM VOLUME
// ============================================
function calculateMaxVolume(AB, alphaDeg, betaDeg) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    
    const numerator = Math.pow(AB, 3) * Math.sin(alphaRad) * Math.pow(Math.sin(betaRad), 2);
    const denominator = 12 * Math.sin(alphaRad + betaRad);
    
    return numerator / denominator;
}

// ============================================
// 4. GEOMETRIC INCOMPATIBILITY
// ============================================
function calculateIncompatibility(AB, wA, alphaDeg, betaDeg) {
    const wA_c = calculateCompatibleHeight(AB, alphaDeg, betaDeg);
    return Math.abs(wA - wA_c) * 0.1;
}

// ============================================
// 5. INFLATION CONSTRAINT
// ============================================
function calculateInflationConstraint(AB, alphaDeg, betaDeg) {
    const wA_c = calculateCompatibleHeight(AB, alphaDeg, betaDeg);
    const V_c = calculateVolume(AB, wA_c, alphaDeg, betaDeg);
    const V_max = calculateMaxVolume(AB, alphaDeg, betaDeg);
    
    const gamma_c = V_c;
    const gamma_max = V_max;
    
    const h = gamma_max / gamma_c;
    return Math.log10(h);
}

// ============================================
// 6. FACTOR OF SAFETY (Mechanical Design)
// ============================================
// Material: Corrugated Plastic Sheet (2mm thickness)
const MATERIAL_PROPS = {
    name: "Corrugated Plastic Sheet",
    yieldStrength: 12, // MPa
    elasticModulus: 1500, // MPa (1.5 GPa)
    density: 0.9, // g/cm³
    thickness: 2 // mm
};

function calculateFactorOfSafety(maxStressMPa) {
    return MATERIAL_PROPS.yieldStrength / maxStressMPa;
}

// ============================================
// 7. VON MISES STRESS ESTIMATION
// ============================================
function estimateVonMisesStress(forceN, lengthMM, thicknessMM, widthMM) {
    const I = (widthMM * Math.pow(thicknessMM, 3)) / 12;
    const M = forceN * lengthMM / 4;
    const c = thicknessMM / 2;
    const bendingStress = (M * c) / I;
    return bendingStress / 1e6;
}

// ============================================
// 8. ENERGY CALCULATION
// ============================================
function calculateEnergy(pressureArray, volumeArray) {
    let energy = 0;
    for (let i = 1; i < pressureArray.length; i++) {
        const avgPressure = (pressureArray[i] + pressureArray[i-1]) / 2;
        const dV = volumeArray[i] - volumeArray[i-1];
        energy += avgPressure * dV;
    }
    return energy;
}

// ============================================
// 9. KINEMATICS: VERTEX POSITION
// ============================================
function calculateVertexPosition(AB, alphaDeg, betaDeg, wA) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    
    const A = { x: 0, y: 0, z: 0 };
    const B = {
        x: AB * Math.cos(alphaRad + betaRad),
        y: 0,
        z: -AB * Math.sin(alphaRad + betaRad)
    };
    const C = {
        x: AB * Math.cos(betaRad),
        y: 0,
        z: AB * Math.sin(betaRad)
    };
    const A_prime = { x: 0, y: wA, z: 0 };
    
    return { A, B, C, A_prime };
}

// ============================================
// 10. DEPLOYMENT ANGLE (Dihedral Angle)
// ============================================
function calculateDeploymentAngle(wA, AB, betaDeg) {
    const betaRad = betaDeg * Math.PI / 180;
    const sinBeta = Math.sin(betaRad);
    
    const gamma = Math.acos(Math.sqrt(1 - Math.pow(wA / (AB * sinBeta), 2)));
    return gamma * 180 / Math.PI;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.origamiCalculations = {
        calculateVolume,
        calculateCompatibleHeight,
        calculateMaxVolume,
        calculateIncompatibility,
        calculateInflationConstraint,
        calculateFactorOfSafety,
        estimateVonMisesStress,
        calculateEnergy,
        calculateVertexPosition,
        calculateDeploymentAngle,
        MATERIAL_PROPS
    };
}
