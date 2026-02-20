// Regras de segurança do Firestore para Açucaradas Encomendas
// Estas regras devem ser copiadas para o console do Firebase -> Firestore -> Rules

const firestoreRules = `
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
    // e produtores podem ver pedidos da própria loja (producerId)
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true ||
        (
          resource.data.producerId != null &&
          get(/databases/$(database)/documents/producers/$(resource.data.producerId)).data.userId == request.auth.uid
        )
      );
      allow update: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  
  // Endereços - o usuário só pode ler/escrever os próprios endereços
  match /addresses/{addressId} {
    // Leitura e alterações em documentos já existentes
    allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    
    // Criação de novos endereços
    allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  }
  
  // Chaves PIX - o usuário só pode ler/escrever as próprias chaves
  match /pix_keys/{pixKeyId} {
    allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  }
  
  // Cartões de pagamento - o usuário só pode ler/escrever os próprios cartões
  match /payment_cards/{cardId} {
    allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  }
    
    // Configurações - todos podem ler, apenas admin pode escrever
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
`;

export default firestoreRules;
