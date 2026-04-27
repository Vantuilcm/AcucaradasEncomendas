try {
  console.log('Resolving jest-watch-typeahead/filename...');
  console.log(require.resolve('jest-watch-typeahead/filename'));
  console.log('Success!');
} catch (e) {
  console.error('Failed:', e.message);
}

try {
  console.log('Resolving jest-watch-select-projects...');
  console.log(require.resolve('jest-watch-select-projects'));
  console.log('Success!');
} catch (e) {
  console.error('Failed:', e.message);
}
