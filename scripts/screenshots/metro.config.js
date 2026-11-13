const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
const stub = (f) => ({ type: 'sourceFile', filePath: path.join(__dirname, 'stubs', f) });
const MAP = {
  'react-native-google-mobile-ads': 'empty.js',
  '@react-native-firebase/analytics': 'analytics.js',
  '@react-native-google-signin/google-signin': 'signin.js',
  '@react-native-community/datetimepicker': 'picker.js',
  'expo-notifications': 'empty.js',
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && MAP[moduleName]) return stub(MAP[moduleName]);
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
