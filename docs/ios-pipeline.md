# Pipeline de Release iOS & GrowthOS SaaS 🚀

Este repositório agora abriga o **GrowthOS by Cozinha Conecta**, uma plataforma SaaS de Crescimento Autônomo que transforma o pipeline técnico em uma máquina de geração de receita com IA.

---

## 🏢 Arquitetura SaaS Multi-tenant

O sistema foi evoluído para suportar múltiplos clientes (**tenants**) com isolamento total de dados e decisões estratégicas:

### Estrutura de Dados Isolada:
Todos os arquivos de histórico, experimentos e inteligência de mercado são armazenados por tenant:
- `saas/data/{tenant_id}/history/`: Histórico de release e status do pipeline.
- `saas/data/{tenant_id}/experiments/`: Testes A/B e resultados de growth.
- `saas/data/{tenant_id}/market/`: Inteligência de demanda e forecast de IA.

### Contexto de Execução:
O script [saas-context.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/saas/saas-context.sh) garante que cada execução de CI utilize o contexto correto do cliente através da variável `GROWTHOS_TENANT_ID`.

---

## 🚀 GrowthOS API (Engine as a Service)

Os motores de IA agora estão disponíveis como APIs através do [saas-api.js](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/saas/saas-api.js):
- **Pricing API**: Otimização dinâmica de preços.
- **Forecast API**: Previsão de demanda para logística.
- **Decision API**: Tomada de decisão estratégica de mercado.
- **Dashboard API**: Dados consolidados para o painel executivo.

---

## 📊 Dashboard Executivo

O [dashboard.html](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/saas/dashboard.html) fornece uma visão em tempo real para os gestores:
- **Conversão e Receita**: KPIs financeiros impactados pela IA.
- **ROI de Marketing**: Eficácia dos investimentos sugeridos.
- **Decisões de IA**: Log transparente de cada ajuste autônomo feito pelo sistema.

---

## 💰 Planos e Monetização

O GrowthOS opera em três níveis de serviço:
1. **FREE**: Monitoramento básico e tracking de conversão.
2. **PRO**: Growth Engine completo e precificação dinâmica.
3. **ENTERPRISE**: Inteligência de mercado, forecast de demanda e automação total.

---

## 🚀 1. Visão Geral
O pipeline utiliza o modelo **EAS Managed** total, com **Apple Store Connect API Keys** e **Remote Credentials**. A arquitetura é desacoplada para permitir o uso em múltiplos aplicativos.

### Componentes:
- **GitHub Actions**: Orquestrador do workflow.
- **EAS Cloud**: Servidor de build e cofre de credenciais.
- **Scripts de CI**: Lógica de monitoramento e auto-correção.

---

## 🛠️ 2. Scripts de CI (scripts/ci/)
Todos os scripts utilizam **Shell Strict Mode** (`set -euo pipefail`) e Shebang `/usr/bin/env bash`.

| Script | Função | Códigos de Erro (Exit Codes) |
| :--- | :--- | :--- |
| `prebuild-check.sh` | Valida ambiente e governança. | 1 (Falha de validação) |
| `build-monitor.sh` | Monitora o build e detecta erros Apple/EAS. | 10 (401), 20 (403), 30 (Cert), 40 (Prov), 50 (Creds), 60 (Build Fail) |
| `auto-heal-ios.sh` | Executa o reset de credenciais e retry. | 0 (Sucesso no retry), 1 (Falha persistente) |
| `submit-monitor.sh` | Gerencia submissão pós-build. | 10 (Auth), 30 (Not Found), 40 (Rejected), 50 (Generic Fail) |
| `summarize-failure.sh` | Gera o `error_summary.txt`. | N/A |

---

## 🧨 3. Fluxo de Auto-Healing (Auto-Correção)
O Auto-Heal é ativado apenas para erros recuperáveis (Certificado e Provisioning).

