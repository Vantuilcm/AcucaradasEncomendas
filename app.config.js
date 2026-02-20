const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expo = appJson.expo || {};
const plugins = Array.isArray(expo.plugins) ? expo.plugins : [];

const sentryEnabled = process.env.SENTRY_ENABLED === '1';

const isSentryPlugin = (plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return typeof name === 'string' && name.toLowerCase().includes('sentry');
};

const filteredPlugins = sentryEnabled ? plugins : plugins.filter((plugin) => !isSentryPlugin(plugin));

module.exports = () => ({
  ...appJson,
  expo: {
    ...expo,
    plugins: filteredPlugins
  }
});
