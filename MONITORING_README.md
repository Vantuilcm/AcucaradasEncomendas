# 📊 Sistema de Monitoramento em Tempo Real

## Visão Geral

Este documento descreve o sistema completo de monitoramento em tempo real implementado para o sistema de busca avançada das Açucaradas Encomendas. O sistema fornece insights detalhados sobre performance, alertas automáticos e análise de tendências.

## 🏗️ Arquitetura do Sistema

### Componentes Principais

1. **SearchMonitoring** (`src/services/SearchMonitoring.ts`)

   - Núcleo do sistema de monitoramento
   - Coleta e processa métricas em tempo real
   - Gerencia alertas e detecção de anomalias

2. **WebSocketManager** (`src/services/WebSocketManager.ts`)

   - Gerencia conexões WebSocket para comunicação em tempo real
   - Transmite dados de monitoramento para clientes conectados
   - Implementa heartbeat e reconexão automática

3. **RealTimeMonitoringDashboard** (`src/components/RealTimeMonitoringDashboard.tsx`)

   - Interface visual para monitoramento
   - Exibe métricas, alertas e status do sistema
   - Atualização em tempo real via WebSocket

4. **useSearchMonitoring** (`src/hooks/useSearchMonitoring.ts`)
   - Hook React para integração com componentes
   - Fornece estado e ações de monitoramento
   - Facilita uso em outros componentes

## 🚀 Funcionalidades Implementadas

### ✅ Monitoramento de Métricas

- **Latência de Busca**: Tempo de resposta das consultas
- **Taxa de Sucesso**: Percentual de buscas bem-sucedidas
- **Cache Hit/Miss**: Eficiência do sistema de cache
- **Uso de Memória**: Consumo de recursos do sistema
- **Buscas sem Resultados**: Identificação de termos problemáticos
- **Throughput**: Volume de buscas por minuto

### ✅ Sistema de Alertas

- **Alertas Automáticos**: Baseados em limites configuráveis
- **Níveis de Severidade**: Warning, Critical
- **Throttling**: Evita spam de alertas
- **Histórico**: Rastreamento de alertas passados
- **Reconhecimento**: Marcação de alertas como resolvidos

### ✅ Análise de Tendências

- **Baseline Dinâmico**: Aprendizado automático de padrões
- **Detecção de Anomalias**: Identificação de comportamentos atípicos
- **Tendências de Busca**: Análise de termos populares
- **Performance Histórica**: Comparação com períodos anteriores

### ✅ Dashboard em Tempo Real

- **Visualização Interativa**: Gráficos e métricas ao vivo
- **Status do Sistema**: Saúde geral e por componente
- **Alertas Ativos**: Lista de problemas atuais
- **Estatísticas**: Resumo de performance

## ⚙️ Configuração

### Configuração de Alertas

O sistema suporta diferentes configurações baseadas no ambiente:

```typescript
// Desenvolvimento
const devConfig = {
  searchLatency: { warning: 1000, critical: 2000 }, // ms
  errorRate: { warning: 10, critical: 20 }, // %
  memoryUsage: { warning: 256, critical: 512 }, // MB
};

// Produção
const prodConfig = {
  searchLatency: { warning: 300, critical: 600 }, // ms
  errorRate: { warning: 2, critical: 5 }, // %
  memoryUsage: { warning: 1024, critical: 2048 }, // MB
};
```

### Variáveis de Ambiente

```bash
# Ambiente de execução
NODE_ENV=development|production

# Porta do WebSocket
WEBSOCKET_PORT=8080

# Habilitar testes de performance
ENABLE_PERFORMANCE_TESTS=true
```

## 🔧 Instalação e Uso

### 1. Inicialização Automática

```typescript
import { initializeMonitoring } from './src/scripts/setupMonitoring';

// Inicializar sistema completo
await initializeMonitoring();
```

### 2. Uso em Componentes React

```typescript
import { useSearchMonitoring } from './src/hooks/useSearchMonitoring';

function MyComponent() {
  const { metrics, alerts, recordSearchLatency, acknowledgeAlert } = useSearchMonitoring();

  // Usar métricas e ações...
}
```

### 3. Dashboard de Monitoramento

```typescript
import { RealTimeMonitoringDashboard } from './src/components/RealTimeMonitoringDashboard';

function App() {
  return (
    <div>
      <RealTimeMonitoringDashboard />
      {/* Outros componentes */}
    </div>
  );
}
```

