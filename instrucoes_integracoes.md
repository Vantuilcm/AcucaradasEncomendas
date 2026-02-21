# Instruções para Configuração de Integrações Externas

Este documento fornece instruções detalhadas para configurar todas as integrações externas necessárias para o aplicativo Açucaradas Encomendas, incluindo Firebase, Stripe e OneSignal.

## 1. Firebase

O Firebase é utilizado para autenticação, banco de dados Firestore, armazenamento e notificações. O arquivo `google-services.json` atual é apenas um exemplo e precisa ser substituído por um arquivo real.

### 1.1 Criar Projeto Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nomeie o projeto como "Açucaradas Encomendas"
4. Ative o Google Analytics (opcional, mas recomendado)
5. Selecione a conta do Google Analytics ou crie uma nova
6. Clique em "Criar projeto"

### 1.2 Adicionar Aplicativo Android

1. No console do Firebase, clique no ícone do Android
2. Registre o app com o pacote `com.acucaradas.encomendas`
3. Defina um apelido (opcional, ex: "Açucaradas Android")
4. Baixe o arquivo `google-services.json`
5. Substitua o arquivo existente na raiz do projeto

### 1.3 Adicionar Aplicativo iOS (se aplicável)

1. No console do Firebase, clique no ícone do iOS (símbolo da Apple)
   - Alternativamente, vá para Configurações do projeto > Seus aplicativos > Adicionar aplicativo > iOS
2. Registre o app com o Bundle ID `com.acucaradas.encomendas`
   - **Importante**: O Bundle ID deve corresponder exatamente ao configurado no arquivo app.json/app.config.ts
3. Defina um apelido (opcional, ex: "Açucaradas iOS")
   - Este nome é apenas para identificação interna no Firebase
4. Baixe o arquivo `GoogleService-Info.plist`
   - Salve o arquivo em um local seguro, pois contém informações sensíveis
5. Adicione este arquivo ao projeto para uso com EAS Build:
   - Crie uma pasta `ios` na raiz do projeto (se não existir)
   - Copie o arquivo `GoogleService-Info.plist` para esta pasta
   - Configure o arquivo `eas.json` para incluir este arquivo durante o build
   - Para maior segurança, considere usar secrets do EAS:

     ```bash
     # Converter o arquivo para base64
     [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("caminho/para/GoogleService-Info.plist"))

     # Adicionar como secret do EAS
     eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --value "conteúdo_base64_aqui"
     ```

   - Adicione um hook no app.config.js/ts para usar este secret durante o build

> **Nota**: Para instruções mais detalhadas sobre a configuração do aplicativo iOS no Firebase, consulte o arquivo `GUIA_ADICIONAR_APP_IOS_FIREBASE.md`

### 1.4 Configurar Firestore

1. No console do Firebase, vá para "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha o modo de inicialização (recomendado: "Iniciar no modo de teste")
4. Selecione a região mais próxima (ex: "southamerica-east1" para São Paulo)
5. Crie as seguintes coleções:
   - `users`
   - `products`
   - `categories`
   - `orders`
   - `settings`

### 1.5 Configurar Authentication

1. No console do Firebase, vá para "Authentication"
2. Clique em "Começar"
3. Ative os seguintes métodos de autenticação:
   - E-mail/senha
   - Google (opcional)
   - Telefone (opcional)

### 1.6 Configurar Storage

1. No console do Firebase, vá para "Storage"
2. Clique em "Começar"
3. Escolha o modo de inicialização (recomendado: "Iniciar no modo de teste")
4. Selecione a região (a mesma do Firestore)
5. Crie as seguintes pastas:
   - `product_images`
   - `profile_pictures`
   - `category_images`

### 1.7 Regras de Segurança

Atualize as regras de segurança do Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Perfil do usuário - apenas o próprio usuário pode ler/escrever
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Produtos - todos podem ler, apenas admin pode escrever
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Categorias - todos podem ler, apenas admin pode escrever
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Pedidos - usuários podem ver seus próprios pedidos, admin pode ver todos
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow update: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Configurações - todos podem ler, apenas admin pode escrever
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 2. Stripe

O Stripe é usado para processamento de pagamentos. É necessário criar uma conta e obter as chaves de API de produção.

### 2.1 Criar Conta Stripe

