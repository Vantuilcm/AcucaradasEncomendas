try {
  require.resolve('jest-expo/jest-preset');
  console.log('jest-expo/jest-preset found');
} catch (e) {
  console.error('jest-expo/jest-preset not found:', e.message);
}

try {
  require('jest-expo/jest-preset');
  console.log('jest-expo/jest-preset loaded');
} catch (e) {
  console.error('jest-expo/jest-preset failed to load:', e.message);
}
