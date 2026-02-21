# 🔐 Configuração de Segurança para Produção

## ⚠️ AÇÕES OBRIGATÓRIAS ANTES DO DEPLOY

### 1. Configurar Variáveis de Ambiente Seguras

#### EAS Secrets (Recomendado)
```bash
# JWT Secret
eas secret:create --scope project --name JWT_SECRET --value "sua-chave-jwt-super-segura-aqui"

# Firebase
eas secret:create --scope project --name FIREBASE_API_KEY --value "sua-firebase-api-key"
eas secret:create --scope project --name FIREBASE_PROJECT_ID --value "seu-project-id"

# Apple Developer
eas secret:create --scope project --name APPLE_ID --value "seu-apple-id@email.com"
eas secret:create --scope project --name ASC_APP_ID --value "seu-asc-app-id"
eas secret:create --scope project --name APPLE_TEAM_ID --value "seu-team-id"

# Google Service Account
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY_PATH --value "caminho-para-service-account.json"
```

### 2. Configurar Service Account do Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Vá para "IAM & Admin" > "Service Accounts"
3. Crie uma nova service account ou use uma existente
4. Baixe a chave JSON
5. **NUNCA** commite este arquivo no repositório
6. Configure via EAS Secrets ou variáveis de ambiente do servidor

### 3. Configurar Certificados iOS

1. Acesse o [Apple Developer Portal](https://developer.apple.com/)
2. Configure os certificados de distribuição
3. Configure os provisioning profiles
4. **NUNCA** commite arquivos .p12 ou .mobileprovision

### 4. Validar Configurações Firebase

1. Verifique se os project_ids são consistentes entre:
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
   - Variáveis de ambiente

2. Configure as regras de segurança do Firestore:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Suas regras de segurança aqui
     }
   }
   ```

### 5. Configurar JWT Secret

**CRÍTICO**: O JWT_SECRET deve ser:
- Único para cada ambiente
- Complexo (mínimo 32 caracteres)
- Nunca exposto no código

Exemplo de geração segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🚫 O QUE NUNCA FAZER

- ❌ Commitar arquivos `.env.production`
- ❌ Usar fallbacks inseguros como `'chave_secreta'`
- ❌ Expor API keys em código
- ❌ Commitar service accounts do Google
- ❌ Usar certificados de desenvolvimento em produção

## ✅ CHECKLIST DE SEGURANÇA

- [ ] JWT_SECRET configurado via variável de ambiente
- [ ] Todas as chaves Firebase via EAS Secrets
- [ ] Service account configurado corretamente
- [ ] Certificados iOS válidos
- [ ] Regras Firestore configuradas
- [ ] .gitignore atualizado
- [ ] Arquivos sensíveis removidos do repositório
- [ ] Build de produção testado

## 🔍 Validação Final

Antes de submeter para as lojas:

```bash
# Verificar se não há secrets expostos
grep -r "chave_secreta" src/
grep -r "AIza" . --exclude-dir=node_modules

# Testar build de produção
npm run build:android
npm run build:ios
```

## 📞 Suporte

Em caso de dúvidas sobre configuração de segurança, consulte:
- [Documentação EAS Secrets](https://docs.expo.dev/build-reference/variables/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)