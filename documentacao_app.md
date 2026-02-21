# Documentação do Aplicativo Açucaradas Encomendas

## 1. Visão Geral

O Açucaradas Encomendas é um aplicativo móvel desenvolvido para gerenciar encomendas de produtos de confeitaria, permitindo aos clientes realizar pedidos, acompanhar entregas e efetuar pagamentos, enquanto oferece aos administradores ferramentas para gerenciar produtos, pedidos e clientes.

## 2. Arquitetura do Projeto

### 2.1 Tecnologias Principais

- **Framework**: React Native com Expo
- **Linguagem**: JavaScript/JSX
- **Estilização**: StyleSheet (React Native)
- **Gerenciamento de Estado**: Context API / Redux
- **Navegação**: React Navigation
- **Testes**: Jest

### 2.2 Estrutura de Diretórios

```
Açucaradas Encomendas/
├── meuapp/                  # Diretório principal do aplicativo
│   ├── assets/              # Recursos estáticos (imagens, fontes)
│   ├── components/          # Componentes reutilizáveis
│   ├── screens/             # Telas do aplicativo
│   ├── navigation/          # Configuração de navegação
│   ├── services/            # Serviços e APIs
│   ├── store/               # Gerenciamento de estado (Redux/Context)
│   ├── utils/               # Funções utilitárias
│   ├── App.js               # Ponto de entrada do aplicativo
│   └── babel.config.js      # Configuração do Babel
├── babel.config.js          # Configuração do Babel (raiz)
├── jest.config.js           # Configuração de testes
└── package.json             # Dependências e scripts
```

## 3. Componentes Principais

### 3.1 Componentes de UI

- **Header**: Barra superior com logo e navegação
- **ProductCard**: Card para exibição de produtos
- **OrderItem**: Item individual de pedido
- **Button**: Botão personalizado com estilos da marca
- **Input**: Campo de entrada personalizado
- **LoadingIndicator**: Indicador de carregamento
- **ErrorMessage**: Componente para exibição de erros
- **StatusBadge**: Badge para indicar status de pedidos

### 3.2 Telas (Screens)

#### Área do Cliente

- **Login/Registro**: Autenticação de usuários
- **Home**: Tela inicial com destaques e categorias
- **Catálogo**: Listagem de produtos por categoria
- **DetalhesProduto**: Visualização detalhada de produto
- **Carrinho**: Gerenciamento de itens no carrinho
- **Checkout**: Finalização de compra
- **MeusPedidos**: Histórico e acompanhamento de pedidos
- **Perfil**: Gerenciamento de dados do usuário

#### Área Administrativa

- **Dashboard**: Visão geral de vendas e pedidos
- **GerenciamentoProdutos**: CRUD de produtos
- **GerenciamentoPedidos**: Visualização e atualização de pedidos
- **Relatórios**: Estatísticas e relatórios de vendas

## 4. Sistema de Navegação

O aplicativo utiliza React Navigation com uma estrutura de navegação mista:

- **Stack Navigator**: Para fluxos lineares como autenticação e checkout
- **Tab Navigator**: Para navegação principal entre seções do app
- **Drawer Navigator**: Para acesso a funcionalidades secundárias e configurações

## 5. Gerenciamento de Estado

- **Context API**: Para estados globais simples como autenticação e tema
- **Redux**: Para estados complexos como carrinho de compras e pedidos
- **AsyncStorage**: Para persistência local de dados do usuário

## 6. Serviços Implementados

### 6.1 Autenticação

- Login/registro de usuários
- Autenticação por e-mail/senha
- Recuperação de senha
- Perfis de usuário (cliente, administrador)

### 6.2 Pagamento

- Integração com gateway de pagamento (Stripe/PayPal)
- Processamento de cartões de crédito
- Geração de boletos
- Histórico de transações

### 6.3 Notificações

- Push notifications para atualizações de pedidos
- Alertas de promoções e novidades
- Lembretes de carrinho abandonado

### 6.4 Rastreamento de Entregas

- Acompanhamento em tempo real
- Histórico de status de entrega
- Integração com serviços de entrega

## 7. Modelo de Dados

### 7.1 Entidades Principais

- **Usuário**:

  - ID, nome, email, senha, endereço, telefone, perfil

- **Produto**:

  - ID, nome, descrição, preço, categoria, imagens, disponibilidade

- **Pedido**:

  - ID, usuário_id, itens, valor_total, status, data_criação, data_entrega

- **ItemPedido**:

  - ID, pedido_id, produto_id, quantidade, preço_unitário

- **Categoria**:

  - ID, nome, descrição, imagem

- **Pagamento**:
  - ID, pedido_id, método, status, valor, data

## 8. Integrações Externas

### 8.1 Firebase

- **Authentication**: Gerenciamento de usuários
- **Firestore**: Banco de dados em tempo real
- **Storage**: Armazenamento de imagens e arquivos
- **Cloud Functions**: Processamento em segundo plano

### 8.2 Stripe

- Processamento de pagamentos
- Gestão de assinaturas (para clientes recorrentes)

### 8.3 OneSignal

- Gerenciamento de notificações push

## 9. Segurança

- Autenticação segura com tokens JWT
- Criptografia de dados sensíveis
- Validação de entradas do usuário
- Controle de acesso baseado em perfis

## 10. Performance e Otimizações

- Lazy loading de componentes
- Memoização para componentes pesados
- Otimização de imagens
- Estratégias de cache para dados frequentes

## 11. Testes

- **Testes Unitários**: Componentes e funções isoladas
- **Testes de Integração**: Fluxos completos
- **Testes E2E**: Simulação de uso real do aplicativo

## 12. Processo de Build e Deploy

- Configuração do Expo para builds
- Geração de APK/IPA para distribuição
- Publicação nas lojas (Google Play e App Store)
- Atualizações OTA (Over-the-Air) via Expo

## 13. Requisitos de Sistema

### 13.1 Requisitos para Desenvolvimento

- Node.js 14+
- Expo CLI
- Android Studio / Xcode
- Emuladores ou dispositivos físicos

### 13.2 Requisitos para Usuários

- Android 7.0+ ou iOS 12+
- Conexão à internet
- Permissões: câmera, localização, notificações

## 14. Roadmap e Futuras Implementações

- Integração com sistemas de fidelidade
- Funcionalidades de chat ao vivo
- Personalização de produtos
- Análise avançada de dados de vendas
- Expansão para marketplace de confeiteiros

---

Este documento serve como referência para entender a estrutura completa do aplicativo Açucaradas Encomendas, facilitando o desenvolvimento, manutenção e evolução do sistema.
