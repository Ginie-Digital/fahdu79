const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add SVG transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

// Explicitly watch the FFMPegBuild directory
config.watchFolders = [
  path.resolve(__dirname, 'FFMPegBuild/react-native'),
];

module.exports = config;
