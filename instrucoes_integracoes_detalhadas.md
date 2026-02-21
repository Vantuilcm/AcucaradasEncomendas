# Instruções Detalhadas para Configuração de Integrações Externas

Este documento fornece instruções detalhadas para configurar todas as integrações externas necessárias para o aplicativo Açucaradas Encomendas, incluindo Firebase, Stripe e OneSignal. O guia abrange tanto a configuração para ambiente de desenvolvimento quanto a migração para ambiente de produção.

## Sumário

1. [Firebase](#1-firebase)

   - [Configuração Inicial](#11-configuração-inicial)
   - [Configuração para Produção](#12-configuração-para-produção)
   - [Estrutura do Banco de Dados](#13-estrutura-do-banco-de-dados)
   - [Regras de Segurança](#14-regras-de-segurança)

2. [Stripe](#2-stripe)

   - [Configuração Inicial](#21-configuração-inicial)
   - [Migração para Produção](#22-migração-para-produção)
   - [Webhooks](#23-webhooks)
   - [Testes de Pagamento](#24-testes-de-pagamento)

3. [OneSignal](#3-onesignal)

   - [Configuração Inicial](#31-configuração-inicial)
   - [Migração para Produção](#32-migração-para-produção)
   - [Segmentação de Usuários](#33-segmentação-de-usuários)
   - [Tipos de Notificações](#34-tipos-de-notificações)

4. [Variáveis de Ambiente](#4-variáveis-de-ambiente)

   - [Configuração do .env](#41-configuração-do-env)
   - [Uso no Código](#42-uso-no-código)

5. [Verificação e Testes](#5-verificação-e-testes)
   - [Checklist de Publicação](#51-checklist-de-publicação)
   - [Testes de Integração](#52-testes-de-integração)

---

## 1. Firebase

### 1.1 Configuração Inicial

O Firebase é utilizado para autenticação, banco de dados Firestore, armazenamento e notificações. A configuração atual no código está preparada para ler as variáveis de ambiente através do Expo Constants.

#### Criação do Projeto Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nomeie o projeto como "Açucaradas Encomendas"
4. Ative o Google Analytics (recomendado)
5. Selecione a conta do Google Analytics ou crie uma nova
6. Clique em "Criar projeto"

#### Registro dos Aplicativos

**Para Android:**

1. No console do Firebase, clique no ícone do Android
2. Registre o app com o pacote `com.acucaradas.encomendas`
3. Baixe o arquivo `google-services.json`
4. Coloque o arquivo na raiz do projeto

**Para iOS:**

1. No console do Firebase, clique no ícone do iOS
2. Registre o app com o Bundle ID `com.acucaradas.encomendas`
3. Baixe o arquivo `GoogleService-Info.plist`
4. Configure o arquivo para ser incluído no build do iOS

#### Configuração no Código

O arquivo `src/config/firebase.ts` já está configurado para ler as variáveis de ambiente. Certifique-se de que as variáveis estejam definidas no arquivo `.env`:

```javascript
// Exemplo do arquivo .env
EXPO_PUBLIC_FIREBASE_API_KEY = your_api_key;
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = your_auth_domain;
EXPO_PUBLIC_FIREBASE_PROJECT_ID = your_project_id;
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = your_storage_bucket;
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = your_messaging_sender_id;
EXPO_PUBLIC_FIREBASE_APP_ID = your_app_id;
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = your_measurement_id;
```

### 1.2 Configuração para Produção

Para migrar do ambiente de desenvolvimento para produção, siga estes passos:

1. Crie um novo projeto Firebase para produção ou use um ambiente separado no mesmo projeto
2. Gere novos arquivos `google-services.json` e `GoogleService-Info.plist` para o ambiente de produção
3. Renomeie o arquivo atual para `google-services.dev.json` e o novo para `google-services.json`
4. Atualize as variáveis de ambiente para apontar para o projeto de produção

**Importante:** Nunca compartilhe suas chaves de API ou arquivos de configuração em repositórios públicos.

#### Configuração de Variáveis de Ambiente para Produção

Crie um arquivo `.env.production` com as variáveis de ambiente de produção:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_production_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_production_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_production_measurement_id
```

### 1.3 Estrutura do Banco de Dados

O Firestore deve ser estruturado com as seguintes coleções:

- **users**: Informações dos usuários

  - Campos: uid, email, name, role, phoneNumber, addresses, createdAt, lastLogin

- **products**: Catálogo de produtos

  - Campos: id, name, description, price, imageUrl, category, available, featured

- **categories**: Categorias de produtos

  - Campos: id, name, description, imageUrl, order

- **orders**: Pedidos dos clientes

  - Campos: id, userId, items, total, status, paymentMethod, paymentStatus, deliveryAddress, createdAt

- **settings**: Configurações do aplicativo
  - Campos: id, deliveryFee, minOrderValue, workingHours, contactInfo

### 1.4 Regras de Segurança

Configurações recomendadas para as regras de segurança do Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Perfil do usuário - apenas o próprio usuário pode ler/escrever
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Produtos - todos podem ler, apenas admin pode escrever
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Categorias - todos podem ler, apenas admin pode escrever
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Pedidos - usuários podem ver seus próprios pedidos, admin pode ver todos
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Configurações - todos podem ler, apenas admin pode escrever
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

Para o Storage, configure regras semelhantes:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Imagens de produtos - todos podem ler, apenas admin pode escrever
    match /product_images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024 &&
                   (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('application/octet-stream')) &&
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Fotos de perfil - usuários podem gerenciar suas próprias fotos
    match /profile_pictures/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId &&
                   request.resource.size < 5 * 1024 * 1024 &&
                   (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('application/octet-stream'));
    }
  }
}
```

## 2. Stripe

### 2.1 Configuração Inicial

O Stripe é utilizado para processamento de pagamentos. A configuração atual no código está preparada para ler as variáveis de ambiente.

#### Criação da Conta Stripe

1. Acesse [Stripe.com](https://stripe.com/br) e crie uma conta
2. Complete as informações da empresa e verificação
3. Configure as informações bancárias para receber pagamentos

#### Obtenção das Chaves de API

1. No dashboard do Stripe, vá para "Desenvolvedores" > "Chaves de API"
2. Copie a "Chave publicável" (começa com `pk_test_`) e a "Chave secreta" (começa com `sk_test_`)

#### Configuração no Código

O arquivo `src/config/stripe.ts` já está configurado para ler as variáveis de ambiente. Certifique-se de que as variáveis estejam definidas no arquivo `.env`:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
```

### 2.2 Migração para Produção

Para migrar do ambiente de desenvolvimento para produção, siga estes passos:

1. No dashboard do Stripe, alterne para o modo "Live" (ao invés de "Test")
2. Obtenha as chaves de produção (começam com `pk_live_` e `sk_live_`)
3. Atualize as variáveis de ambiente para usar as chaves de produção

**Importante:** A chave secreta (`sk_live_`) nunca deve ser exposta no código do cliente. Ela deve ser usada apenas no backend.

#### Configuração de Variáveis de Ambiente para Produção

Atualize o arquivo `.env.production` com as chaves de produção do Stripe:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
```

### 2.3 Webhooks

Para processar eventos do Stripe (como confirmações de pagamento), configure webhooks:

1. No dashboard do Stripe, vá para "Desenvolvedores" > "Webhooks"
2. Clique em "Adicionar endpoint"
3. Insira a URL do seu backend (ex: `https://api.acucaradas.com.br/webhook/stripe`)
4. Selecione os eventos relevantes:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
5. Copie a "Chave de assinatura do webhook" para verificar as solicitações no seu backend

### 2.4 Testes de Pagamento

Antes de migrar para produção, teste os pagamentos no ambiente de teste:

1. Use os [cartões de teste do Stripe](https://stripe.com/docs/testing#cards)
2. Teste diferentes cenários (pagamento bem-sucedido, recusado, etc.)
3. Verifique se os webhooks estão funcionando corretamente

## 3. OneSignal

### 3.1 Configuração Inicial

O OneSignal é utilizado para enviar notificações push. A configuração atual no código está preparada para inicializar o OneSignal e gerenciar as notificações.

#### Criação da Conta e Aplicativo

1. Acesse [OneSignal.com](https://www.onesignal.com/) e crie uma conta
2. Clique em "New App/Website"
3. Nomeie o aplicativo como "Açucaradas Encomendas"
4. Selecione as plataformas (Android e iOS)

#### Configuração para Android

1. Na seção "Configure Platform", selecione "Google Android"
2. Você precisará de um Servidor Firebase Cloud Messaging (FCM)
3. Vá para o Console do Firebase > Configurações do projeto > Cloud Messaging
4. Copie a "Chave do servidor" e cole-a no OneSignal

#### Configuração para iOS

1. Na seção "Configure Platform", selecione "Apple iOS"
2. Siga as instruções para criar um certificado de push da Apple
3. Faça upload do certificado para o OneSignal

#### Configuração no Código

O arquivo `src/config/onesignal.ts` já está configurado para inicializar o OneSignal. Atualize o ID do aplicativo no código:

```javascript
// IDs do OneSignal para diferentes ambientes
const ONESIGNAL_APP_ID = {
  development: 'seu_id_de_desenvolvimento_onesignal',
  production: 'seu_id_de_producao_onesignal',
};
```

A inicialização do OneSignal é feita no arquivo `App.tsx`:

```javascript
// Inicializar OneSignal assim que o aplicativo for carregado
useEffect(() => {
  initOneSignal();
}, []);
```

### 3.2 Migração para Produção

Para migrar do ambiente de desenvolvimento para produção, siga estes passos:

1. No dashboard do OneSignal, crie um novo aplicativo para produção ou use o mesmo
2. Atualize o ID do aplicativo no código para o ambiente de produção
3. Certifique-se de que as configurações de FCM (Android) e APN (iOS) estão corretas para produção

### 3.3 Segmentação de Usuários

O OneSignal permite segmentar usuários para enviar notificações específicas. No código, isso é feito através de tags:

```javascript
// Configurar tags do usuário no OneSignal
if (user.uid) {
  setOneSignalTags({
    user_id: user.uid,
    user_type: user.role || 'customer',
    email: user.email || '',
    last_login: new Date().toISOString(),
  });
}
```

No dashboard do OneSignal, você pode criar segmentos baseados nessas tags:

1. Vá para "Audience" > "Segments"
2. Crie segmentos para diferentes tipos de usuários:
   - Todos os clientes (`user_type = customer`)
   - Entregadores (`user_type = delivery`)
   - Administradores (`user_type = admin`)

### 3.4 Tipos de Notificações

O código define vários tipos de notificações que podem ser enviadas:

```javascript
export enum OneSignalNotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  DELIVERY_AVAILABLE = 'DELIVERY_AVAILABLE',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  DELIVERY_STATUS_UPDATE = 'DELIVERY_STATUS_UPDATE',
  DELIVERY_NEARBY = 'DELIVERY_NEARBY',
  PROMOTION = 'PROMOTION',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  CUSTOM = 'CUSTOM'
}
```

Para cada tipo, há uma função que formata a notificação adequadamente:

```javascript
export const formatOneSignalNotification = (
  type: OneSignalNotificationType,
  data: any
): OneSignalNotificationData => {
  // Formatação específica para cada tipo de notificação
  // ...
};
```

## 4. Variáveis de Ambiente

### 4.1 Configuração do .env

O projeto utiliza variáveis de ambiente para configurar as integrações externas. Crie os seguintes arquivos:

- `.env`: Para ambiente de desenvolvimento
- `.env.production`: Para ambiente de produção

Baseado no arquivo `.env.example`, inclua todas as variáveis necessárias:

```
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_SECRET_KEY=your_secret_key

# OneSignal
# (Configurado diretamente no código)

# Outras configurações
EXPO_PUBLIC_API_URL=your_api_url
EXPO_PUBLIC_APP_ENV=development
```

### 4.2 Uso no Código

As variáveis de ambiente são acessadas através do `Constants.expoConfig?.extra` no código:

```javascript
// Exemplo do Firebase
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  // ...
};
```

Essas variáveis são definidas no arquivo `app.config.ts`:

```javascript
export default ({ config }: ConfigContext): ExpoConfig => ({
  // ...
  extra: {
    eas: {
      projectId: process.env.EXPO_PROJECT_ID,
    },
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    // ...
  },
});
```

## 5. Verificação e Testes

### 5.1 Checklist de Publicação

Antes de publicar o aplicativo, verifique:

1. **Firebase**:

   - [ ] Projeto de produção criado e configurado
   - [ ] Arquivo `google-services.json` de produção substituído
   - [ ] Regras de segurança do Firestore configuradas para produção
   - [ ] Authentication configurado com os métodos necessários
   - [ ] Storage configurado com as regras de segurança adequadas

2. **Stripe**:

   - [ ] Conta verificada e aprovada para pagamentos reais
   - [ ] Chaves de API de produção configuradas
   - [ ] Webhooks configurados para o ambiente de produção
   - [ ] Testes de pagamento realizados no ambiente de produção

3. **OneSignal**:

   - [ ] Aplicativo configurado para produção
   - [ ] Certificados de push configurados (FCM para Android, APN para iOS)
   - [ ] Segmentos de usuários criados
   - [ ] Testes de notificação realizados

4. **Variáveis de Ambiente**:
   - [ ] Arquivo `.env.production` criado com todas as variáveis necessárias
   - [ ] Nenhuma chave secreta exposta no código do cliente

### 5.2 Testes de Integração

Realize os seguintes testes antes de publicar:

1. **Firebase**:

   - Autenticação (login, registro, recuperação de senha)
   - Leitura e escrita no Firestore
   - Upload e download de arquivos no Storage

2. **Stripe**:

   - Fluxo completo de pagamento
   - Tratamento de erros de pagamento
   - Recebimento e processamento de webhooks

3. **OneSignal**:
   - Recebimento de notificações push
   - Segmentação de usuários
   - Ações em notificações (abrir tela específica)

---

Este documento fornece instruções detalhadas para configurar todas as integrações externas necessárias para o aplicativo Açucaradas Encomendas. Siga as instruções cuidadosamente para garantir que o aplicativo funcione corretamente em ambiente de produção.

**Importante:** Mantenha todas as chaves e credenciais seguras. Nunca compartilhe chaves secretas ou arquivos de configuração em repositórios públicos.
