const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// The library is consumed straight from src/ (its `react-native` field), so Metro
// has to watch the repo root and resolve peers from the hoisted root node_modules.
// Hierarchical lookup stays ON: npm nests a few of Expo's own deps (expo-asset)
// under node_modules/expo/node_modules, which a flat-only resolver can't see.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
