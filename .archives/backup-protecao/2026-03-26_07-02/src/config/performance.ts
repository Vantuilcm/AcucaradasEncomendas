export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableCustomMetrics: boolean;
  enableCacheOptimization: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  trackNetworkRequests: boolean;
  trackMemoryUsage: boolean;
  trackRenderTime: boolean;
  performanceThresholds: {
    memoryWarningThreshold: number;
    renderTime: number;
    pageLoadTime: number;
  };
}

export const performanceConfig: PerformanceConfig = {
  enableMonitoring: true,
  enableCustomMetrics: true,
  enableCacheOptimization: true,
  logLevel: 'info',
  trackNetworkRequests: true,
  trackMemoryUsage: true,
  trackRenderTime: true,
  performanceThresholds: {
    memoryWarningThreshold: 80,
    renderTime: 1000,
    pageLoadTime: 3000
  }
};
