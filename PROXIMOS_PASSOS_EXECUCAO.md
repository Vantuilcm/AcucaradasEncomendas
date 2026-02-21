# 🚀 Próximos Passos - Execução Imediata

## ⚡ Execução Rápida (5 minutos)

### 1. Configurar EAS Secrets
```bash
# Opção A: Script automatizado (Recomendado)
npm run setup-secrets

# Opção B: Manual
eas secret:create --scope project --name JWT_SECRET --value "sua-chave-jwt-super-segura-aqui"
eas secret:create --scope project --name FIREBASE_API_KEY --value "sua-firebase-api-key"
eas secret:create --scope project --name FIREBASE_PROJECT_ID --value "acucaradas-encomendas-prod"
```

### 2. Gerar JWT Secret Seguro
```bash
# Gerar chave de 64 caracteres
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Validar Configurações
```bash
# Verificar se tudo está correto
npm run pre-build-check
```

### 4. Testar Build
```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## 🔧 Configurações Específicas

### Firebase API Key
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: `acucaradas-encomendas-prod`
3. Vá em **Configurações do Projeto** > **Geral**
4. Na seção **Seus apps**, copie a **Chave da API da Web**

### Apple Developer
1. Acesse [App Store Connect](https://appstoreconnect.apple.com/)
2. Vá em **Usuários e Acesso** > **Chaves**
3. Anote:
   - **Apple ID**: Seu email de desenvolvedor
   - **ASC App ID**: ID do app no App Store Connect
   - **Team ID**: Encontrado em **Membership**

### Google Service Account
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **IAM & Admin** > **Service Accounts**
3. Crie ou baixe a chave JSON
4. **IMPORTANTE**: Não commite este arquivo!
5. Configure via EAS Secrets ou servidor

## ✅ Checklist de Execução

- [ ] **EAS Secrets configuradas**
  ```bash
  eas secret:list
  ```

- [ ] **JWT_SECRET seguro (32+ caracteres)**
  ```bash
  echo $JWT_SECRET | wc -c
  ```

- [ ] **Firebase configurado**
  - [ ] API Key válida
  - [ ] Project ID: `acucaradas-encomendas-prod`
  - [ ] Configurações Android/iOS consistentes

- [ ] **Validação passou**
  ```bash
  npm run pre-build-check
  ```

- [ ] **Build de teste executado**
  ```bash
  npm run build:android
  # ou
  npm run build:ios
  ```

## 🚨 Problemas Comuns

### "JWT_SECRET não configurada"
```bash
# Solução:
eas secret:create --scope project --name JWT_SECRET --value "$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
```

### "Project IDs inconsistentes"
- ✅ **Já corrigido**: Todos os arquivos agora usam `acucaradas-encomendas-prod`

### "EAS CLI não encontrado"
```bash
npm install -g @expo/eas-cli
eas login
```

### "Arquivo sensível encontrado"
- ✅ **Já corrigido**: Arquivos removidos e `.gitignore` atualizado

## 📞 Comandos de Emergência

### Resetar EAS Secrets
```bash
# Listar secrets
eas secret:list

# Deletar secret específica
eas secret:delete --scope project --name JWT_SECRET

# Recriar
eas secret:create --scope project --name JWT_SECRET --value "nova-chave"
```

### Verificar Status Completo
```bash
# Validação completa
npm run validate-security
npm run pre-build-check

# Verificar TypeScript
npx tsc --noEmit

# Verificar ESLint
npm run lint
```

## 🎯 Meta: Build de Produção em 10 minutos

1. **2 min**: Configurar EAS Secrets (`npm run setup-secrets`)
2. **1 min**: Validar configurações (`npm run pre-build-check`)
3. **7 min**: Build de produção (`npm run build:android`)

**Total**: ⏱️ **10 minutos** para build seguro de produção!

---

💡 **Dica**: Execute `npm run setup-secrets` primeiro para configuração guiada!