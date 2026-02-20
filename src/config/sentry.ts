type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'log'

export function initSentry(): void {}

export function setTags(_tags: Record<string, string>) {}

export function captureException(_error: unknown, _context?: Record<string, unknown>) {}

export function captureMessage(_message: string, _level: SeverityLevel = 'info', _context?: Record<string, unknown>) {}

export function startTransaction<T>(_name: string, fn: () => T): T {
  return fn()
}

export function startPerformanceTransaction(_name: string, _op: string) {
  return {
    setData: (..._args: any[]) => {},
    finish: () => {},
  }
}
