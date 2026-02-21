# Guia de Configuração do Firebase

## 1. Configuração do Console Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em "Adicionar projeto" (se ainda não existir)
3. Digite o nome do projeto: "acucaradas-encomendas"
4. Ative o Google Analytics (opcional)
5. Escolha a conta do Google Analytics (ou crie uma nova)

## 2. Configuração do Authentication

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", ative os seguintes provedores:
   - Email/Senha
   - Google (opcional)

## 3. Configuração do Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste"
4. Selecione a região "southamerica-east1" (São Paulo)
5. Crie as seguintes coleções:

### Estrutura das Coleções

#### users

- Campos: uid, email, name, role, phoneNumber, addresses, createdAt, lastLogin

#### products

- Campos: id, name, description, price, imageUrl, category, available, featured

#### categories

- Campos: id, name, description, imageUrl, order

#### orders

- Campos: id, userId, items, total, status, paymentMethod, paymentStatus, deliveryAddress, createdAt

#### settings

- Campos: id, deliveryFee, minOrderValue, workingHours, contactInfo

## 4. Configuração do Storage

1. No menu lateral, clique em "Storage"
2. Clique em "Começar"
3. Escolha a região "southamerica-east1"
4. Crie as seguintes pastas:
   - /products (para imagens de produtos)
   - /categories (para imagens de categorias)
   - /users (para fotos de perfil)

## 5. Regras de Segurança

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Autenticação necessária para todas as operações
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

    // Regras específicas para usuários
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Regras para produtos e categorias
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Regras para pedidos
    match /orders/{orderId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update: if request.auth != null && (resource.data.userId == request.auth.uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
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

## 6. Verificação Final

1. Confirme se todas as configurações estão corretas no Console do Firebase
2. Verifique se as credenciais no arquivo `.env` correspondem às do seu projeto
3. Teste a conexão executando o aplicativo em modo de desenvolvimento
4. Verifique se as operações de leitura/escrita estão funcionando corretamente

## Observações Importantes

- Mantenha as chaves do Firebase seguras e nunca as compartilhe publicamente
- Em produção, configure regras de segurança mais restritas
- Faça backup regular dos dados do Firestore
- Monitore o uso do Firebase para evitar custos inesperados
- Configure limites de gastos no Console do Firebase
