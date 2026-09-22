const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');
const Contest = require('../models/Contest');
const { getIsConnected, inMemoryStore } = require('../config/db');
const { authMiddleware, adminOnlyMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const defaultSettings = {
  defaultDuration: 60,
  maxAllowedBlurs: 2,
  autoDisqualify: true,
  defaultTimeLimit: 2000,
  defaultMemoryLimit: 256,
  judge0Mode: 'Production Cluster'
};

// GET /api/settings - Fetch current platform & proctoring configuration
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    if (getIsConnected()) {
      let settings = await SystemSetting.findOne({ key: 'global_platform_settings' });
      if (!settings) {
        settings = await SystemSetting.create({
          key: 'global_platform_settings',
          ...defaultSettings
        });
      }
      return res.json({ success: true, settings });
    } else {
      if (!inMemoryStore.settings) {
        inMemoryStore.settings = { ...defaultSettings };
      }
      return res.json({ success: true, settings: inMemoryStore.settings });
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ success: false, message: 'Error fetching platform settings', error: err.message });
  }
});

// PUT /api/settings - Update platform settings (Admin Only)
router.put('/', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const {
      defaultDuration,
      maxAllowedBlurs,
      autoDisqualify,
      defaultTimeLimit,
      defaultMemoryLimit,
      judge0Mode,
      syncToActiveContests = true
    } = req.body;

    const parsedMaxBlurs = maxAllowedBlurs !== undefined ? Math.max(1, parseInt(maxAllowedBlurs, 10) || 2) : 2;
    const parsedAutoDisq = autoDisqualify !== undefined ? Boolean(autoDisqualify) : true;

    const updates = {
      ...(defaultDuration !== undefined && { defaultDuration: parseInt(defaultDuration, 10) || 60 }),
      maxAllowedBlurs: parsedMaxBlurs,
      autoDisqualify: parsedAutoDisq,
      ...(defaultTimeLimit !== undefined && { defaultTimeLimit: parseInt(defaultTimeLimit, 10) || 2000 }),
      ...(defaultMemoryLimit !== undefined && { defaultMemoryLimit: parseInt(defaultMemoryLimit, 10) || 256 }),
      ...(judge0Mode !== undefined && { judge0Mode }),
      updatedAt: new Date()
    };

    let savedSettings;

    if (getIsConnected()) {
      savedSettings = await SystemSetting.findOneAndUpdate(
        { key: 'global_platform_settings' },
        { $set: updates },
        { new: true, upsert: true }
      );

      if (syncToActiveContests) {
        // Sync blur threshold to active and upcoming contests
        await Contest.updateMany(
          { status: { $in: ['Upcoming', 'Active'] } },
          { $set: { maxAllowedBlurs: parsedMaxBlurs, autoDisqualify: parsedAutoDisq } }
        );
      }
    } else {
      inMemoryStore.settings = {
        ...(inMemoryStore.settings || defaultSettings),
        ...updates
      };
      savedSettings = inMemoryStore.settings;

      if (syncToActiveContests && inMemoryStore.contests) {
        inMemoryStore.contests.forEach(c => {
          if (c.status === 'Upcoming' || c.status === 'Active') {
            c.maxAllowedBlurs = parsedMaxBlurs;
            c.autoDisqualify = parsedAutoDisq;
          }
        });
      }
    }

    // Broadcast update to all connected clients if socket service is available
    try {
      const socketService = require('../services/socketService');
      socketService.emitToProctoring('settings:updated', savedSettings);
    } catch (sockErr) {}

    return res.json({
      success: true,
      message: 'System settings updated successfully and applied to active contests.',
      settings: savedSettings
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ success: false, message: 'Error updating platform settings', error: err.message });
  }
});

module.exports = router;
