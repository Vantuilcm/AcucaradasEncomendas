// __mocks__/expoCryptoMock.js

// Usa CommonJS (module.exports) para compatibilidade com Jest sem transpilação de mocks
module.exports = {
  digestStringAsync: jest.fn().mockResolvedValue('hashed-string'),
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  // Adicione outras funções mockadas do expo-crypto se necessário
};
