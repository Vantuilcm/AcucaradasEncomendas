try {
  const Resolver = require('jest-resolve').default;
  const resolve = require('resolve');

  const defaultResolver = (path, options) => {
    return resolve.sync(path, {
      basedir: options.basedir,
      extensions: options.extensions,
      moduleDirectory: options.moduleDirectory,
      paths: options.paths,
      rootDir: options.rootDir,
    });
  };

  const resolver = new Resolver(defaultResolver, {
    rootDir: process.cwd(),
    moduleDirectories: ['node_modules'],
    extensions: ['.js', '.json', '.node'],
  });

  console.log('Resolver instance keys:', Object.keys(resolver));
  console.log('Resolver prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(resolver)));

  console.log('Resolving jest-expo...');
  try {
      const path = resolver.resolveModule(process.cwd(), 'jest-expo');
      console.log('Resolved path:', path);
  } catch(e) {
      console.log("resolveModule failed: " + e.message);
  }
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
