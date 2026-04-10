const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withVerificationAsset(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const filePath = path.join(config.modRequest.projectRoot, 'assets', 'adi-registration.properties');
      const destPath = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', 'adi-registration.properties');
      
      // Ensure the destination assets folder exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, destPath);
        console.log('✅ Successfully copied adi-registration.properties to native assets');
      } else {
        console.warn('⚠️  Warning: assets/adi-registration.properties not found. Build may fail verification.');
      }
      return config;
    },
  ]);
};
