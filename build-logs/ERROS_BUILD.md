rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ================================
    // Funções auxiliares
    // ================================
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isProducer() {
      return isAuthenticated() && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'producer' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'produtor'
      );
    }

    // Produtor dono da loja associada ao pedido (via campo producerId)
    function isOrderProducer() {
      return isProducer()
        && resource.data.producerId != null
        && get(/databases/$(database)/documents/producers/$(resource.data.producerId)).data.userId == request.auth.uid;
    }

    function isStoreOwner(storeId) {
      return isAuthenticated() && (
        get(/databases/$(database)/documents/producers/$(storeId)).data.userId == request.auth.uid ||
        request.resource.data.userId == request.auth.uid ||
        (resource.data.userId == request.auth.uid)
      );
    }

    // ================================
    // Lojas cadastradas usadas na tela "Lojas próximas"
    // ================================
    match /stores/{storeId} {
      // Qualquer usuário (até não autenticado) pode ler as lojas para conseguir listar no app
      allow read: if true;

      // Apenas admin ou dono da loja podem criar/editar/excluir lojas
      allow write: if isAdmin() || isStoreOwner(storeId);
    }

    // ================================
    // Cadastros de Produtor (sua loja)
    // ================================
    match /producers/{producerId} {
      // Ler:
      // - o dono do cadastro (userId gravado no documento)
      // - ou um admin
      allow read: if isAdmin() || isOwner(resource.data.userId);

      // Criar:
      // - usuário autenticado
      // - que está criando um documento com userId igual ao próprio uid
      allow create: if isAuthenticated()
                    && request.resource.data.userId == request.auth.uid;

      // Atualizar:
      // - dono do cadastro ou admin
      allow update: if isAdmin() || isOwner(resource.data.userId);

      // Deletar:
      // - só admin
      allow delete: if isAdmin();
    }

    // ================================
    // Usuários
    // ================================
    match /users/{userId} {
      // Usuários podem ler seus próprios dados e admins podem ler todos
      allow read: if isOwner(userId) || isAdmin();
      // Usuários autenticados podem criar seu próprio documento de perfil
      allow create: if isOwner(userId);
      // Usuários podem atualizar seus próprios dados e admins podem atualizar todos
      allow update: if isOwner(userId) || isAdmin();
      // Apenas admins podem excluir usuários
      allow delete: if isAdmin();
    }
    
    // ================================
    // Categorias de produtos
    // ================================
    match /categories/{categoryId} {
      // Todos podem ler categorias
      allow read: if true;
      // Apenas admin pode criar/editar/excluir categorias
      allow write: if isAdmin();
    }
    
    // ================================
    // Produtos
    // ================================
    match /products/{productId} {
      // Todos podem ler produtos
      allow read: if true;
      // Admins e produtores podem criar, atualizar ou excluir produtos
      allow write: if isAdmin() || isProducer();
    }
    
    // ================================
    // Pedidos
    // ================================
    match /orders/{orderId} {
      // Usuários podem ler seus próprios pedidos,
      // admins podem ler todos
      // e produtores podem ler todos os pedidos (para painéis e relatórios)
      allow read: if
        isOwner(resource.data.userId) ||
        isAdmin() ||
        isProducer();

      // Usuários autenticados podem criar pedidos para si mesmos
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid;

      // Apenas admins podem atualizar/excluir pedidos
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Itens de pedido - seguem regra próxima aos pedidos
    match /orderItems/{itemId} {
      allow create: if isAuthenticated();
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow update, delete: if isAdmin();
    }
    
    // ================================
    // Configurações gerais
    // ================================
    match /settings/{settingId} {
      // Todos podem ler configurações
      allow read: if true;
      // Apenas admins podem modificar configurações
      allow write: if isAdmin();
    }

    // ================================
    // Carrinho
    // ================================
    match /carts/{cartId} {
      // Usuário só vê/modifica o próprio carrinho
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    // ================================
    // Endereços
    // ================================
    match /addresses/{addressId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId);
    }

    // ================================
    // Cartões de pagamento
    // ================================
    match /payment_cards/{cardId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId);
    }

    // ================================
    // Chaves PIX
    // ================================
    match /pix_keys/{pixKeyId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId);
    }

    // ================================
    // Métodos de pagamento unificados
    // ================================
    match /payment_methods/{methodId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId);
    }

    // ================================
    // Transações de pagamento
    // ================================
    match /payment_transactions/{transactionId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }

    // ================================
    // Reembolsos de pagamento
    // ================================
    match /payment_refunds/{refundId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }

    // ================================
    // Configurações de pagamento por usuário (ID = userId)
    // ================================
    match /payment_settings/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ================================
    // Autenticação de dois fatores
    // ================================
    match /usersAuth/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ================================
    // Registros de pagamentos gerais
    // ================================
    match /payments/{paymentId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId) || isAdmin();
    }

    // ================================
    // Configurações de notificação / privacidade
    // ================================
    match /notification_settings/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /privacy_settings/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ================================
    // Tokens e notificações
    // ================================
    match /push_tokens/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /notificationTokens/{tokenId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId) || isAdmin();
    }

    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId) || isAdmin();
    }

    match /notification_preferences/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /notification_logs/{logId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId) || isAdmin();
    }

    // ================================
    // Entregadores e ganhos
    // ================================
    match /delivery_drivers/{driverId} {
      allow read: if isAdmin() || isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin() || isOwner(resource.data.userId);
      allow delete: if isAdmin();
    }

    match /driver_earnings/{earningId} {
      allow read: if isAdmin() || (isAuthenticated() && request.auth.uid == resource.data.driverId);
      allow create: if isAdmin();
      allow update, delete: if isAdmin();
    }

    match /driver_routes/{routeId} {
      allow read: if isAdmin() || (isAuthenticated() && request.auth.uid == resource.data.driverId);
      allow create: if isAdmin() || (isAuthenticated() && request.auth.uid == request.resource.data.driverId);
      allow update: if isAdmin() || (isAuthenticated() && request.auth.uid == resource.data.driverId);
      allow delete: if isAdmin();
    }

    match /withdrawals/{withdrawalId} {
      allow read: if isAdmin() || (isAuthenticated() && request.auth.uid == resource.data.driverId);
      allow create: if isAuthenticated() && request.resource.data.driverId == request.auth.uid;
      allow update, delete: if isAdmin();
    }

    match /verification_codes/{driverId} {
      allow read, write: if isOwner(driverId) || isAdmin();
    }

    match /deliveryDrivers/{driverId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // ================================
    // Analytics e logs
    // ================================
    match /analytics/{docId} {
      allow read, write: if isAdmin();
    }

    match /logs/{logId} {
      allow read, write: if isAdmin();
    }

    // ================================
    // Regra padrão - negar todos os acessos
    // ================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
