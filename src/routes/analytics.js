'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { assessDevice } = require('../utils/recoveryEngine');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../../data/devices.json');

router.get('/', async (req, res, next) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const devices = JSON.parse(raw);

    if (!Array.isArray(devices)) {
      return res.status(500).json({
        success: false,
        message: 'Device data must be an array.'
      });
    }

    const actions = ['reuse', 'repair', 'refurbish', 'recycle'];

    const statusCounts = {};
    const categoryCounts = {};
    const recommendationCounts = {
      reuse: 0,
      repair: 0,
      refurbish: 0,
      recycle: 0
    };

    let totalDevices = 0;
    let workingDevices = 0;
    let totalWeightKg = 0;
    let estimatedWasteAvoidedKg = 0;
    let weightedRecoveryScore = 0;
    let demoRecords = 0;

    const assessedDevices = devices.map((device) => {
      const quantity = Math.max(1, Number(device.quantity) || 1);
      const assessment = assessDevice(device);
      const weightKg = assessment.estimatedWeightKg;
      const action = assessment.recommendation;
      const status = device.status || 'unknown';
      const category = device.category || 'other';

      totalDevices += quantity;
      totalWeightKg += weightKg * quantity;

      weightedRecoveryScore +=
        assessment.recoveryPotential * quantity;

      estimatedWasteAvoidedKg +=
        assessment.estimatedWasteAvoidedKg * quantity;

      if (device.working === true) {
        workingDevices += quantity;
      }

      if (device.demo === true) {
        demoRecords += 1;
      }

      statusCounts[status] =
        (statusCounts[status] || 0) + quantity;

      categoryCounts[category] =
        (categoryCounts[category] || 0) + quantity;

      if (actions.includes(action)) {
        recommendationCounts[action] += quantity;
      }

      return {
        ...device,
        assessment,
        recommendation: action
      };
    });

    const averageRecoveryScore = totalDevices
      ? Math.round(weightedRecoveryScore / totalDevices)
      : 0;

    const workingRate = totalDevices
      ? Math.round((workingDevices / totalDevices) * 100)
      : 0;

    const roundedWeight = Number(totalWeightKg.toFixed(2));
    const roundedAvoided = Number(
      estimatedWasteAvoidedKg.toFixed(2)
    );

    res.json({
      success: true,
      data: {
        overview: {
          totalDevices,
          inventoryRecords: devices.length,
          totalWeightKg: roundedWeight,
          totalEstimatedWeightKg: roundedWeight,
          estimatedWasteAvoidedKg: roundedAvoided,
          workingDevices,
          workingRate,
          readyForReuse: statusCounts['ready-for-reuse'] || 0,
          recycled: statusCounts.recycled || 0,
          repairQuantity: recommendationCounts.repair,
          demoRecords,
          demoDevices: demoRecords,
          averageRecoveryScore
        },
        statusCounts,
        categoryCounts,
        recommendationCounts,
        estimates: {
          totalWeightKg: roundedWeight,
          estimatedWasteAvoidedKg: roundedAvoided,
          averageRecoveryScore,
          note: 'Illustrative rule-based estimates, not independently verified environmental measurements.'
        },
        devices: assessedDevices
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;