export const startPerformanceTransaction = jest.fn().mockReturnValue({
  setData: jest.fn(),
  finish: jest.fn(),
});

export const initSentry = jest.fn();
export const captureError = jest.fn();
export const captureMessage = jest.fn();
export const setUser = jest.fn();
export const setTag = jest.fn();
export const setExtra = jest.fn();