1. **Detecção**: O `build-monitor.sh` identifica o erro e retorna código 30 ou 40.
2. **Ação**: O script `auto-heal-ios.sh` executa `eas credentials:clear --platform ios`.
3. **Pausa**: Aguarda 10 segundos para sincronização da nuvem.
4. **Retry**: Executa **apenas uma** tentativa adicional de build.
5. **Bloqueio**: Se a segunda tentativa falhar, o pipeline aborta com erro crítico.

---

## 🔐 4. Governança e Segurança
- **EAS Managed Only**: É proibido o uso de `credentials.json`, `.p12` ou `.mobileprovision` no repositório.
- **Submit Bloqueado**: O passo de submissão **nunca** será executado se o build ou o auto-heal falharem.
- **Artefatos**: Logs (`build_log.txt`, `submit_log.txt`) e o sumário de erros são anexados ao workflow em caso de falha (Retenção: 7 dias).

---

## 📈 5. Operação e Monitoramento (Nível Multinacional)
O pipeline conta com uma camada de observabilidade e alertas para operação contínua.

### Alertas Automáticos:
- **Telegram/Slack**: Notificações automáticas via Webhook em caso de falha.
- **Conteúdo**: Nome do app, etapa da falha, causa provável, link do GitHub Action e resumo técnico.

### Health Check (Observabilidade):
O script `pipeline-status.sh` gera o arquivo `pipeline_status.json` com:
- **Status de Saúde**: `healthy` (sucesso), `degraded` (sucesso após auto-heal) ou `failed` (falha).
- **Métricas**: Tempo de build e status dos últimos processos.

### Proteção de Falhas Consecutivas:
- O pipeline emite alertas críticos de **[CRITICAL]** caso o mecanismo de Auto-Heal falhe, sinalizando a necessidade de intervenção humana imediata e pausa na operação automatizada.

---

## 🏛️ 6. Governança de Release (Nível Multinacional)
O pipeline implementa regras rígidas para garantir a qualidade e o controle das publicações.

### Controle de Disparo:
- **Branches Permitidas**: `main` (produção) e `release/*` (versões de lançamento).
- **Aprovação Manual**: A submissão ao TestFlight exige o parâmetro `RELEASE_APPROVED=true` no disparo manual (`workflow_dispatch`).

### Versionamento Automático:
- **Auto-Incremento**: O `buildNumber` (iOS) e `versionCode` (Android) são incrementados automaticamente em cada execução via `scripts/ci/version-bump.sh`.
- **Git Tagging**: Cada build de sucesso gera automaticamente uma tag no Git (ex: `v1.1.3-build-422`).

### Histórico e Estabilidade:
O arquivo `release-history.json` rastreia todos os builds com as classificações:
- **STABLE**: Build passou de primeira.
- **DEGRADED**: Build passou após intervenção do Auto-Heal.
- **FAILED**: Build falhou em ambas as tentativas.

### Bloqueio de Release Arriscado:
- Builds classificados como **DEGRADED** emitem avisos de governança.
- Falhas críticas no Auto-Heal bloqueiam permanentemente a submissão automática.

---

## 🧠 7. Decisão de Release Inteligente (IA-Driven)
O pipeline agora conta com um motor de decisão autônomo ([release-decision.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/release-decision.sh)) que analisa a estabilidade e o histórico para decidir o fluxo de publicação.

### Modos de Decisão:
- **🚀 AUTO-RELEASE**: 
  - *Critério*: Build atual `STABLE` + Histórico recente de alta confiabilidade (sem falhas ou auto-heals nos últimos 3 builds).
  - *Resultado*: Submissão automática imediata ao TestFlight.
- **⚠️ REQUIRE_APPROVAL**: 
  - *Critério*: Build atual `DEGRADED` ou auto-heal recente.
  - *Resultado*: Build gerado com sucesso, mas submissão aguarda a flag `RELEASE_APPROVED=true`.
- **🚫 BLOCK_RELEASE**: 
  - *Critério*: 2 ou mais builds `DEGRADED` seguidos ou 1 falha recente.
  - *Resultado*: Submissão cancelada para revisão técnica.

