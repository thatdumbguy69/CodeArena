const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'global_platform_settings', unique: true },
  defaultDuration: { type: Number, default: 60 },
  maxAllowedBlurs: { type: Number, default: 3 },
  autoDisqualify: { type: Boolean, default: true },
  defaultTimeLimit: { type: Number, default: 2000 },
  defaultMemoryLimit: { type: Number, default: 256 },
  judge0Mode: { type: String, default: 'Production Cluster' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
