export const startTransaction = jest.fn().mockReturnValue({
  setData: jest.fn(),
  finish: jest.fn(),
});

export const getCurrentHub = jest.fn().mockReturnValue({
  getScope: jest.fn().mockReturnValue({
    getTransaction: jest.fn().mockReturnValue({
      setData: jest.fn(),
      finish: jest.fn(),
    }),
  }),
});

export default {
  startTransaction,
  getCurrentHub,
};
