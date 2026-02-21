# ✅ Checklist de Produção - Açucaradas Encomendas

## 🎯 Status Atual da Implementação

### ✅ CONCLUÍDO (Sessão Atual)
- [x] Configuração de variáveis EAS para produção
- [x] Atualização do arquivo .env.production
- [x] Teste de build Android (SUCESSO)
- [x] Correção de imports React
- [x] Criação de hooks e componentes faltantes
- [x] Limpeza de scripts duplicados

### ❌ BLOQUEADORES CRÍTICOS
- [ ] **Build iOS falhando** - Requer configuração de secrets EAS
- [ ] Configuração de credenciais Apple Developer
- [ ] Configuração de credenciais Google Play

## 🚨 Ações Imediatas Necessárias

### 1. Configurar Secrets EAS (URGENTE)
```powershell
# Execute este comando:
.\scripts\setup-publication-secrets.ps1
```

**Credenciais necessárias:**
- APPLE_ID (email Apple Developer)
- ASC_APP_ID (App Store Connect)
- APPLE_TEAM_ID (Team ID Apple)
- GOOGLE_SERVICE_ACCOUNT_KEY_PATH

### 2. Testar Builds Novamente
```bash
# Após configurar secrets:
npm run build:ios    # Deve funcionar
npm run build:android # Já funcionando
```

## 📱 Configuração das Lojas

### Google Play Console
- [ ] Criar conta (US$ 25)
- [ ] Configurar app listing
- [ ] Upload de screenshots
- [ ] Configurar service account

### Apple App Store
- [ ] Inscrever no Developer Program (US$ 99/ano)
- [ ] Criar app no App Store Connect
- [ ] Upload de screenshots
- [ ] Configurar metadata

## 🎨 Assets Gráficos

### Obrigatórios
- [ ] Ícone do app (1024x1024)
- [ ] Screenshots iPhone (6.5" e 5.5")
- [ ] Screenshots iPad (12.9" e 2nd gen)
- [ ] Screenshots Android (Phone e Tablet)

### Opcionais
- [ ] Vídeo preview (30 segundos)
- [ ] Feature graphic (Android)
- [ ] Promotional artwork

## 📄 Documentos Legais

- [ ] Política de Privacidade
- [ ] Termos de Uso
- [ ] Hospedar em: https://acucaradas.com.br/legal/

## 🔍 Testes Finais

### Antes da Submissão
- [ ] Teste em dispositivos físicos
- [ ] Teste de pagamentos (Stripe)
- [ ] Teste de notificações push
- [ ] Teste de analytics
- [ ] Teste de crash reporting

### Builds de Teste
- [ ] Build staging iOS
- [ ] Build staging Android
- [ ] TestFlight (iOS)
- [ ] Internal Testing (Android)

## ⏱️ Cronograma Estimado

| Tarefa | Tempo | Prioridade |
|--------|-------|------------|
| Configurar secrets EAS | 30 min | 🔴 CRÍTICA |
| Testar builds iOS/Android | 15 min | 🔴 CRÍTICA |
| Criar contas das lojas | 2 horas | 🟡 ALTA |
| Preparar assets gráficos | 4 horas | 🟡 ALTA |
| Documentos legais | 2 horas | 🟢 MÉDIA |
| Testes finais | 3 horas | 🟡 ALTA |

**Total estimado: 11.75 horas**

## 🚀 Comando de Publicação

```bash
# Quando tudo estiver pronto:
npm run submit:production
```

---

**Próximo passo crítico**: Executar `setup-publication-secrets.ps1`