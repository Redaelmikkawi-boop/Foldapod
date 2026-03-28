// Equations from the paper

export function computeVolume(AB, wA, alpha, beta) {
    // V_ABC = (wA * ||AB||^2 / 6) * (sin alpha / sin(alpha+beta)) * sqrt(sin^2 beta - wA^2/||AB||^2)
    let term1 = (wA * Math.pow(AB, 2)) / 6;
    let term2 = Math.sin(alpha * Math.PI/180) / Math.sin((alpha + beta) * Math.PI/180);
    let term3 = Math.sqrt(Math.pow(Math.sin(beta * Math.PI/180), 2) - Math.pow(wA/AB, 2));
    return term1 * term2 * term3;
}

export function computeCompatibleHeight(AB, alpha, beta) {
    // wA_c = ||AB|| * sqrt(1 - cos^2 beta / sin^2 (alpha+beta))
    let term = 1 - Math.pow(Math.cos(beta * Math.PI/180), 2) / 
                    Math.pow(Math.sin((alpha + beta) * Math.PI/180), 2);
    if (term < 0) return 0;
    return AB * Math.sqrt(term);
}

export function computeMaxVolume(AB, alpha, beta) {
    // V_max = (||AB||^3 * sin alpha * sin^2 beta) / (12 * sin(alpha+beta))
    let numerator = Math.pow(AB, 3) * Math.sin(alpha * Math.PI/180) * 
                    Math.pow(Math.sin(beta * Math.PI/180), 2);
    let denominator = 12 * Math.sin((alpha + beta) * Math.PI/180);
    return numerator / denominator;
}

export function computeIncompatibility(AB, wA, alpha, beta) {
    // Simplified Δ_ABC calculation
    let wA_c = computeCompatibleHeight(AB, alpha, beta);
    return Math.abs(wA - wA_c) * 0.1; // Normalized for visualization
}
