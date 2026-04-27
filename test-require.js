try {
  require.resolve('jest');
  console.log('jest found');
} catch (e) {
  console.log('jest NOT found');
}

try {
  require.resolve('express');
  console.log('express found');
} catch (e) {
  console.log('express NOT found');
}

try {
  require.resolve('@types/jest/package.json');
  console.log('@types/jest found');
} catch (e) {
  console.log('@types/jest NOT found');
}

try {
  require.resolve('@types/express/package.json');
  console.log('@types/express found');
} catch (e) {
  console.log('@types/express NOT found');
}
