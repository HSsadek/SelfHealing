/**
 * Reliability Scoring Engine
 *
 * Takes an array of EvidenceObjects (one per test step) and produces
 * a composite reliability score using weighted signals.
 *
 * Formula:
 *   Reliability = (0.30 × DOM Accuracy)
 *               + (0.20 × Network Success Rate)
 *               + (0.20 × Visual Confidence)
 *               + (0.20 × Execution Stability)
 *               - (0.10 × Healing Frequency Penalty)
 */

// ── Signal extractors ──────────────────────────────────────────────────────────

/** DOM Accuracy — what % of steps confirmed the element existed in the DOM */
const domAccuracy = (steps) => {
    const relevant = steps.filter(s => s.evidence?.elementFound !== null && s.evidence?.elementFound !== undefined);
    if (!relevant.length) return 100; // no selector-based steps → assume OK
    const found = relevant.filter(s => s.evidence.elementFound === true).length;
    return Math.round((found / relevant.length) * 100);
};

/** Network Success Rate — what % of captured HTTP responses were < 400 */
const networkSuccessRate = (steps) => {
    const allReqs = steps.flatMap(s => s.evidence?.networkRequests ?? []);
    const withStatus = allReqs.filter(r => r.statusCode !== null && r.statusCode !== undefined);
    if (!withStatus.length) return 100; // no measurable requests → assume OK
    const ok = withStatus.filter(r => r.statusCode < 400).length;
    return Math.round((ok / withStatus.length) * 100);
};

/** Visual Confidence — average executionConfidence across all steps */
const visualConfidence = (steps) => {
    if (!steps.length) return 0;
    const sum = steps.reduce((a, s) => a + (s.evidence?.executionConfidence ?? 0), 0);
    return Math.round(sum / steps.length);
};

/** Execution Stability — % of steps that did NOT fail */
const executionStability = (steps) => {
    if (!steps.length) return 0;
    const stable = steps.filter(s => s.status === 'success' || s.status === 'healed').length;
    return Math.round((stable / steps.length) * 100);
};

/** Healing Frequency Penalty — % of steps that needed healing (high = bad) */
const healingPenalty = (steps) => {
    if (!steps.length) return 0;
    const healed = steps.filter(s => s.status === 'healed').length;
    return Math.round((healed / steps.length) * 100);
};

// ── Main scorer ────────────────────────────────────────────────────────────────

/**
 * Compute the composite reliability score.
 *
 * @param {Array} evidenceSteps  Array of EvidenceObjects from the test runner
 * @returns {{
 *   reliabilityScore: number,
 *   confidenceLevel: 'low'|'medium'|'high',
 *   riskFlags: string[],
 *   breakdown: object
 * }}
 */
const computeReliabilityScore = (evidenceSteps = []) => {
    if (!evidenceSteps.length) {
        return {
            reliabilityScore: 0,
            confidenceLevel: 'low',
            riskFlags: ['No steps executed'],
            breakdown: {},
        };
    }

    const dom     = domAccuracy(evidenceSteps);
    const network = networkSuccessRate(evidenceSteps);
    const visual  = visualConfidence(evidenceSteps);
    const exec    = executionStability(evidenceSteps);
    const healing = healingPenalty(evidenceSteps);

    const raw = (0.30 * dom)
              + (0.20 * network)
              + (0.20 * visual)
              + (0.20 * exec)
              - (0.10 * healing);

    const reliabilityScore = Math.max(0, Math.min(100, Math.round(raw)));

    // Risk flags
    const riskFlags = [];
    if (dom < 50)     riskFlags.push('Low DOM accuracy — many selectors failed to match');
    if (network < 70) riskFlags.push('Network instability — high rate of failed HTTP requests');
    if (visual < 40)  riskFlags.push('Low execution confidence — insufficient browser proof');
    if (exec < 60)    riskFlags.push('Execution instability — many steps failed');
    if (healing > 40) riskFlags.push('High healing reliance — test selectors need maintenance');

    const confidenceLevel = reliabilityScore >= 80 ? 'high'
                          : reliabilityScore >= 50 ? 'medium'
                          : 'low';

    return {
        reliabilityScore,
        confidenceLevel,
        riskFlags,
        breakdown: {
            domAccuracy:      dom,
            networkSuccess:   network,
            visualConfidence: visual,
            executionStability: exec,
            healingPenalty:    healing,
        },
    };
};

module.exports = { computeReliabilityScore };
