
const auth = require('firebase/auth');

describe('Debug Firebase Mock', () => {
  it('should have onAuthStateChanged as a function', () => {
    try {
      console.log('firebase/auth path:', require.resolve('firebase/auth'));
    } catch (e) {
      console.log('Could not resolve firebase/auth');
    }
    console.log('auth keys:', Object.keys(auth));
    console.log('auth exports:', auth);
    expect(typeof auth.onAuthStateChanged).toBe('function');
  });
});
