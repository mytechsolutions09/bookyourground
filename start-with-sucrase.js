const sucrase = require('sucrase');
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Register sucrase for .ts and .js files
const originalJsLoader = Module._extensions['.js'];
Module._extensions['.ts'] = function(module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const result = sucrase.transform(content, {
    transforms: ['typescript', 'imports'],
    filePath: filename,
  });
  module._compile(result.code, filename);
};

Module._extensions['.js'] = function(module, filename) {
  if (filename.includes('node_modules/react-native/') || filename.includes('node_modules/expo')) {
    const content = fs.readFileSync(filename, 'utf8');
    const result = sucrase.transform(content, {
      transforms: ['flow', 'imports'],
      filePath: filename,
    });
    module._compile(result.code, filename);
  } else {
    originalJsLoader(module, filename);
  }
};

global.__DEV__ = true;
global.Platform = { OS: 'ios', select: (obj) => obj.ios || obj.default };

require('./node_modules/expo/bin/cli');
