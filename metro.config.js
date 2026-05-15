const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .mjs to sourceExts to resolve recharts ES module issues
config.resolver.sourceExts.push('mjs');

module.exports = config;
