export const AES = {
  encrypt: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('encrypted-data'),
  }),
  decrypt: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('decrypted-data'),
  }),
};

export const SHA256 = {
  hash: jest.fn().mockReturnValue('hashed-data'),
};

export const enc = {
  Utf8: {
    parse: jest.fn(),
    stringify: jest.fn(),
  },
  Base64: {
    stringify: jest.fn(),
    parse: jest.fn(),
  },
};
