// Regras de segurança do Firestore para Açucaradas Encomendas (PRODUÇÃO)
// Estas regras são mais restritivas e devem ser usadas no ambiente de produção

const firestoreRulesProd = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Funções auxiliares de autenticação e papéis
    function isAuthenticated() {
      return request.auth != null;
    }

    function isSelf(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    function isProducer() {
      return isAuthenticated() && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'producer' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'produtor' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isProducer == true
      );
    }

    // Produtor dono da loja associada ao pedido (via campo producerId)
    function isOrderProducer() {
      return isProducer() &&
        resource.data.producerId != null &&
        get(/databases/$(database)/documents/producers/$(resource.data.producerId)).data.userId == request.auth.uid;
    }

    // Dono da loja pública (stores)
    function isStoreOwner(storeId) {
      return isAuthenticated() && (
        get(/databases/$(database)/documents/producers/$(storeId)).data.userId == request.auth.uid ||
        request.resource.data.userId == request.auth.uid ||
        (resource.data.userId == request.auth.uid)
      );
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

    // Lojas cadastradas - todos podem ler para listar lojas próximas
    // Produtor dono da loja pode escrever apenas o próprio documento
    match /stores/{storeId} {
      allow read: if true;
      allow write: if isAdmin() || isStoreOwner(storeId);
    }

    // Produtores (lojas dos vendedores)
    // - O próprio usuário pode criar/atualizar seu cadastro de produtor
    // - Admin pode ler/escrever qualquer produtor
    match /producers/{producerId} {
      // Permitir leitura para usuários autenticados para evitar falhas em get() usado em regras
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin() || (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow delete: if isAdmin();
    }

    // Categorias - todos podem ler, apenas admin pode escrever
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Pedidos - usuários podem ver seus próprios pedidos,
    // admins podem ver todos e produtores podem ver todos os pedidos
    // (para painéis, relatórios e atendimento)
    match /orders/{orderId} {
      // Usuários autenticados podem criar pedidos apenas para si mesmos
      allow create: if isAuthenticated() &&
                    request.resource.data.userId == request.auth.uid;

      // Leitura de pedidos
      allow read: if
        isOwner(resource.data.userId) ||
        isAdmin() ||
        isProducer();

      // Apenas admins podem atualizar/excluir pedidos
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Itens de pedido - mesmas regras que os pedidos
    match /orderItems/{itemId} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.userId || isAdmin());
      allow update, delete: if isAdmin();
    }

    // Configurações gerais - todos podem ler, apenas admin pode escrever
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Configurações de notificação - usuário só pode ler/alterar as próprias
    match /notification_settings/{userId} {
      allow read, write: if isSelf(userId);
    }

    // Configurações de privacidade - usuário só pode ler/alterar as próprias
    match /privacy_settings/{userId} {
      allow read, write: if isSelf(userId);
    }

    // Configurações de pagamento - usuário só pode ler/alterar as próprias
    match /payment_settings/{userId} {
      allow read, write: if isSelf(userId);
    }

    // Carrinho - usuários podem ver/modificar apenas seu próprio carrinho
    match /carts/{cartId} {
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    // Endereços - usuários podem ver/modificar apenas seus próprios endereços
    match /addresses/{addressId} {
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    // Cartões de pagamento - usuários podem ver/modificar apenas seus próprios cartões
    match /payment_cards/{cardId} {
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    // Chaves PIX - usuários podem ver/modificar apenas suas próprias chaves
    match /pix_keys/{pixKeyId} {
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
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

