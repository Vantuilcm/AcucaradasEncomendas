
console.log('Loading manual mock for firebase/auth');

const authInstance = { currentUser: null };

const getAuth = jest.fn(() => authInstance);
const initializeAuth = jest.fn(() => authInstance);
const getReactNativePersistence = jest.fn();
const onAuthStateChanged = jest.fn((auth, callback) => {
  if (callback && typeof callback === 'function') {
    callback(null);
  }
  return jest.fn();
});
const signInWithEmailAndPassword = jest.fn();
const createUserWithEmailAndPassword = jest.fn();
const signOut = jest.fn();
const GoogleAuthProvider = jest.fn();
const FacebookAuthProvider = jest.fn();
const sendPasswordResetEmail = jest.fn();
const sendEmailVerification = jest.fn();
const updateProfile = jest.fn();
const reauthenticateWithCredential = jest.fn();
const EmailAuthProvider = {
  credential: jest.fn(),
};

const mockAuth = {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
};

// Export properties individually for named imports
exports.getAuth = getAuth;
exports.initializeAuth = initializeAuth;
exports.getReactNativePersistence = getReactNativePersistence;
exports.onAuthStateChanged = onAuthStateChanged;
exports.signInWithEmailAndPassword = signInWithEmailAndPassword;
exports.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
exports.signOut = signOut;
exports.GoogleAuthProvider = GoogleAuthProvider;
exports.FacebookAuthProvider = FacebookAuthProvider;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendEmailVerification = sendEmailVerification;
exports.updateProfile = updateProfile;
exports.reauthenticateWithCredential = reauthenticateWithCredential;
exports.EmailAuthProvider = EmailAuthProvider;

// Default export
exports.default = mockAuth;
exports.__esModule = true;
