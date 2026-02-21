# 🚀 Plano de Implementação Paralela - Aguardando DUNS

## 📋 Situação Atual

**Bloqueador Principal:**
- ❌ Número DUNS pendente para acesso às plataformas iOS e Android
- ❌ Credenciais das lojas dependem do DUNS

**Status Técnico:**
- ✅ Build Android funcionando
- ❌ Build iOS bloqueado por credenciais
- ✅ Configurações de produção implementadas

**Documentação Disponível:**
- ✅ Guia detalhado para obtenção do DUNS (`GUIA_OBTENCAO_DUNS.md`)
- ✅ Instruções para contas das lojas (`INSTRUCOES_CONTAS_LOJAS.md`)
- ✅ Checklist de publicação (`CHECKLIST_PUBLICACAO.md`)

## 🎯 Implementação Paralela - O que Pode Ser Adiantado

### 1. 🎨 Assets Gráficos (PRIORIDADE ALTA)

#### Ícones do App
- [ ] Ícone principal 1024x1024 (PNG)
- [ ] Ícones adaptativos Android (XML + PNG)
- [ ] Ícones iOS em todas as resoluções
- [ ] Ícone para notificações

#### Screenshots das Lojas
- [ ] **iPhone Screenshots:**
  - 6.7" (iPhone 14 Pro Max): 1290x2796
  - 6.5" (iPhone 14 Plus): 1284x2778
  - 5.5" (iPhone 8 Plus): 1242x2208
- [ ] **iPad Screenshots:**
  - 12.9" (iPad Pro): 2048x2732
  - 2nd Gen: 2048x2732
- [ ] **Android Screenshots:**
  - Phone: 1080x1920 mínimo
  - Tablet: 1200x1920 mínimo

#### Assets Promocionais
- [ ] Feature Graphic Android (1024x500)
- [ ] Vídeo Preview (30 segundos máximo)
- [ ] Promotional Artwork

### 2. 📄 Documentos Legais (PRIORIDADE ALTA)

#### Política de Privacidade
- [ ] Criar documento completo
- [ ] Incluir seções obrigatórias:
  - Coleta de dados
  - Uso de cookies
  - Compartilhamento com terceiros
  - Direitos do usuário (LGPD)
  - Contato para dúvidas

#### Termos de Uso
- [ ] Definir regras de uso do app
- [ ] Responsabilidades do usuário
- [ ] Limitações de responsabilidade
- [ ] Política de reembolso

#### Hospedagem
- [ ] Configurar domínio: `acucaradas.com.br/legal/`
- [ ] Estrutura de URLs:
  - `/legal/privacidade`
  - `/legal/termos`
  - `/legal/contato`

### 3. 🔧 Melhorias Técnicas (PRIORIDADE MÉDIA)

#### Otimizações de Performance
- [ ] Implementar lazy loading
- [ ] Otimizar imagens
- [ ] Configurar cache strategies
- [ ] Minificar assets

#### Testes Automatizados
- [ ] Testes unitários componentes críticos
- [ ] Testes de integração
- [ ] Testes E2E básicos
- [ ] CI/CD pipeline

#### Monitoramento Avançado
- [ ] Configurar Sentry para produção
- [ ] Analytics detalhados
- [ ] Performance monitoring
- [ ] Error tracking

### 4. 🌐 Infraestrutura Web (PRIORIDADE MÉDIA)

#### Landing Page
- [ ] Página promocional do app
- [ ] Links para download (quando disponível)
- [ ] Informações sobre o produto
- [ ] Contato e suporte

#### API Backend (se necessário)
- [ ] Endpoints para dados dinâmicos
- [ ] Autenticação e autorização
- [ ] Integração com Firebase
- [ ] Documentação da API

### 5. 📱 Preparação para Submissão (PRIORIDADE BAIXA)

#### Metadados das Lojas
- [ ] **Descrições:**
  - Título do app (30 caracteres)
  - Descrição curta (80 caracteres)
  - Descrição completa (4000 caracteres)
  - Palavras-chave (100 caracteres)

- [ ] **Categorização:**
  - Categoria principal
  - Categoria secundária
  - Classificação etária
  - Países de distribuição

#### Configurações de Monetização
- [ ] Configurar Stripe para produção
- [ ] Definir preços e planos
- [ ] Configurar webhooks
- [ ] Testes de pagamento

## ⏱️ Cronograma Paralelo

| Semana | Foco Principal | Entregáveis |
|--------|----------------|-------------|
| 1 | Assets Gráficos | Ícones + Screenshots |
| 2 | Documentos Legais | Política + Termos |
| 3 | Melhorias Técnicas | Testes + Performance |
| 4 | Infraestrutura | Landing Page + API |

## 🚨 Ações Imediatas (Esta Semana)

### Dia 1: Solicitar DUNS (PRIORIDADE MÁXIMA)
- Seguir o `GUIA_OBTENCAO_DUNS.md` para solicitar o número DUNS
- Preparar todos os documentos necessários para o processo
- Designar um responsável para acompanhar o processo junto à D&B

### Dia 2-3: Assets Críticos
```bash
# Criar estrutura de assets
mkdir -p assets/store-assets/ios
mkdir -p assets/store-assets/android
mkdir -p assets/store-assets/promotional
```

### Dia 4-5: Documentos Legais
- Rascunho da Política de Privacidade
- Rascunho dos Termos de Uso
- Definir estrutura do site legal
- Hospedar documentos no domínio da empresa

### Dia 6-7: Configurações Técnicas
- Otimizar configurações de build
- Implementar testes básicos
- Configurar monitoramento
- Preparar scripts de automação para quando o DUNS chegar

## 📞 Quando o DUNS Chegar

**Ações Imediatas (Primeiras 24h):**
1. Criar conta Apple Developer (seguindo `INSTRUCOES_CONTAS_LOJAS.md`)
2. Criar conta Google Play Console (seguindo `INSTRUCOES_CONTAS_LOJAS.md`)
3. Pagar as taxas necessárias (US$99/ano para Apple, US$25 único para Google)
4. Iniciar verificação da empresa na Apple (pode levar alguns dias)

**Ações Secundárias (24-48h):**
1. Configurar secrets EAS com credenciais reais (usar `setup-publication-secrets.ps1`)
2. Gerar certificados e perfis de provisionamento
3. Testar builds completos em ambas as plataformas
4. Configurar App Store Connect e Google Play Console

**Ações Finais (48-72h):**
1. Fazer upload de todos os assets e metadados
2. Executar verificações finais (usando `pre-publish-check.sh`)
3. Submeter para review em ambas as lojas
4. Monitorar o processo de revisão

**Tempo Estimado Pós-DUNS:** 3-5 dias para submissão completa

## 🎯 Objetivos de Cada Fase

- **Fase 1 (Atual)**: Preparar tudo que não depende das lojas
- **Fase 2 (Pós-DUNS)**: Configuração rápida e submissão
- **Fase 3 (Pós-Submissão)**: Marketing e lançamento

---

**Status**: Implementação paralela iniciada
**Próxima ação**: Solicitar número DUNS (seguir `GUIA_OBTENCAO_DUNS.md`)
**Tempo até submissão**: ~3 semanas (1-2 semanas para DUNS + 1 semana para configuração e submissão)