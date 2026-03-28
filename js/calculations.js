const MATERIAL_PROPS = {
    name: "Corrugated Plastic Sheet",
    yieldStrength: 12,
    elasticModulus: 1500,
    density: 0.9,
    thickness: 2
};

function calculateVolume(AB, wA, alphaDeg, betaDeg) {
    try {
        const alphaRad = alphaDeg * Math.PI / 180;
        const betaRad = betaDeg * Math.PI / 180;
        const term1 = (wA * Math.pow(AB, 2)) / 6;
        const term2 = Math.sin(alphaRad) / Math.sin(alphaRad + betaRad);
        const term3 = Math.sqrt(Math.pow(Math.sin(betaRad), 2) - Math.pow(wA / AB, 2));
        return term1 * term2 * term3;
    } catch (e) {
        return 0;
    }
}

function calculateCompatibleHeight(AB, alphaDeg, betaDeg) {
    try {
        const alphaRad = alphaDeg * Math.PI / 180;
        const betaRad = betaDeg * Math.PI / 180;
        const term = 1 - Math.pow(Math.cos(betaRad), 2) / Math.pow(Math.sin(alphaRad + betaRad), 2);
        if (term < 0) return 0;
        return AB * Math.sqrt(term);
    } catch (e) {
        return 0;
    }
}

function calculateMaxVolume(AB, alphaDeg, betaDeg) {
    try {
        const alphaRad = alphaDeg * Math.PI / 180;
        const betaRad = betaDeg * Math.PI / 180;
        const numerator = Math.pow(AB, 3) * Math.sin(alphaRad) * Math.pow(Math.sin(betaRad), 2);
        const denominator = 12 * Math.sin(alphaRad + betaRad);
        return numerator / denominator;
    } catch (e) {
        return 0;
    }
}

function calculateFactorOfSafety(maxStressMPa) {
    return MATERIAL_PROPS.yieldStrength / maxStressMPa;
}

function calculateCylinderStress(pressureMPa, radiusMM, thicknessMM) {
    const hoopStress = (pressureMPa * radiusMM) / thicknessMM;
    const longitudinalStress = (pressureMPa * radiusMM) / (2 * thicknessMM);
    return { hoopStress, longitudinalStress };
}

function calculatePrincipalStresses(sx, sy, txy) {
    const avg = (sx + sy) / 2;
    const radius = Math.sqrt(Math.pow((sx - sy) / 2, 2) + Math.pow(txy, 2));
    return { sigma1: avg + radius, sigma2: avg - radius, tauMax: radius };
}

if (typeof window !== 'undefined') {
    window.origamiCalculations = {
        calculateVolume,
        calculateCompatibleHeight,
        calculateMaxVolume,
        calculateFactorOfSafety,
        calculateCylinderStress,
        calculatePrincipalStresses,
        MATERIAL_PROPS
    };
}