### Notificações Inteligentes:
Cada decisão gera um alerta imediato no Telegram/Slack informando:
- A decisão tomada.
- O motivo técnico (ex: "últimos 3 builds estáveis").
- O nível de risco calculado (`low`, `medium`, `high`).

---

## 🛡️ 8. Autonomia Total (Self-Heal + Self-Rollback)
O pipeline evoluiu para um sistema de ciclo fechado que monitora o impacto real no usuário final.

### Monitoramento Pós-Release:
Através do script [post-release-monitor.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/post-release-monitor.sh), o sistema verifica métricas de produção (Sentry/Firebase):
- **Limiar de Crash**: Se a taxa de crash for > 2%, o estado é marcado como `CRITICAL`.
- **Erros Críticos**: Qualquer erro impeditivo dispara um alerta de crise.

### Rollback Automático:
Se o estado for `CRITICAL`:
1. **Cancelamento**: O build atual é invalidado/cancelado no TestFlight.
2. **Registro**: O incidente é logado em `incident-history.json`.
3. **Feedback Loop**: O motor de decisão ([release-decision.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/release-decision.sh)) detecta o incidente e bloqueia futuros `AUTO-RELEASES` até que a estabilidade seja comprovada.

---

## 📈 9. Autonomia de Negócio (Growth + Product AI)
O sistema agora decide ações baseadas no sucesso real do produto e receita.

### Monitoramento de Métricas de Negócio:
Através do script [business-monitor.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/business-monitor.sh), o pipeline analisa:
- **Taxa de Conversão**: Quedas > 20% disparam estado `BUSINESS_CRITICAL`.
- **Abandono de Carrinho**: Aumentos > 30% disparam alertas de crise.
- **Receita e Pedidos**: Monitoramento em tempo real vs baseline histórica.

### Feature Flags & Proteção de Receita:
Se um impacto de negócio for detectado:
1. **Feature Off**: O sistema desativa automaticamente funcionalidades suspeitas via Remote Config (ex: novo checkout).
2. **Business Incident**: Registrado em `incident-history.json` com tag `FEATURE_OFF`.
3. **Bloqueio de Release**: O motor de decisão ([release-decision.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/release-decision.sh)) bloqueia `AUTO-RELEASES` se houver impacto de negócio recente.

### Alertas de Impacto Financeiro:
Alertas ricos via [notify-business.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/notify-business.sh) informam a queda de conversão e o impacto financeiro estimado.

---

## 🧪 10. Sistema de Otimização Autônoma (Auto-Growth Engine)
O sistema evoluiu para buscar melhorias de conversão e receita de forma proativa e automática.

### Orquestração de Experimentos:
O script [experiment-engine.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/experiment-engine.sh) gerencia testes A/B em tempo real:
- **Elementos Testáveis**: Frete, ordem de produtos, CTAs e fluxos de checkout.
- **Segurança**: Novos testes são suspensos se o sistema detectar instabilidade de negócio ou técnica.

### Motor de Decisão de Growth:
O script [growth-decision.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/growth-decision.sh) analisa os resultados:
- **Promoção Automática**: Se a variante B apresentar ganho > 10%, ela é promovida para 100% dos usuários via Remote Config.
- **Auto-Kill**: Variantes com performance negativa são desativadas instantaneamente.

### Histórico de Aprendizado:
Todos os experimentos e resultados são registrados em `growth-history.json` para auditoria e aprendizado contínuo.

---

## 🌍 11. Inteligência de Mercado e Escala Automática (Strategic AI)
O sistema agora possui uma camada estratégica para dominação de mercado e expansão geográfica.

### Inteligência de Demanda e Ranking:
O script [demand-intelligence.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/demand-intelligence.sh) analisa pedidos vs oferta por região:
- **Identificação de Gaps**: Detecta bairros com alta demanda reprimida.
- **Ranking Automático**: Identifica produtos tendência por região (Etapa 3 - Recomendação Inteligente).
- **Sugestão de Expansão**: Prioriza onboardings de produtores em áreas de alto ROI.

