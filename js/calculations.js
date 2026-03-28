// ============================================
// ORIGAMI GEOMETRY CALCULATIONS
// ============================================

// Volume Calculation
function calculateVolume(AB, wA, alphaDeg, betaDeg) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    const term1 = (wA * Math.pow(AB, 2)) / 6;
    const term2 = Math.sin(alphaRad) / Math.sin(alphaRad + betaRad);
    const term3 = Math.sqrt(Math.pow(Math.sin(betaRad), 2) - Math.pow(wA / AB, 2));
    return term1 * term2 * term3;
}

// Compatible Deployment Height
function calculateCompatibleHeight(AB, alphaDeg, betaDeg) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    const term = 1 - Math.pow(Math.cos(betaRad), 2) / Math.pow(Math.sin(alphaRad + betaRad), 2);
    if (term < 0) return 0;
    return AB * Math.sqrt(term);
}

// Maximum Volume
function calculateMaxVolume(AB, alphaDeg, betaDeg) {
    const alphaRad = alphaDeg * Math.PI / 180;
    const betaRad = betaDeg * Math.PI / 180;
    const numerator = Math.pow(AB, 3) * Math.sin(alphaRad) * Math.pow(Math.sin(betaRad), 2);
    const denominator = 12 * Math.sin(alphaRad + betaRad);
    return numerator / denominator;
}

// Factor of Safety (Corrugated Plastic - 2mm)
const MATERIAL_PROPS = {
    name: "Corrugated Plastic Sheet",
    yieldStrength: 12, // MPa
    elasticModulus: 1500, // MPa
    density: 0.9, // g/cm³
    thickness: 2 // mm
};

function calculateFactorOfSafety(maxStressMPa) {
    return MATERIAL_PROPS.yieldStrength / maxStressMPa;
}

// Pressurized Cylinder Stress (Thin-Walled)
function calculateCylinderStress(pressureMPa, radiusMM, thicknessMM) {
    const hoopStress = (pressureMPa * radiusMM) / thicknessMM;
    const longitudinalStress = (pressureMPa * radiusMM) / (2 * thicknessMM);
    return { hoopStress, longitudinalStress };
}

// Curved Beam Stress
function calculateCurvedBeamStress(M, A, e, rn, y) {
    return (M * y) / (A * e * (rn - y));
}

// Thermal Stress
function calculateThermalStress(alpha, deltaT, E) {
    return -alpha * deltaT * E;
}

// Shear Force and Bending Moment
function calculateShearForce(q, length) {
    return q * length / 2;
}

function calculateBendingMoment(q, length) {
    return (q * Math.pow(length, 2)) / 8;
}

// Principal Stress (2D)
function calculatePrincipalStresses(sx, sy, txy) {
    const avg = (sx + sy) / 2;
    const radius = Math.sqrt(Math.pow((sx - sy) / 2, 2) + Math.pow(txy, 2));
    const sigma1 = avg + radius;
    const sigma2 = avg - radius;
    const tauMax = radius;
    return { sigma1, sigma2, tauMax };
}

// Export
if (typeof window !== 'undefined') {
    window.origamiCalculations = {
        calculateVolume,
        calculateCompatibleHeight,
        calculateMaxVolume,
        calculateFactorOfSafety,
        calculateCylinderStress,
        calculateCurvedBeamStress,
        calculateThermalStress,
        calculateShearForce,
        calculateBendingMoment,
        calculatePrincipalStresses,
        MATERIAL_PROPS
    };
}
