# Checklist de Integração iOS para Açucaradas Encomendas

Este documento fornece um checklist completo das tarefas necessárias para a integração do iOS, destacando o que já foi configurado e o que ainda precisa ser feito.

## ✅ Configurações já realizadas

### Firebase

- [x] Criação do arquivo `ios/GoogleService-Info.plist` com configurações de desenvolvimento
- [x] Configuração do arquivo `app.json` para incluir o caminho do GoogleService-Info.plist
- [x] Configuração do entitlements para notificações push (`ios/my-app.entitlements`)

### Build

- [x] Configuração do script de pré-build (`scripts/prebuild-ios.sh`)
- [x] Atualização do `eas.json` para incluir o script de pré-build
- [x] Atribuição de permissão de execução ao script de pré-build

### Info.plist

- [x] Configuração de permissões de câmera
- [x] Configuração de permissões de localização
- [x] Configuração de permissões de notificações push
- [x] Configuração de permissões de acesso à galeria de fotos

## ⚠️ Tarefas pendentes

### Apple Developer Portal

- [ ] Criar certificado de distribuição no Apple Developer Portal
- [ ] Criar perfil de provisionamento para distribuição
- [ ] Gerar certificado APNs (Apple Push Notification service)
- [ ] Configurar capacidades do app no Apple Developer Portal
  - [ ] Push Notifications
  - [ ] Sign in with Apple

### Firebase

- [ ] Criar e configurar o arquivo `GoogleService-Info.prod.plist` para ambiente de produção
- [ ] Fazer upload do certificado APNs no console do Firebase
- [ ] Testar integração do Firebase com dispositivo iOS real

### OneSignal

- [ ] Fazer upload do certificado APNs no console do OneSignal
- [ ] Verificar configuração do OneSignal para iOS
- [ ] Testar entrega de notificações em dispositivo iOS

### App Store Connect

- [ ] Criar registro do aplicativo no App Store Connect
- [ ] Obter Apple ID do aplicativo para configurar o `eas.json`
- [ ] Configurar informações de metadados para a App Store
- [ ] Preparar screenshots e assets gráficos específicos para iOS

### Testes

- [ ] Testar build de produção em dispositivo físico iOS
- [ ] Verificar funcionamento correto das notificações push
- [ ] Verificar integração com câmera, localização e galeria
- [ ] Testar fluxo completo de pagamento via Stripe em iOS

## 📝 Notas importantes

1. **Certificados e Provisionamento**:

   - Os certificados têm validade de 1 ano e precisam ser renovados
   - O perfil de provisionamento precisa incluir todos os dispositivos de teste

2. **Notificações Push**:

   - O certificado APNs é diferente para ambientes de desenvolvimento e produção
   - Para testes em dispositivos reais, use o certificado de desenvolvimento
   - Para builds de produção, use o certificado de produção

3. **App Store**:

   - Prepare todos os assets gráficos conforme os requisitos da App Store
   - A revisão do app pode levar até 2 dias úteis
   - Tenha uma política de privacidade pronta antes de enviar o app

4. **Proteção de dados**:
   - A App Store exige declaração sobre uso de dados do usuário
   - Configure corretamente o arquivo Info.plist com justificativas para cada permissão

## 🔄 Próximos passos

1. Criar conta de desenvolvedor Apple (caso ainda não tenha)
2. Configurar certificados e perfis de provisionamento
3. Gerar certificado APNs para notificações
4. Criar versão de produção do arquivo GoogleService-Info.plist
5. Testar build de produção
6. Preparar metadados para envio à App Store
