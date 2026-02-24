module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      // Plugin para ofuscação de código em produção
      process.env.NODE_ENV === 'production' && [
        'transform-remove-console',
        {
          exclude: ['error', 'warn', 'info'],
        },
      ],
      // Plugin para renomear identificadores (ofuscação)
      process.env.NODE_ENV === 'production' && [
        'babel-plugin-transform-rename-import',
        {
          replacements: [
            { original: '^(.+?)\\/src\\/(.+)$', replacement: '$1/lib/$2' },
          ],
        },
      ],
    ].filter(Boolean),
  };
};