### Precificação Dinâmica:
O script [pricing-engine.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/pricing-engine.sh) otimiza a receita em tempo real:
- **Elasticidade de Preço**: Ajusta taxas de entrega baseadas na conversão atual.
- **Maximização de Margem**: Aumenta taxas em momentos de alta conversão e as reduz para estimular volume se necessário.

### Previsão de Demanda (IA Forecast):
O script [demand-forecast.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/demand-forecast.sh) integra modelos preditivos (Etapa 6):
- **Previsão de Pico**: Identifica dias de maior volume de pedidos.
- **Gestão de Estoque**: Recomenda ajustes preventivos de estoque e logística.

### Decisão Estratégica de Mercado:
O motor [market-decision.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/market-decision.sh) decide o futuro da operação:
- **Alocação de Ads**: Aumenta investimentos em marketing (Meta/Google Ads) em regiões com maior potencial de crescimento.
- **Feedback Loop Estratégico**: O motor de decisão ([release-decision.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/release-decision.sh)) prioriza estabilidade absoluta quando o sistema detecta uma fase de expansão agressiva.

### Alertas Estratégicos:
Notificações via [notify-market.sh](file:///c:/Users/vantu/Downloads/AcucaradasEncomendas/scripts/ci/notify-market.sh) informam a equipe sobre novas regiões-alvo e decisões de investimento.

---

## 🏗️ 12. Operação Multi-App
Para reutilizar este pipeline em outros projetos (ex: Cozinha Pro):
1. Copie a pasta `scripts/ci/` e o arquivo `.github/workflows/ios-enterprise.yml`.
2. Configure os Secrets no GitHub (`EXPO_TOKEN`, `EXPO_ASC_*`).
3. Ajuste as variáveis de ambiente no workflow:
   - `APP_NAME`: Nome exibido nos alertas.
   - `PROFILE`: Profile do `eas.json` (ex: `production`).

---

## ❌ 13. Intervenção Manual Necessária
- **Erro Apple 403**: Contratos pendentes ou termos de serviço não aceitos.
- **Erro Apple 401**: API Key revogada ou configurada incorretamente.
- **Falha após Auto-Heal**: Problemas estruturais na conta Apple Developer ou Bundle ID inconsistente.
- **Alerta [CRITICAL]**: Falhas persistentes que indicam problemas de infraestrutura ou conta.
- **Aprovação de Release**: Defina `RELEASE_APPROVED=true` para autorizar a submissão.
- **Decisões Autônomas**: Revisar logs de incidentes, histórico de growth e decisões de mercado se o sistema tomar ações automáticas de escala ou preço.

---

## 📊 14. Logs Estruturados
Todos os logs de CI seguem o padrão:
- `[INFO]`: Informações de progresso e sucesso.
- `[WARNING]`: Alertas de governança ou falhas recuperáveis.
- `[ERROR]`: Falhas críticas que interrompem o fluxo.
- `[AUTO-HEAL]`: Logs específicos do mecanismo de recuperação.
- `[RELEASE HISTORY]`: Logs de governança de versão e estabilidade.
- `[IA-DECISION]`: Logs do motor de decisão inteligente.
- `[POST-RELEASE]`: Logs de monitoramento real e rollback.
- `[BUSINESS-MONITOR]`: Logs de performance de produto e receita.
- `[EXPERIMENT-ENGINE]`: Logs de orquestração de testes A/B.
- `[GROWTH-DECISION]`: Logs de otimização autônoma de conversão.
- `[AUTO-GROWTH]`: Logs de promoção de variantes vencedoras.
- `[DEMAND-INTELLIGENCE]`: Logs de análise de oportunidade geográfica.
- `[PRICING-ENGINE]`: Logs de ajuste dinâmico de preços e margem.
- `[MARKET-DECISION]`: Logs de decisão estratégica de investimento e escala.
