/**
 * Configuração de Alertas para Sistema de Monitoramento
 *
 * Este arquivo define os limites e configurações para alertas automáticos
 * baseados no comportamento real do sistema de busca.
 */

export interface AlertThreshold {
  warning: number;
  critical: number;
  unit: string;
  description: string;
}

export interface AlertConfig {
  // Latência de busca (ms)
  searchLatency: AlertThreshold;

  // Taxa de erro (%)
  errorRate: AlertThreshold;

  // Uso de memória (MB)
  memoryUsage: AlertThreshold;

  // Taxa de cache miss (%)
  cacheMissRate: AlertThreshold;

  // Buscas sem resultados (%)
  noResultsRate: AlertThreshold;

  // Conexões WebSocket ativas
  activeConnections: AlertThreshold;

  // Throughput de buscas (buscas/min)
  searchThroughput: AlertThreshold;

  // Tempo de resposta do sistema (ms)
  systemResponseTime: AlertThreshold;
}

/**
 * Configuração padrão de alertas
 * Baseada em benchmarks típicos de sistemas de busca
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  searchLatency: {
    warning: 500, // 500ms
    critical: 1000, // 1s
    unit: 'ms',
    description: 'Latência de busca',
  },

  errorRate: {
    warning: 5, // 5%
    critical: 10, // 10%
    unit: '%',
    description: 'Taxa de erro nas buscas',
  },

  memoryUsage: {
    warning: 512, // 512MB
    critical: 1024, // 1GB
    unit: 'MB',
    description: 'Uso de memória do sistema',
  },

  cacheMissRate: {
    warning: 70, // 70%
    critical: 85, // 85%
    unit: '%',
    description: 'Taxa de cache miss',
  },

  noResultsRate: {
    warning: 15, // 15%
    critical: 25, // 25%
    unit: '%',
    description: 'Taxa de buscas sem resultados',
  },

  activeConnections: {
    warning: 100, // 100 conexões
    critical: 200, // 200 conexões
    unit: 'conexões',
    description: 'Conexões WebSocket ativas',
  },

  searchThroughput: {
    warning: 1000, // 1000 buscas/min
    critical: 2000, // 2000 buscas/min
    unit: 'buscas/min',
    description: 'Throughput de buscas',
  },

  systemResponseTime: {
    warning: 200, // 200ms
    critical: 500, // 500ms
    unit: 'ms',
    description: 'Tempo de resposta do sistema',
  },
};

/**
 * Configuração de alertas para ambiente de desenvolvimento
 * Limites mais relaxados para desenvolvimento local
 */
export const DEV_ALERT_CONFIG: AlertConfig = {
  searchLatency: {
    warning: 1000, // 1s
    critical: 2000, // 2s
    unit: 'ms',
    description: 'Latência de busca (dev)',
  },

  errorRate: {
    warning: 10, // 10%
    critical: 20, // 20%
    unit: '%',
    description: 'Taxa de erro nas buscas (dev)',
  },

  memoryUsage: {
    warning: 256, // 256MB
    critical: 512, // 512MB
    unit: 'MB',
    description: 'Uso de memória do sistema (dev)',
  },

  cacheMissRate: {
    warning: 80, // 80%
    critical: 95, // 95%
    unit: '%',
    description: 'Taxa de cache miss (dev)',
  },

  noResultsRate: {
    warning: 30, // 30%
    critical: 50, // 50%
    unit: '%',
    description: 'Taxa de buscas sem resultados (dev)',
  },

  activeConnections: {
    warning: 50, // 50 conexões
    critical: 100, // 100 conexões
    unit: 'conexões',
    description: 'Conexões WebSocket ativas (dev)',
  },

  searchThroughput: {
    warning: 500, // 500 buscas/min
    critical: 1000, // 1000 buscas/min
    unit: 'buscas/min',
    description: 'Throughput de buscas (dev)',
  },

  systemResponseTime: {
    warning: 500, // 500ms
    critical: 1000, // 1s
    unit: 'ms',
    description: 'Tempo de resposta do sistema (dev)',
  },
};

/**
 * Configuração de alertas para ambiente de produção
 * Limites mais rigorosos para produção
 */
export const PROD_ALERT_CONFIG: AlertConfig = {
  searchLatency: {
    warning: 300, // 300ms
    critical: 600, // 600ms
    unit: 'ms',
    description: 'Latência de busca (prod)',
  },

  errorRate: {
    warning: 2, // 2%
    critical: 5, // 5%
    unit: '%',
    description: 'Taxa de erro nas buscas (prod)',
  },

  memoryUsage: {
    warning: 1024, // 1GB
    critical: 2048, // 2GB
    unit: 'MB',
    description: 'Uso de memória do sistema (prod)',
  },

  cacheMissRate: {
    warning: 60, // 60%
    critical: 75, // 75%
    unit: '%',
    description: 'Taxa de cache miss (prod)',
  },

  noResultsRate: {
    warning: 10, // 10%
    critical: 20, // 20%
    unit: '%',
    description: 'Taxa de buscas sem resultados (prod)',
  },

  activeConnections: {
    warning: 200, // 200 conexões
    critical: 500, // 500 conexões
    unit: 'conexões',
    description: 'Conexões WebSocket ativas (prod)',
  },

  searchThroughput: {
    warning: 2000, // 2000 buscas/min
    critical: 5000, // 5000 buscas/min
    unit: 'buscas/min',
    description: 'Throughput de buscas (prod)',
  },

  systemResponseTime: {
    warning: 150, // 150ms
    critical: 300, // 300ms
    unit: 'ms',
    description: 'Tempo de resposta do sistema (prod)',
  },
};

/**
 * Função para obter configuração baseada no ambiente
 */
export function getAlertConfig(
  environment: 'development' | 'production' | 'default' = 'default'
): AlertConfig {
  switch (environment) {
    case 'development':
      return DEV_ALERT_CONFIG;
    case 'production':
      return PROD_ALERT_CONFIG;
    default:
      return DEFAULT_ALERT_CONFIG;
  }
}

/**
 * Função para validar se um valor excede os limites configurados
 */
export function checkThreshold(
  value: number,
  threshold: AlertThreshold
): 'normal' | 'warning' | 'critical' {
  if (value >= threshold.critical) {
    return 'critical';
  }
  if (value >= threshold.warning) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Configurações de notificação
 */
export interface NotificationConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    throttleMinutes: number;
  };
  webhook: {
    enabled: boolean;
    url: string;
    throttleMinutes: number;
  };
  console: {
    enabled: boolean;
    level: 'warning' | 'critical' | 'all';
  };
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  email: {
    enabled: false,
    recipients: [],
    throttleMinutes: 15,
  },
  webhook: {
    enabled: false,
    url: '',
    throttleMinutes: 5,
  },
  console: {
    enabled: true,
    level: 'warning',
  },
};
