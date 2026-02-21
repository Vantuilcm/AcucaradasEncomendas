const mockAuth = {
  currentUser: {
    uid: 'mock-uid',
    email: 'mock@example.com',
    emailVerified: true,
    // Adicione outras propriedades do usuário mockadas se necessário
  },
  onAuthStateChanged: jest.fn(callback => {
    // Simula a chamada inicial do callback com o usuário mockado
    // e retorna uma função de unsubscribe mockada
    callback(mockAuth.currentUser);
    return jest.fn(); // mock unsubscribe
  }),
  // Adicione outros métodos mockados do Auth se necessário
};

module.exports = {
  initializeApp: jest.fn(),
  getAuth: jest.fn(() => mockAuth),
  getFirestore: jest.fn(() => ({})), // Retorna um objeto mockado simples
  getStorage: jest.fn(() => ({})), // Retorna um objeto mockado simples
  getAnalytics: jest.fn(() => ({})), // Retorna um objeto mockado simples
  isSupported: jest.fn(() => Promise.resolve(true)), // Mock para Analytics isSupported

  // Funções do Firestore (mantendo as existentes)
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),

  // Funções do Storage (mantendo as existentes)
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),

  // Funções do Auth (mantendo as existentes, getAuth agora retorna mockAuth)
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: mockAuth.onAuthStateChanged, // Reutiliza o mock de onAuthStateChanged
  sendPasswordResetEmail: jest.fn(),
};