1. Acesse [Stripe.com](https://stripe.com/br) e crie uma conta
2. Complete as informações da empresa e verificação
3. Configure as informações bancárias para receber pagamentos

### 2.2 Obter Chaves de API

1. No dashboard do Stripe, vá para "Desenvolvedores" > "Chaves de API"
2. Note que existem dois tipos de chaves: test e live
3. Para o ambiente de produção, você precisará das chaves "live"
4. Copie a "Chave publicável" e a "Chave secreta"

### 2.3 Configurar no Aplicativo

Substitua as chaves de teste pelas chaves de produção no arquivo de configuração do aplicativo (geralmente em `src/config/stripe.js` ou similar):

```javascript
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX';
// A chave secreta deve ser usada apenas no backend, nunca no aplicativo cliente
```

### 2.4 Configurar Webhook (para backend)

1. No dashboard do Stripe, vá para "Desenvolvedores" > "Webhooks"
2. Clique em "Adicionar endpoint"
3. Insira a URL do seu backend que processará eventos do Stripe (ex: `https://api.acucaradas.com.br/webhook/stripe`)
4. Selecione os eventos que deseja receber (recomendado: `payment_intent.succeeded`, `payment_intent.payment_failed`)
5. Copie a "Chave de assinatura do webhook" para verificar as solicitações no seu backend

## 3. OneSignal

O OneSignal é usado para enviar notificações push para os usuários.

### 3.1 Criar Conta e Aplicativo

1. Acesse [OneSignal.com](https://www.onesignal.com/) e crie uma conta
2. Clique em "New App/Website"
3. Nomeie o aplicativo como "Açucaradas Encomendas"
4. Selecione as plataformas (Android e iOS)

### 3.2 Configurar para Android

1. Na seção "Configure Platform", selecione "Google Android"
2. Você precisará de um Servidor Firebase Cloud Messaging (FCM)
3. Vá para o Console do Firebase > Configurações do projeto > Cloud Messaging
4. Copie a "Chave do servidor" e cole-a no OneSignal
5. Siga as instruções para configurar o SDK do OneSignal em seu aplicativo Android

### 3.3 Configurar para iOS (se aplicável)

1. Na seção "Configure Platform", selecione "Apple iOS"
2. Siga as instruções para criar um certificado de push da Apple
3. Faça upload do certificado para o OneSignal
4. Configure o SDK do OneSignal em seu aplicativo iOS

### 3.4 Adicionar SDK ao Aplicativo

1. Instale o SDK do OneSignal (já incluído no `package.json`)
2. Configure o OneSignal no arquivo principal do aplicativo (geralmente em `App.js` ou similar):

```javascript
import OneSignal from 'react-native-onesignal';

// Em algum lugar na inicialização do app
OneSignal.setAppId('SEU_ID_DO_ONESIGNAL');
OneSignal.setLogLevel(6, 0);
OneSignal.promptForPushNotificationsWithUserResponse(response => {
  console.log('Permissão de notificação: ', response);
});
```

### 3.5 Criar Segmentos de Usuários

1. No dashboard do OneSignal, vá para "Audience" > "Segments"
2. Crie segmentos para diferentes tipos de usuários e comportamentos:
   - Todos os usuários
   - Usuários ativos (abriram o app nos últimos 30 dias)
   - Usuários com carrinho abandonado
   - Usuários que fizeram compras recentes

### 3.6 Configurar Automações de Notificações

1. No dashboard do OneSignal, vá para "Messages" > "Automations"
2. Configure automações para eventos importantes:
   - Boas-vindas para novos usuários
   - Lembrete de carrinho abandonado após 24 horas
   - Notificação de status de pedido (integração com backend)

## 4. Verificações Finais

Antes de publicar o aplicativo, verifique:

1. **Firebase**: Firestore, Authentication e Storage estão configurados corretamente
2. **Stripe**: As chaves de API live estão configuradas (não as de teste)
3. **OneSignal**: As notificações push estão funcionando em ambas as plataformas
4. **Ambiente de Produção**: Todas as URLs e endpoints estão apontando para o ambiente de produção
5. **Segurança**: Chaves secretas não estão expostas no código do cliente

## 5. Tarefas Pós-Configuração

1. Criar um usuário administrador para gerenciar o conteúdo
2. Adicionar alguns produtos e categorias iniciais
3. Testar o fluxo completo de pagamento no ambiente de produção
4. Enviar uma notificação push de teste para verificar a configuração do OneSignal

---

Com essas configurações, o aplicativo Açucaradas Encomendas estará pronto para usar todas as integrações externas em ambiente de produção. Lembre-se de manter os arquivos de configuração seguros e não compartilhá-los publicamente.
