# Monitoramento de Desempenho do PNPM no CI/CD

## Visão Geral

Este documento descreve como monitorar o desempenho do PNPM no ambiente de CI/CD do projeto Acucaradas Encomendas. O monitoramento é essencial para garantir que a migração para o PNPM esteja trazendo os benefícios esperados em termos de velocidade, eficiência e uso de recursos.

## Métricas Importantes

### 1. Tempo de Instalação

O tempo necessário para instalar todas as dependências do projeto.

**Meta:** Redução de 30-50% em comparação com NPM

### 2. Tempo de Build

O tempo necessário para compilar o projeto.

**Meta:** Redução de 10-20% em comparação com NPM

### 3. Tamanho do Cache

O espaço em disco utilizado pelo cache do PNPM.

**Meta:** Redução de 40-60% em comparação com o node_modules do NPM

### 4. Taxa de Acerto do Cache (Cache Hit Rate)

A porcentagem de pacotes que são recuperados do cache em vez de baixados novamente.

**Meta:** > 90% após a primeira execução

## Ferramentas de Monitoramento

### Script de Monitoramento

O projeto inclui um script de monitoramento em `scripts/monitorar-ci-pnpm.js` que coleta e analisa métricas de desempenho do PNPM.

```bash
node scripts/monitorar-ci-pnpm.js
```

Este script:

1. Mede o tempo de instalação das dependências
2. Mede o tempo de build do projeto
3. Calcula o tamanho do diretório node_modules
4. Calcula o tamanho do store do PNPM
5. Estima a taxa de acerto do cache
6. Compara com métricas históricas do NPM
7. Gera alertas se as métricas estiverem fora dos limites aceitáveis

### Integração com CI/CD

Para integrar o monitoramento ao pipeline de CI/CD, adicione o seguinte passo ao seu workflow:

#### GitHub Actions

```yaml
- name: Monitorar desempenho PNPM
  run: node scripts/monitorar-ci-pnpm.js
  if: always() # Executar mesmo se passos anteriores falharem
```

#### Azure DevOps

```yaml
- script: node scripts/monitorar-ci-pnpm.js
  displayName: 'Monitorar desempenho PNPM'
  condition: always() # Executar mesmo se passos anteriores falharem
```

## Análise de Resultados

### Arquivo de Métricas

O script de monitoramento gera um arquivo `ci-metrics.json` na raiz do projeto com o histórico de métricas coletadas. Este arquivo pode ser usado para análise de tendências ao longo do tempo.

### Visualização

Para visualizar as métricas, você pode:

1. Usar ferramentas de monitoramento como Grafana ou Datadog
2. Criar um dashboard simples usando o arquivo de métricas
3. Analisar os logs do CI/CD

## Solução de Problemas

### Tempo de Instalação Lento

Se o tempo de instalação estiver acima do esperado:

1. Verifique a conectividade de rede do servidor CI/CD
2. Confirme se o cache do PNPM está sendo preservado entre execuções
3. Considere usar `pnpm install --frozen-lockfile` para instalações mais rápidas

### Tamanho do Cache Excessivo

Se o cache do PNPM estiver consumindo muito espaço:

1. Execute `pnpm store prune` para remover pacotes não utilizados
2. Verifique se há versões duplicadas de pacotes grandes
3. Considere ajustar a configuração de cache no `.npmrc`

## Próximos Passos

1. **Estabelecer Linha de Base:** Execute o script várias vezes para estabelecer métricas de referência
2. **Definir Alertas:** Configure alertas para notificar a equipe quando as métricas estiverem fora dos limites
3. **Otimização Contínua:** Use os dados coletados para identificar áreas de melhoria

---

> **Nota:** Este documento deve ser revisado e atualizado regularmente à medida que o projeto evolui e novas versões do PNPM são lançadas.