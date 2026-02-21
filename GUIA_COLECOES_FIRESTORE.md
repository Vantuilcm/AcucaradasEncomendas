# Guia Detalhado para Configuração das Coleções no Firestore

## Acessando o Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto "acucaradas-encomendas"
3. No menu lateral, clique em "Firestore Database"

## Passo a Passo para Preenchimento das Coleções

### 1. Coleção: users

Para criar um novo documento de usuário:

1. Clique em "Iniciar coleção"
2. Nome da coleção: `users`
3. Preencha os campos do documento:
   - `uid`: Deixe em branco (será gerado pelo Firebase Auth)
   - `email`: Digite o email do usuário (ex: "maria@email.com")
   - `name`: Digite o nome completo (ex: "Maria Silva")
   - `role`: Digite "user" para cliente ou "admin" para administrador
   - `phoneNumber`: Digite no formato +55DDD9XXXXXXXX (ex: "+5511999999999")
   - `addresses`: Clique em "array" e adicione um objeto com:
     ```
     street: "Rua das Flores"
     number: "123"
     complement: "Apto 45" (opcional)
     neighborhood: "Jardim América"
     city: "São Paulo"
     state: "SP"
     zipCode: "01234-567"
     ```
   - `createdAt`: Clique em "timestamp" e selecione a data atual
   - `lastLogin`: Clique em "timestamp" e selecione a data atual

### 2. Coleção: categories

Para criar uma nova categoria:

1. Clique em "Iniciar coleção"
2. Nome da coleção: `categories`
3. Preencha os campos do documento:
   - `id`: Deixe em branco (será gerado automaticamente)
   - `name`: Digite o nome da categoria (ex: "Bolos")
   - `description`: Descreva a categoria (ex: "Bolos decorados para festas")
   - `imageUrl`:Cole a URL da imagem após fazer upload no Storage
   - `order`: Digite um número para ordenação (ex: 1 para primeira categoria)

### 3. Coleção: products

Para criar um novo produto:

1. Clique em "Iniciar coleção"
2. Nome da coleção: `products`
3. Preencha os campos do documento:
   - `id`: Deixe em branco (será gerado automaticamente)
   - `name`: Digite o nome do produto (ex: "Bolo de Chocolate")
   - `description`: Digite uma descrição detalhada do produto (ex: "Delicioso bolo de chocolate recheado com brigadeiro e cobertura de chocolate belga")
   - `price`: Digite o preço em centavos (ex: 5000 para R$ 50,00)
   - `imageUrl`: Cole a URL da imagem após fazer upload no Storage
   - `category`: Cole o ID de uma categoria existente
   - `available`: Selecione "true" se disponível para venda
   - `featured`: Selecione "true" se for destaque

### 4. Coleção: orders

Para criar um novo pedido:

1. Clique em "Iniciar coleção"
2. Nome da coleção: `orders`
3. Preencha os campos do documento:
   - `id`: Deixe em branco (será gerado automaticamente)
   - `userId`: Cole o ID de um usuário existente
   - `items`: Clique em "array" e adicione objetos com:
     ```
     productId: "ID_DO_PRODUTO"
     quantity: 2
     price: 5000
     ```
   - `total`: Some o valor total em centavos (ex: 10000 para R$ 100,00)
   - `status`: Digite "pending" para novo pedido
   - `paymentMethod`: Digite "credit_card", "pix" ou "money"
   - `paymentStatus`: Digite "pending" para novo pedido
   - `deliveryAddress`: Clique em "map" e adicione:
     ```
     street: "Rua das Flores"
     number: "123"
     complement: "Apto 45"
     neighborhood: "Jardim América"
     city: "São Paulo"
     state: "SP"
     zipCode: "01234-567"
     ```
   - `createdAt`: Clique em "timestamp" e selecione a data atual

### 5. Coleção: settings

Para configurar as definições:

1. Clique em "Iniciar coleção"
2. Nome da coleção: `settings`
3. Preencha os campos do documento:
   - `id`: Digite "app_settings"
   - `deliveryFee`: Digite a taxa em centavos (ex: 1000 para R$ 10,00)
   - `minOrderValue`: Digite o valor mínimo em centavos (ex: 3000 para R$ 30,00)
   - `workingHours`: Clique em "map" e adicione para cada dia:
     ```
     monday: { open: "09:00", close: "18:00" }
     tuesday: { open: "09:00", close: "18:00" }
     wednesday: { open: "09:00", close: "18:00" }
     thursday: { open: "09:00", close: "18:00" }
     friday: { open: "09:00", close: "18:00" }
     saturday: { open: "09:00", close: "13:00" }
     { open: "09:00", close: "13:00" } { open: "closed", close: "closed" }
     ```
   - `contactInfo`: Clique em "map" e adicione:
     ```
     phone: "+5511999999999"
     email: "contato@acucaradas.com"
     whatsapp: "+5511999999999"
     ```

## Dicas Importantes

1. Sempre use centavos para valores monetários (multiplique o valor em reais por 100)
2. Para timestamps, use sempre a opção "timestamp" do Firestore
3. Para IDs automáticos, deixe o campo em branco ao criar o documento
4. Mantenha consistência nos formatos (telefones, endereços, etc.)
5. Faça upload das imagens no Storage antes de criar documentos que precisem de imageUrl
6. Crie as categorias antes dos produtos, pois produtos precisam referenciar categorias
7. Teste os documentos criados verificando se aparecem corretamente no app
