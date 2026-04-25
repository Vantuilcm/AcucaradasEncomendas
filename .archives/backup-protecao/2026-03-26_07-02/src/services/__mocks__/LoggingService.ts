export class LoggingService {
  private static instance: LoggingService;

  private constructor() {}

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  fatal = jest.fn();
  setUser = jest.fn();
  clearUser = jest.fn();
  searchError = jest.fn();
  searchPerformance = jest.fn();
  getLogs = jest.fn().mockResolvedValue([]);
  clearLogs = jest.fn().mockResolvedValue(undefined);
}

export const loggingService = LoggingService.getInstance();
