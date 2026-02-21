# Configuração Completa do OneSignal - FCM Android

## ✅ Configurações Já Implementadas

### 1. Plugin do OneSignal
- ✅ Plugin `onesignal-expo-plugin` adicionado ao `package.json`
- ✅ Plugin configurado no `app.config.ts` com modo automático (development/production)
- ✅ Permissões Android adicionadas (WAKE_LOCK, INTERNET, ACCESS_NETWORK_STATE)

### 2. Variáveis de Ambiente
- ✅ `ONESIGNAL_APP_ID=2df9c7f0-6fb7-4cbe-87e9-c6fb116203f7` configurado no `.env`
- ✅ `EXPO_PUBLIC_ONESIGNAL_APP_ID=2df9c7f0-6fb7-4cbe-87e9-c6fb116203f7` configurado no `.env`
- ✅ Referência corrigida no `app.config.ts` para usar `ONESIGNAL_APP_ID`

### 3. Código de Inicialização
- ✅ Arquivo `src/config/onesignal.ts` com configuração completa
- ✅ Inicialização no `src/App.tsx` com `initOneSignal()`
- ✅ Suporte a diferentes ambientes e tipos de notificação

## 🔧 Próximos Passos Obrigatórios

### 1. Instalar Dependências
```bash
npm install --legacy-peer-deps
```

### 2. Configurar FCM Server Key no Dashboard OneSignal
1. Acesse [OneSignal Dashboard](https://app.onesignal.com)
2. Selecione seu app: `2df9c7f0-6fb7-4cbe-87e9-c6fb116203f7`
3. Vá em **Settings** > **Platforms** > **Google Android (FCM)**
4. Adicione sua **FCM Server Key** do Firebase Console
5. Salve as configurações

### 3. Verificar Arquivo google-services.json
- ✅ Confirme que o arquivo `google-services.json` está presente no projeto
- ✅ Verifique se corresponde ao projeto Firebase correto
- ✅ Arquivo deve estar referenciado corretamente no `app.config.ts`

### 4. Rebuild do Projeto
```bash
# Limpar cache
npx expo start --clear

# Ou fazer novo build
npx expo run:android
```

### 5. Testar Notificações
1. Execute o app em um dispositivo físico Android
2. Aceite as permissões de notificação
3. Verifique no Dashboard OneSignal se o dispositivo aparece como "Subscribed"
4. Envie uma notificação teste pelo dashboard

## 📱 Funcionalidades Implementadas

- ✅ Inicialização automática do OneSignal
- ✅ Solicitação de permissões de notificação
- ✅ Configuração de tags de usuário
- ✅ Manipuladores de notificação (foreground/background)
- ✅ Suporte a notificações in-app
- ✅ Segmentação de usuários por tipo, localização, etc.
- ✅ **NOVO**: Diagnósticos automáticos do OneSignal
- ✅ **NOVO**: Painel de teste visual para desenvolvimento
- ✅ **NOVO**: Utilitários de debug e troubleshooting

## 🔐 Segurança

- ✅ App ID configurado corretamente
- ✅ API Key não exposta no código cliente (conforme recomendado)
- ✅ Configuração por ambiente (dev/prod)

## 📋 Checklist Final

- [ ] Executar `npm install --legacy-peer-deps`
- [ ] Configurar FCM Server Key no dashboard OneSignal
- [ ] Verificar arquivo `google-services.json`
- [ ] Fazer rebuild do projeto
- [ ] Testar em dispositivo físico
- [ ] Verificar usuários inscritos no dashboard
- [ ] Enviar notificação teste

## 🆘 Troubleshooting

Se houver problemas:
1. Limpe o cache: `npx expo start --clear`
2. Reinstale dependências: `rm -rf node_modules && npm install --legacy-peer-deps`
3. Verifique logs do dispositivo para erros de FCM
4. Confirme que o `google-services.json` está correto

---

**Status**: Configuração base completa ✅  
**Próximo passo**: Configurar FCM Server Key no dashboard OneSignal