// Regras de segurança do Firestore para Açucaradas Encomendas (PRODUÇÃO)
// Estas regras são mais restritivas e devem ser usadas no ambiente de produção

const firestoreRulesProd = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Função para verificar se o usuário é administrador
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Função para verificar se é o próprio usuário
    function isSelf(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Validação básica de dados do usuário
    function isValidUser(userData) {
      return userData.size() <= 15 && 
        'email' in userData && 
        'name' in userData && 
        'createdAt' in userData;
    }
    
    // Perfil do usuário - apenas o próprio usuário pode ler/escrever
    match /users/{userId} {
      allow read: if isSelf(userId) || isAdmin();
      allow create: if isSelf(userId) && isValidUser(request.resource.data);
      allow update: if (isSelf(userId) && isValidUser(request.resource.data)) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Produtos - todos podem ler, apenas admin pode escrever
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Categorias - todos podem ler, apenas admin pode escrever
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Pedidos - usuários podem ver/criar seus próprios pedidos, admin pode ver/editar todos
    match /orders/{orderId} {
      allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.status == 'pending';
      allow read: if request.auth != null && 
                 (request.auth.uid == resource.data.userId || isAdmin());
      allow update: if (request.auth != null && 
                     request.auth.uid == resource.data.userId && 
                     resource.data.status == 'pending' && 
                     request.resource.data.status == 'cancelled') || 
                     isAdmin();
      allow delete: if isAdmin();
    }
    
    // Itens de pedido - mesmas regras que os pedidos
    match /orderItems/{itemId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                 (request.auth.uid == resource.data.userId || isAdmin());
      allow update, delete: if isAdmin();
    }
    
    // Configurações - todos podem ler, apenas admin pode escrever
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Carrinho - usuários podem ver/modificar apenas seu próprio carrinho
    match /carts/{cartId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Endereços - usuários podem ver/modificar apenas seus próprios endereços
    match /addresses/{addressId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Logs e analytics - apenas admin pode ler/escrever
    match /logs/{logId} {
      allow read, write: if isAdmin();
    }
    
    match /analytics/{docId} {
      allow read, write: if isAdmin();
    }
    
    // Para todas as outras coleções, bloquear acesso
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

export default firestoreRulesProd;
