# 🔧 Configuração Manual EAS - Próximos Passos

## ✅ Status Atual

**Configurações Concluídas:**
- ✅ Variáveis de ambiente EAS no eas.json
- ✅ Arquivo .env.production atualizado
- ✅ Build Android funcionando
- ✅ Algumas variáveis EAS criadas (APPLE_ID, ASC_APP_ID)

**Bloqueadores Identificados:**
- ❌ Build iOS ainda falhando
- ❌ Script PowerShell com erro de sintaxe
- ❌ Algumas variáveis EAS não configuradas completamente

## 🚨 Ações Imediatas Necessárias

### 1. Configurar Variáveis EAS Manualmente

```bash
# Execute estes comandos um por vez:
eas env:create --name "APPLE_TEAM_ID" --value "SEU_TEAM_ID_AQUI" --environment production
eas env:create --name "GOOGLE_SERVICE_ACCOUNT_KEY_PATH" --value "./google-service-account.json" --environment production

# Verificar variáveis criadas:
eas env:list
```

### 2. Obter Credenciais Reais

#### Apple Developer (iOS)
1. **APPLE_ID**: Seu email da conta Apple Developer
2. **ASC_APP_ID**: 
   - Acesse App Store Connect
   - Crie um novo app
   - Copie o App ID gerado
3. **APPLE_TEAM_ID**:
   - Acesse Apple Developer Portal
   - Vá em Membership
   - Copie o Team ID

#### Google Play (Android)
1. **Service Account**:
   - Acesse Google Cloud Console
   - Crie um service account
   - Baixe o arquivo JSON
   - Coloque na raiz do projeto como `google-service-account.json`

### 3. Atualizar Variáveis com Valores Reais

```bash
# Substitua os placeholders pelos valores reais:
eas env:update --name "APPLE_ID" --value "seu-email@exemplo.com" --environment production
eas env:update --name "ASC_APP_ID" --value "1234567890" --environment production
eas env:update --name "APPLE_TEAM_ID" --value "ABCD123456" --environment production
```

### 4. Testar Builds Novamente

```bash
# Após configurar todas as variáveis:
npm run build:ios
npm run build:android
```

## 📋 Checklist de Verificação

- [ ] Todas as variáveis EAS configuradas
- [ ] Credenciais Apple Developer obtidas
- [ ] Service Account Google configurado
- [ ] Build iOS funcionando
- [ ] Build Android funcionando
- [ ] Pronto para submissão

## 🔍 Troubleshooting

### Build iOS Falhando
1. Verificar se APPLE_TEAM_ID está correto
2. Confirmar bundle identifier único
3. Verificar certificados de distribuição

### Build Android Falhando
1. Verificar service account permissions
2. Confirmar package name único
3. Verificar keystore configurado

### Variáveis EAS Não Funcionando
1. Usar `eas env:list` para verificar
2. Usar `eas env:update` para corrigir
3. Verificar escopo (project vs account)

## 📞 Próximos Passos

1. **URGENTE**: Configurar credenciais reais
2. **ALTA**: Testar builds completos
3. **MÉDIA**: Preparar assets para lojas
4. **BAIXA**: Configurar documentos legais

---

**Tempo estimado**: 1-2 horas para configuração completa
**Status**: 70% concluído, aguardando credenciais reais