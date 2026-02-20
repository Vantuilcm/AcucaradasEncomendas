export const loggingService = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  setUser: jest.fn(),
  clearUser: jest.fn(),
  getLogs: jest.fn().mockResolvedValue([]),
  clearLogs: jest.fn().mockResolvedValue(undefined),
};
