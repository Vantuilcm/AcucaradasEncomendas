
try {
  console.log('Checking @babel/plugin-transform-runtime...');
  const runtimePath = require.resolve('@babel/plugin-transform-runtime');
  console.log('Success:', runtimePath);
} catch (e) {
  console.error('Failed to resolve @babel/plugin-transform-runtime:', e.message);
}

try {
  console.log('Checking @babel/plugin-transform-typescript...');
  const tsPath = require.resolve('@babel/plugin-transform-typescript');
  console.log('Success:', tsPath);
} catch (e) {
  console.error('Failed to resolve @babel/plugin-transform-typescript:', e.message);
}

try {
  console.log('Checking metro-react-native-babel-preset...');
  const presetPath = require.resolve('metro-react-native-babel-preset');
  console.log('Success:', presetPath);
} catch (e) {
  console.error('Failed to resolve metro-react-native-babel-preset:', e.message);
}
