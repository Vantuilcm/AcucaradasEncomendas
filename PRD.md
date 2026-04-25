# Product Requirements Document (PRD)

**Produto:** Açucaradas Encomendas
**Plataformas:** iOS e Android
**Data de Atualização:** 24 de Março de 2026

---

## 1. Visão Geral do Produto
O **Açucaradas Encomendas** é um aplicativo móvel voltado para o comércio de doces e encomendas. O principal objetivo da plataforma é conectar clientes (compradores) a produtores locais (lojas e confeiteiros), além de facilitar a logística de entrega através de um módulo dedicado para entregadores parceiros.

## 2. Perfis de Usuário (Roles)
O sistema possui uma arquitetura de roteamento baseada em papéis (Role-Based Access Control), garantindo que cada usuário veja apenas o que é pertinente à sua função:

*   **Comprador (Cliente Padrão):** 
    *   Busca lojas próximas.
    *   Navega pelo catálogo de produtos.
    *   Adiciona itens ao carrinho e realiza pedidos.
*   **Produtor (Lojista):** 
    *   Possui acesso à "Área do Produtor".
    *   Pode criar, editar e excluir produtos do seu catálogo.
    *   Gerencia os pedidos recebidos de sua loja.
*   **Entregador:** 
    *   Acesso restrito (não visualiza o catálogo de compras).
    *   Visualiza apenas informações de entregas pendentes e rotas.
*   **Administrador (Admin):** 
    *   Acesso total ao aplicativo, incluindo painel administrativo para moderação de usuários e lojas.

## 3. Funcionalidades Principais (Épicos)

### 3.1. Autenticação e Conta
*   **Login Tradicional:** E-mail e Senha.
*   **Login Social:** Integração nativa e web com Google, Apple e Facebook.
*   **Segurança e Conformidade:** Checkbox obrigatório para aceite dos Termos de Uso e Política de Privacidade na tela de login.
*   **Gestão de Perfil:** Configuração de dados pessoais e papéis do usuário.

### 3.2. Descoberta e Catálogo
*   **Localizador de Lojas (Store Locator):** 
    *   Busca de lojas baseada na geolocalização do usuário (cálculo de distância via Haversine).
    *   Filtro inteligente para exibir apenas lojas que estão "Abertas" (`isOpen`) no momento da busca.
*   **Catálogo de Produtos:** 
    *   Listagem visual dos produtos da loja selecionada.
    *   Suporte completo a **Modo Claro** e **Modo Escuro** (Dark Mode), garantindo legibilidade.

### 3.3. Carrinho e Pedidos
*   Adição e remoção dinâmica de itens.
*   Cálculo de totais.
*   Acompanhamento de status do pedido.

### 3.4. Gestão para Produtores
*   **Gerenciamento de Produtos:** Formulários para upload de fotos (com acesso à câmera e galeria), definição de preços e descrições.
*   **Gestão de Pedidos:** Tela para visualizar e atualizar o status das encomendas recebidas.

## 4. Requisitos Técnicos e Stack

*   **Frontend Mobile:** React Native gerenciado pelo Expo.
*   **Navegação:** React Navigation (Stack e Bottom Tabs com roteamento dinâmico no `AppNavigator`).
*   **UI/UX:** React Native Paper (Material Design 3), com sistema de temas (ThemeProvider) customizado para as cores da marca.
*   **Backend / BaaS:** Firebase
    *   *Firestore:* Banco de dados NoSQL para produtos, lojas, usuários e pedidos.
    *   *Authentication:* Gerenciamento de sessões e login social.
    *   *Storage:* Armazenamento de imagens (banners e fotos de produtos).
*   **CI/CD:** Automação de builds configurada via GitHub Actions integrada ao EAS (Expo Application Services).

## 5. Requisitos Não Funcionais
*   **Performance:** Imagens dos produtos devem ser otimizadas antes do upload. O carregamento de lojas próximas deve ser paginado ou limitado por raio de distância.
*   **Acessibilidade:** Textos devem manter contraste adequado em ambos os temas (Claro/Escuro).
*   **Disponibilidade:** O app deve lidar graciosamente com a perda de conexão, exibindo mensagens de erro amigáveis.
