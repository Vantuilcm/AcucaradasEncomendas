# Estrutura de Diretórios - Açucaradas Encomendas

```
/public
  /images        # Imagens estáticas do site
  /fonts         # Fontes utilizadas
  favicon.ico

/src
  /components    # Componentes React reutilizáveis
    /layout      # Componentes de layout (Header, Footer, etc)
    /ui          # Componentes de UI (Button, Input, etc)
    /produtos    # Componentes relacionados a produtos
    /pedidos     # Componentes relacionados a pedidos

  /pages         # Páginas da aplicação
    /admin       # Páginas de administração

  /hooks         # Custom hooks React

  /services      # Serviços de API e outras integrações

  /styles        # Estilos globais

  /utils         # Funções utilitárias

  /contexts      # Contextos React

  /types         # Definições de tipos TypeScript

  App.tsx        # Componente principal
  index.tsx      # Ponto de entrada da aplicação

/package.json    # Dependências e scripts
/tsconfig.json   # Configuração TypeScript
/.env.example    # Exemplo de variáveis de ambiente
/README.md       # Documentação do projeto
```

## Tecnologias

- React (com TypeScript)
- Styled Components ou Tailwind CSS para estilização
- React Router para navegação
- Axios para requisições HTTP
- React Query para gerenciamento de estado da API
- React Hook Form para formulários
- Zod para validação

## Funcionalidades Principais

1. **Catálogo de Produtos**

   - Listagem de produtos disponíveis
   - Detalhes do produto
   - Filtragem por categoria

2. **Carrinho de Compras**

   - Adicionar/remover produtos
   - Ajustar quantidades
   - Cálculo de subtotal

3. **Processo de Pedido**

   - Formulário de informações do cliente
   - Escolha de método de entrega
   - Opções de pagamento

4. **Área Administrativa**
   - Gestão de produtos (CRUD)
   - Gestão de pedidos
   - Dashboard com métricas de vendas