## 📈 Métricas Coletadas

### Métricas de Busca

- `searchCount`: Total de buscas realizadas
- `averageLatency`: Latência média das buscas
- `successRate`: Taxa de sucesso das buscas
- `errorCount`: Número de erros
- `cacheHitRate`: Taxa de acerto do cache
- `noResultsCount`: Buscas sem resultados

### Métricas do Sistema

- `memoryUsage`: Uso atual de memória
- `activeConnections`: Conexões WebSocket ativas
- `systemHealth`: Status geral do sistema
- `uptime`: Tempo de atividade

### Tendências

- `searchTrends`: Termos de busca populares
- `performanceBaseline`: Baseline de performance
- `anomalies`: Anomalias detectadas

## 🚨 Sistema de Alertas

### Tipos de Alertas

1. **Performance**

   - Latência alta
   - Taxa de erro elevada
   - Uso excessivo de memória

2. **Funcionalidade**

   - Cache miss rate alto
   - Muitas buscas sem resultados
   - Falhas de conexão

3. **Sistema**
   - Sobrecarga de conexões
   - Anomalias detectadas
   - Falhas críticas

### Configuração de Notificações

```typescript
const notificationConfig = {
  email: {
    enabled: true,
    recipients: ['admin@acucaradas.com'],
    throttleMinutes: 15,
  },
  webhook: {
    enabled: true,
    url: 'https://hooks.slack.com/...',
    throttleMinutes: 5,
  },
  console: {
    enabled: true,
    level: 'warning',
  },
};
```

## 🧪 Testes de Performance

O sistema inclui testes automatizados para validar o impacto na performance:

```bash
# Executar testes de performance
npm run test:performance

# Ou via script
node src/scripts/setupMonitoring.ts
```

### Métricas Testadas

- **Latência**: Impacto do monitoramento na velocidade de busca
- **Memória**: Consumo adicional de recursos
- **Concorrência**: Performance com múltiplas buscas simultâneas
- **WebSocket**: Eficiência da comunicação em tempo real
- **Alertas**: Tempo de processamento de alertas

## 🔍 Debugging e Troubleshooting

### Logs do Sistema

O sistema gera logs detalhados para debugging:

```typescript
// Habilitar logs detalhados
process.env.DEBUG = 'monitoring:*';

// Verificar saúde do sistema
const health = await checkMonitoringHealth();
console.log('Status:', health.status);
```

### Problemas Comuns

1. **WebSocket não conecta**

   - Verificar porta configurada
   - Verificar firewall
   - Verificar logs de erro

2. **Alertas não funcionam**

   - Verificar configuração de limites
   - Verificar throttling
   - Verificar handlers de notificação

3. **Performance degradada**
   - Executar testes de performance
   - Verificar uso de memória
   - Ajustar configurações

## 📊 Monitoramento de Produção

### Métricas Recomendadas

- **SLA de Latência**: < 300ms (warning), < 600ms (critical)
- **Taxa de Erro**: < 2% (warning), < 5% (critical)
- **Disponibilidade**: > 99.9%
- **Cache Hit Rate**: > 80%

### Alertas Críticos

- Sistema indisponível
- Latência > 1s por mais de 5 minutos
- Taxa de erro > 10%
- Uso de memória > 2GB

## 🔮 Próximos Passos

### Melhorias Planejadas

1. **Machine Learning**

   - Predição de anomalias
   - Otimização automática
   - Análise preditiva

2. **Integração Externa**

   - Grafana/Prometheus
   - ElasticSearch
   - APM tools

3. **Funcionalidades Avançadas**
   - A/B testing de algoritmos
   - Análise de sentimento
   - Recomendações automáticas

## 🤝 Contribuição

Para contribuir com o sistema de monitoramento:

1. Seguir padrões de código estabelecidos
2. Adicionar testes para novas funcionalidades
3. Documentar mudanças significativas
4. Validar impacto na performance

## 📞 Suporte

Para suporte técnico:

- **Email**: dev@acucaradas.com
- **Slack**: #monitoring-support
- **Documentação**: [Wiki interno]

---

**Versão**: 1.0.0  
**Última atualização**: 2024  
**Mantido por**: Equipe de Desenvolvimento Açucaradas Encomendas
