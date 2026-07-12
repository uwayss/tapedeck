module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved worklet transformation into react-native-worklets.
    // babel-preset-expo does NOT include it. It must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
