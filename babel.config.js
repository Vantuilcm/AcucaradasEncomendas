module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      process.env.NODE_ENV === 'production' && [
        'transform-remove-console',
        {
          exclude: ['error', 'warn', 'info'],
        },
      ],
      'react-native-reanimated/plugin'
    ].filter(Boolean),
  };
};
