const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Platform-specific extensions - .web.ts má přednost před .ts na webu
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts],
  platforms: ['ios', 'android', 'web'],
};

module.exports = config;
