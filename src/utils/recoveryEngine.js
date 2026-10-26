'use strict';

const VALID_ACTIONS = ['reuse', 'repair', 'refurbish', 'recycle'];

const CONDITION_SCORES = {
  excellent: 100,
  good: 80,
  fair: 55,
  poor: 25,
  damaged: 10,
  'non-functional': 0
};

const CATEGORY_WEIGHTS = {
  laptop: 1.8,
  desktop: 2.5,
  monitor: 1.5,
  phone: 0.25,
  tablet: 0.6,
  printer: 2.2,
  television: 3.5,
  battery: 0.15
};

function assessDevice(device = {}) {
  const age = Math.max(0, Number(device.ageYears) || 0);
  const condition = String(device.condition || 'fair').toLowerCase();
  const category = String(device.category || 'other').toLowerCase();

  const conditionScore = CONDITION_SCORES[condition] ?? 40;

  // Respect an explicitly recorded working state.
  // Infer it only when the field is missing or invalid.
  const working = typeof device.working === 'boolean'
    ? device.working
    : !['poor', 'damaged', 'non-functional'].includes(condition);

  const workingScore = working ? 100 : 15;
  const ageScore = Math.max(0, 100 - age * 12);

  const reuseScore = Math.round(
    conditionScore * 0.45 +
    ageScore * 0.20 +
    workingScore * 0.35
  );

  let recommendation;
  let reason;

  if (working && conditionScore >= 75 && age <= 4) {
    recommendation = 'reuse';
    reason =
      'Good condition and working status indicate potential for reuse after safety inspection and data sanitization.';
  } else if (!working && conditionScore >= 20 && age <= 8) {
    recommendation = 'repair';
    reason =
      'A qualified technician should assess repair feasibility, cost, and safety before proceeding.';
  } else if (working && conditionScore >= 40 && age <= 8) {
    recommendation = 'refurbish';
    reason =
      'Testing, cleaning, and refurbishment may extend the device’s useful life.';
  } else {
    recommendation = 'recycle';
    reason =
      'Prioritize safe handling and material recovery through an authorized e-waste recycler.';
  }

  const enteredWeight = Number(device.weightKg);
  const estimatedWeightKg =
    Number.isFinite(enteredWeight) && enteredWeight > 0
      ? enteredWeight
      : (CATEGORY_WEIGHTS[category] ?? 1);

  // Planning indicator only, not a measured environmental outcome.
  // Only reuse and refurbishment pathways receive a potential credit.
  const eligibleForLifeExtension =
    recommendation === 'reuse' || recommendation === 'refurbish';

  const estimatedWasteAvoidedKg = eligibleForLifeExtension
    ? Number(
        (
          estimatedWeightKg *
          (reuseScore / 100) *
          0.5
        ).toFixed(2)
      )
    : 0;

  return {
    deviceId: device.id ?? device.deviceId ?? null,
    working,
    recommendation,
    reason,
    reuseScore,
    recoveryPotential: reuseScore,
    estimatedWeightKg,
    estimatedWasteAvoidedKg,
    assessmentType: 'rule-based estimate',
    disclaimer:
      'Illustrative planning estimate only. Actual waste avoided depends on reuse outcomes, device lifespan, and verified processing data.'
  };
}

function assessDevices(devices) {
  if (!Array.isArray(devices)) {
    throw new TypeError('Expected an array of devices.');
  }

  return devices.map(device => {
    const assessment = assessDevice(device);

    return {
      ...device,
      assessment,
      recommendation: assessment.recommendation,
      reason: assessment.reason,
      reuseScore: assessment.reuseScore,
      estimatedWeightKg: assessment.estimatedWeightKg,
      estimatedWasteAvoidedKg: assessment.estimatedWasteAvoidedKg
    };
  });
}

function isValidAction(action) {
  return VALID_ACTIONS.includes(
    String(action || '').trim().toLowerCase()
  );
}

module.exports = {
  assessDevice,
  assessDevices,
  isValidAction,
  VALID_ACTIONS
};