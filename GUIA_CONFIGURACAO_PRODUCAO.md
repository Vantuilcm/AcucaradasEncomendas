# Guia de Configuração das Integrações Externas para Produção

Este guia detalha os passos necessários para configurar corretamente todas as integrações externas do aplicativo Açucaradas Encomendas para o ambiente de produção.

## Sumário

1. [Configuração do Firebase](#1-configuração-do-firebase)
2. [Configuração do Stripe](#2-configuração-do-stripe)
3. [Configuração do OneSignal](#3-configuração-do-onesignal)
4. [Verificação das Integrações](#4-verificação-das-integrações)

## 1. Configuração do Firebase

### 1.1 Criar Projeto de Produção

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nome: "acucaradas-encomendas-prod"
4. Ative o Google Analytics
5. Configure o Google Analytics com a conta apropriada para produção

### 1.2 Configurar Aplicativos

#### Para Android:

1. Clique em "Adicionar app" e selecione Android
2. Insira o pacote: `com.acucaradas.encomendas`
3. Apelido: "Açucaradas Encomendas"
4. Baixe o arquivo `google-services.json`
5. Salve o arquivo na raiz do projeto como `google-services.prod.json`
6. Copie-o também para a raiz do projeto como `google-services.json` (substituindo o atual)

#### Para iOS:

1. Clique em "Adicionar app" e selecione iOS
2. Insira o Bundle ID: `com.acucaradas.encomendas`
3. Apelido: "Açucaradas Encomendas"
4. Baixe o arquivo `GoogleService-Info.plist`
5. Crie a pasta `ios/` na raiz do projeto, se não existir
6. Salve o arquivo na pasta `ios/` como `GoogleService-Info.plist`

### 1.3 Configurar Firestore Database

1. No menu lateral, acesse "Firestore Database"
2. Clique em "Criar banco de dados"
3. **Importante**: Selecione "Iniciar no modo de produção"
4. Escolha a região "southamerica-east1" (São Paulo)
5. Configure as regras de segurança conforme abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Autenticação necessária para todas as operações
    match /{document=**} {
      allow read, write: if false; // Bloqueia acesso geral
    }

    // Regras específicas para usuários
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Regras para produtos e categorias
    match /products/{productId} {
      allow read: if true; // Leitura pública de produtos
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /categories/{categoryId} {
      allow read: if true; // Leitura pública de categorias
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Regras para pedidos
    match /orders/{orderId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update: if request.auth != null && (resource.data.userId == request.auth.uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Configurações
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 1.4 Configurar Storage

1. No menu lateral, acesse "Storage"
2. Clique em "Começar"
3. Selecione "Iniciar no modo de produção"
4. Escolha a região "southamerica-east1" (São Paulo)
5. Configure as regras de segurança conforme abaixo:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if false; // Bloqueia escrita geral
    }

    match /products/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }

    match /categories/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }

    match /users/{userId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 1.5 Configurar Authentication

1. No menu lateral, acesse "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", ative:
   - Email/Senha
   - Google
   - Apple (para iOS)

### 1.6 Configurar Crashlytics

1. No menu lateral, acesse "Crashlytics"
2. Clique em "Começar"
3. Siga as instruções para configurar o Crashlytics no projeto

### 1.7 Configurar Analytics

1. No menu lateral, acesse "Analytics"
2. Configure eventos personalizados e conversões para monitorar:
   - Registros de usuários
   - Acessos ao carrinho
   - Compras finalizadas
   - Visualizações de produtos

## 2. Configuração do Stripe

### 2.1 Criar Conta de Produção

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Se você já tem uma conta de teste, crie uma nova conta para produção ou mude para o modo de produção
3. Complete todas as informações da empresa:
   - Informações fiscais
   - Dados bancários para recebimento
   - Documentação legal

### 2.2 Obter Chaves de API de Produção

1. No Stripe Dashboard, acesse "Desenvolvedores" > "Chaves de API"
2. Obtenha as seguintes chaves:
   - Chave publicável (`STRIPE_PUBLISHABLE_KEY`)
   - Chave secreta (`STRIPE_SECRET_KEY`)

### 2.3 Configurar Webhooks

1. No Stripe Dashboard, acesse "Desenvolvedores" > "Webhooks"
2. Adicione um endpoint para seu servidor de produção
3. Configure os eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`

### 2.4 Atualizar Configurações no Aplicativo

1. Edite o arquivo `.env` na raiz do projeto e atualize a chave:

   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxx
   ```

2. Se você estiver usando uma API própria, atualize a chave secreta lá:
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
   ```

## 3. Configuração do OneSignal

### 3.1 Criar Aplicativo em Produção

1. Acesse [OneSignal Dashboard](https://app.onesignal.com/)
2. Clique em "Add App" (ou use a mesma aplicação, alterando as configurações)
3. Nome: "Açucaradas Encomendas - Produção"
4. Selecione as plataformas: Android e iOS
5. Configure cada plataforma:

#### Para Android:

- Firebase Server Key: Obtenha no Firebase Console > Configurações do projeto > Cloud Messaging
- Google Project Number: Disponível nas configurações do Firebase

#### Para iOS:

- Carregue o certificado de produção `.p12`
- Insira a senha do certificado

### 3.2 Obter App ID de Produção

1. No dashboard do OneSignal, acesse as configurações do app
2. Obtenha o "OneSignal App ID"

### 3.3 Atualizar Configurações no Aplicativo

1. Edite o arquivo `.env` na raiz do projeto e atualize a chave:
   ```
   ONE_SIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

## 4. Verificação das Integrações

### 4.1 Verificação do Firebase

1. Execute o seguinte comando para validar a configuração:

   ```bash
   npx firebase apps:check-playintegrity
   ```

2. Teste a autenticação em ambiente de produção:
   ```
   # Adicione este código temporariamente para testar
   try {
     await firebase.auth().signInWithEmailAndPassword('teste@acucaradas.com.br', 'senha123');
     console.log('Login bem-sucedido!');
   } catch (error) {
     console.error('Erro no login:', error);
   }
   ```

### 4.2 Verificação do Stripe

1. Realizar um pagamento de teste real com um cartão de crédito válido
   - Use valores pequenos (R$ 1,00)
   - Verifique se o pagamento aparece no Dashboard do Stripe

### 4.3 Verificação do OneSignal

1. Envie uma notificação de teste através do dashboard do OneSignal
2. Verifique se a notificação é recebida no dispositivo

## Próximos Passos

Após completar todas as configurações acima:

1. Atualize o `app.config.ts` ou `app.json` para apontar para os serviços de produção
2. Execute um build de teste com as configurações de produção
3. Teste exaustivamente todas as integrações antes da publicação final

---

Em caso de dúvidas ou problemas, consulte a documentação oficial de cada serviço ou entre em contato com o suporte técnico do projeto.
