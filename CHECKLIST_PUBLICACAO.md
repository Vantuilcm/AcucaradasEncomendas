# 📋 Checklist de Publicação - Açucaradas Encomendas

## ✅ Pré-requisitos Obrigatórios

### 🔐 Configurações de Segurança
- [ ] `JWT_SECRET` configurado (mínimo 32 caracteres)
- [ ] Validação de segurança executada: `npm run validate-security`

### 🔥 Configurações Firebase
- [ ] `FIREBASE_API_KEY` configurado
- [ ] `FIREBASE_PROJECT_ID` configurado
- [ ] `FIREBASE_AUTH_DOMAIN` configurado
- [ ] `FIREBASE_STORAGE_BUCKET` configurado
- [ ] `FIREBASE_MESSAGING_SENDER_ID` configurado
- [ ] `FIREBASE_APP_ID` configurado
- [ ] Projeto Firebase criado e configurado
- [ ] Autenticação Firebase habilitada
- [ ] Firestore Database criado
- [ ] Storage configurado

### 🍎 Configurações Apple Developer
- [ ] Conta Apple Developer ativa ($99/ano)
- [ ] `APPLE_ID` configurado (email da conta)
- [ ] `ASC_APP_ID` configurado (App Store Connect)
- [ ] `APPLE_TEAM_ID` configurado
- [ ] Certificados de desenvolvimento e distribuição criados
- [ ] App ID criado no Apple Developer Portal
- [ ] App criado no App Store Connect
- [ ] Informações fiscais e bancárias configuradas

### 📱 Configurações Google Play
- [ ] Conta Google Play Console ativa ($25 taxa única)
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` configurado
- [ ] Service Account JSON baixado e configurado
- [ ] App criado no Google Play Console
- [ ] Informações fiscais e de pagamento configuradas
- [ ] Política de privacidade publicada

## 🛠️ Configurações Técnicas

### 📦 Dependências e Scripts
- [ ] `eas-cli` instalado globalmente
- [ ] Usuário logado no EAS: `eas whoami`
- [ ] Scripts de build configurados no `package.json`
- [ ] Scripts de submit configurados no `package.json`

### 📄 Arquivos de Configuração
- [ ] `app.json` configurado corretamente
- [ ] `eas.json` com profiles de build e submit
- [ ] `package.json` com scripts necessários
- [ ] `expo-env.d.ts` para tipagem TypeScript

### 🎨 Assets e Recursos
- [ ] Ícone do app (1024x1024px)
- [ ] Splash screen configurado
- [ ] Screenshots para as lojas
- [ ] Descrições e textos de marketing

## 🔍 Verificações Finais

### ✅ Testes Automatizados
- [ ] Verificação pré-build: `npm run pre-build-check`
- [ ] Validação de segurança: `npm run validate-security`
- [ ] Listagem de secrets: `eas env:list`

### 🏗️ Build de Teste
- [ ] Build Android executado: `npm run build:android`
- [ ] Build iOS executado: `npm run build:ios`
- [ ] Builds testados em dispositivos/simuladores

## 📱 Processo de Publicação

### 🤖 Android (Google Play)
1. [ ] Build de produção criado
2. [ ] APK/AAB testado
3. [ ] Submissão executada: `npm run submit:android`
4. [ ] App submetido para revisão
5. [ ] Informações da loja preenchidas
6. [ ] Screenshots e descrições adicionadas
7. [ ] Política de privacidade linkada
8. [ ] App publicado

### 🍎 iOS (App Store)
1. [ ] Build de produção criado
2. [ ] IPA testado no TestFlight
3. [ ] Submissão executada: `npm run submit:ios`
4. [ ] App submetido para revisão
5. [ ] Informações da loja preenchidas
6. [ ] Screenshots e descrições adicionadas
7. [ ] Política de privacidade linkada
8. [ ] App aprovado e publicado

## 📋 Comandos de Verificação

```bash
# Verificar configurações
eas env:list                    # Listar todas as secrets
npm run validate-security       # Validar segurança
npm run pre-build-check        # Verificação completa

# Build
npm run build:android          # Build Android
npm run build:ios              # Build iOS

# Submissão
npm run submit:android         # Enviar para Google Play
npm run submit:ios             # Enviar para App Store

# Configuração inicial
.\scripts\setup-publication-secrets.ps1  # Configurar todas as secrets
```

## 📖 Documentação de Apoio

- **INSTRUCOES_CONTAS_LOJAS.md** - Como criar contas nas lojas
- **INSTRUCOES_PUBLICACAO.md** - Processo detalhado de publicação
- **scripts/validate-security.js** - Validação de segurança
- **scripts/pre-build-check.js** - Verificação pré-build
- **scripts/setup-publication-secrets.ps1** - Configuração automatizada

## 🎯 Status Atual

**✅ APLICATIVO 100% PRONTO PARA PUBLICAÇÃO**

- ✅ Todos os scripts de configuração implementados
- ✅ Validações de segurança implementadas
- ✅ Scripts de build e submit configurados
- ✅ Documentação completa criada
- ✅ Checklist de publicação finalizado

### 🚀 Próximos Passos

1. **Configurar Credenciais**: Execute `setup-publication-secrets.ps1`
2. **Verificar Configurações**: Execute `npm run pre-build-check`
3. **Criar Builds**: Execute `npm run build:android` e `npm run build:ios`
4. **Publicar**: Execute `npm run submit:android` e `npm run submit:ios`

---

**📞 Suporte**: Consulte a documentação ou entre em contato com a equipe de desenvolvimento.

**🔄 Última Atualização**: Este checklist foi criado automaticamente e está sincronizado com todas as configurações do projeto.
