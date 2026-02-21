# Configuração do Ultimate FAQ - Passo a Passo

Este documento fornece instruções detalhadas para configurar o plugin Ultimate FAQ no WordPress para o site Açucaradas Encomendas, com foco na implementação do sistema de FAQ categorizado para a página "Para Entregadores".

## Índice

1. [Instalação do Plugin](#1-instalação-do-plugin)
2. [Configuração Básica](#2-configuração-básica)
3. [Criação de Categorias](#3-criação-de-categorias)
4. [Adição de Perguntas e Respostas](#4-adição-de-perguntas-e-respostas)
5. [Inserção na Página](#5-inserção-na-página)
6. [Personalização Visual](#6-personalização-visual)
7. [Manutenção e Atualização](#7-manutenção-e-atualização)

## 1. Instalação do Plugin

1. Acesse o painel administrativo do WordPress
2. Navegue até **Plugins > Adicionar novo**
3. Na caixa de pesquisa, digite "Ultimate FAQ"
4. Localize o plugin "Ultimate FAQ" nos resultados
5. Clique no botão "Instalar Agora"
6. Após a instalação, clique em "Ativar"

## 2. Configuração Básica

Após a instalação, é necessário configurar as opções básicas do plugin:

1. No painel administrativo do WordPress, navegue até o menu **FAQ** no painel lateral
2. Clique em **Configurações**
3. Configure as seguintes opções em cada aba:

### 2.1. Aba Geral

- **Exibir categorias como abas**: Selecione "Sim"
- **Estilo de exibição**: Selecione "Acordeão"
- **Permitir que apenas uma FAQ esteja aberta de cada vez**: Ative esta opção
- **Mostrar botão de voltar ao topo**: Selecione "Sim"
- **Incluir CSS**: Mantenha ativado para usar os estilos padrão do plugin
- **Incluir JavaScript**: Mantenha ativado para funcionalidade de acordeão

### 2.2. Aba Estilo

- **Cor de fundo do título**: #f9f9f9
- **Cor do texto do título**: #333333
- **Cor de fundo do conteúdo**: #ffffff
- **Cor do texto do conteúdo**: #666666
- **Cor de destaque**: #9D4EDD (roxo da identidade visual)
- **Estilo dos botões de categoria**: Formato arredondado
- **Estilo de toggle**: Selecione "Seta para baixo" (ou "Plus/Minus Icons")
- **Animação de abertura/fechamento**: Ative para melhor experiência do usuário

### 2.3. Aba Ordenação

- **Ordem padrão das perguntas**: Selecione "Ordem personalizada"
- **Ordem das categorias**: Selecione "Ordem personalizada"

### 2.4. Aba Campos

- Ative campos adicionais apenas se necessário para o projeto

### 2.5. Aba SEO

- **Adicionar marcação de esquema FAQ**: Ative esta opção para melhorar o SEO

> **Importante**: Clique em "Salvar alterações" em cada aba após realizar as configurações.

## 3. Criação de Categorias

1. No painel administrativo do WordPress, navegue até **FAQ > Categorias**
2. Adicione as seguintes categorias:
   - **Nome**: Cadastro | **Slug**: cadastro
   - **Nome**: Pagamento | **Slug**: pagamento
   - **Nome**: Aplicativo | **Slug**: aplicativo
   - **Nome**: Entregas | **Slug**: entregas
3. Para cada categoria:
   - Digite o nome da categoria no campo "Nome"
   - O slug será gerado automaticamente, mas pode ser editado se necessário
   - Deixe o campo "Categoria pai" em branco
   - Clique em "Adicionar nova categoria"

## 4. Adição de Perguntas e Respostas

### 4.1. Adicionando Perguntas

1. No painel administrativo do WordPress, navegue até **FAQ > Adicionar Nova**
2. Para cada pergunta:
   - Digite a pergunta no campo de título
   - Digite a resposta no editor de conteúdo
   - No painel lateral direito, selecione a categoria apropriada
   - Clique em "Publicar"

### 4.2. Exemplo de Perguntas por Categoria

#### Categoria: Cadastro

- **Pergunta**: "Quais documentos preciso para me cadastrar como entregador?"
- **Resposta**:
  ```
  <p>Para se cadastrar como entregador parceiro, você precisará dos seguintes documentos:</p>
  <ul>
  <li>Documento de identidade com foto (RG ou CNH)</li>
  <li>CPF</li>
  <li>Comprovante de residência recente (últimos 3 meses)</li>
  <li>Foto do veículo que será utilizado nas entregas</li>
  <li>Se for utilizar moto ou carro: CNH válida na categoria correspondente</li>
  <li>Dados bancários para recebimento (banco, agência e conta)</li>
  </ul>
  ```

#### Categoria: Pagamento

- **Pergunta**: "Como funciona o pagamento para entregadores?"
- **Resposta**:
  ```
  <p>O pagamento para entregadores parceiros funciona da seguinte forma:</p>
  <ul>
  <li>Pagamentos semanais, toda sexta-feira</li>
  <li>Valor base por entrega + valor por km percorrido</li>
  <li>Bônus por entregas em horários de pico</li>
  <li>Depósito direto na conta bancária cadastrada</li>
  <li>Extrato detalhado disponível no aplicativo</li>
  </ul>
  ```

> **Dica**: Adicione todas as perguntas e respostas do FAQ original, atribuindo a categoria correta para cada uma.

## 5. Inserção na Página

### 5.1. Usando Elementor

1. Acesse o painel administrativo do WordPress
2. Navegue até **Páginas** e edite a página "Para Entregadores"
3. Clique em "Editar com Elementor"
4. Na seção onde deseja inserir o FAQ:
   - Adicione um widget "Título" com o texto "Perguntas Frequentes"
   - Adicione um widget "Shortcode"
   - No campo de shortcode, insira: `[ultimate-faqs]`
5. Clique em "Atualizar" para salvar as alterações

### 5.2. Shortcodes Específicos

Você pode personalizar o shortcode para exibir apenas categorias específicas:

- Para mostrar todas as FAQs: `[ultimate-faqs]`
- Para mostrar apenas uma categoria: `[ultimate-faqs category="cadastro"]`
- Para mostrar múltiplas categorias: `[ultimate-faqs category="cadastro,pagamento"]`

## 6. Personalização Visual

Se desejar personalizar ainda mais o estilo do FAQ além das opções disponíveis nas configurações, você pode adicionar CSS personalizado:

1. No Elementor, adicione um widget "HTML" após o shortcode do FAQ
2. Insira o seguinte código CSS:

```html
<style>
  /* Estilo para as abas de categoria */
  .ufaq-faq-category-title-toggle {
    background-color: #f0f0f0 !important;
    border: none !important;
    padding: 10px 20px !important;
    border-radius: 30px !important;
    cursor: pointer;
    transition: all 0.3s ease;
    margin: 5px !important;
    display: inline-block;
  }

  .ufaq-faq-category-title-toggle.active {
    background-color: #9d4edd !important;
    color: white !important;
  }

  /* Estilo para os itens de FAQ */
  .ufaq-faq-div {
    border: none !important;
    margin-bottom: 10px !important;
  }

  .ufaq-faq-title-div {
    background-color: #f9f9f9 !important;
    padding: 15px 20px !important;
    border-radius: 5px !important;
    position: relative;
    font-weight: 500 !important;
  }

  .ufaq-faq-title-div .ewd-ufaq-post-margin {
    margin: 0 !important;
  }

  .ufaq-faq-body {
    padding: 20px !important;
    background-color: white !important;
    border-radius: 0 0 5px 5px !important;
    margin-bottom: 5px !important;
    border-top: none !important;
  }

  /* Ajuste para o ícone de toggle */
  .ewd-ufaq-toggle-symbol {
    position: absolute !important;
    right: 20px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    transition: transform 0.3s ease !important;
  }

  .ewd-ufaq-toggle-symbol-on {
    transform: translateY(-50%) rotate(180deg) !important;
  }
</style>
```

## 7. Manutenção e Atualização

### 7.1. Adição de Novas Perguntas

1. Acesse **FAQ > Adicionar Nova**
2. Adicione a pergunta e resposta
3. Selecione a categoria apropriada
4. Clique em "Publicar"

### 7.2. Edição de Perguntas Existentes

1. Acesse **FAQ > Todas as FAQs**
2. Localize a pergunta que deseja editar
3. Clique em "Editar"
4. Faça as alterações necessárias
5. Clique em "Atualizar"

### 7.3. Reordenação das Perguntas

1. Acesse **FAQ > Ordenar FAQs**
2. Arraste e solte as perguntas na ordem desejada
3. Clique em "Salvar Ordem"

---

## Dicas Adicionais

- **Teste em dispositivos móveis**: Verifique se o FAQ está responsivo e funciona bem em smartphones e tablets
- **Mantenha as respostas concisas**: Respostas muito longas podem dificultar a leitura
- **Use formatação**: Utilize listas, negrito e parágrafos para melhorar a legibilidade
- **Atualize regularmente**: Adicione novas perguntas conforme surgirem dúvidas frequentes dos usuários
- **Monitore o desempenho**: Se o plugin oferecer estatísticas, use-as para identificar as perguntas mais acessadas

---

Este guia fornece todas as instruções necessárias para configurar o plugin Ultimate FAQ no WordPress para o site Açucaradas Encomendas, mantendo a funcionalidade e aparência do sistema de FAQ original.
