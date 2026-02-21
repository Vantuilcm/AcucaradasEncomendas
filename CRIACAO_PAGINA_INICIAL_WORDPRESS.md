# Criação da Página Inicial no WordPress

Este documento contém instruções detalhadas para criar a página inicial do site Açucaradas Encomendas no WordPress, seguindo o plano de implementação.

## Pré-requisitos

Antes de começar, certifique-se de que:

1. O WordPress está instalado e configurado conforme a seção 3 do documento IMPLEMENTACAO_WORDPRESS_PLUGINS_GRATUITOS.md
2. O tema Astra (versão gratuita) está instalado e ativado
3. Os seguintes plugins estão instalados e ativados:
   - Elementor (versão gratuita)
   - Kadence Blocks
   - Shortcodes Ultimate
   - Yoast SEO

## Passo 1: Criar a Página Inicial

1. Acesse o painel WordPress (www.seudominio.com.br/wp-admin)
2. Vá para **Páginas > Adicionar nova**
3. Dê o título "Início" à página
4. Clique em "Editar com Elementor" para abrir o construtor de páginas

## Passo 2: Configurar a Página como Página Inicial

1. No painel WordPress, vá para **Configurações > Leitura**
2. Selecione "Uma página estática" como página inicial
3. Escolha a página "Início" que acabou de criar
4. Clique em "Salvar alterações"

## Passo 3: Construir a Hero Section

1. No editor Elementor, adicione uma nova seção com estrutura de duas colunas (40% / 60%)
2. Configure o estilo da seção:

   - Altura: Altura da tela (100vh)
   - Fundo: Gradiente (Cor 1: #F8E0FF, Cor 2: #E6E0FF, Tipo: Linear, Ângulo: 135°)
   - Padding: 50px (todos os lados)

3. Na primeira coluna (esquerda):

   - Adicione um widget de **Cabeçalho**
     - Título: "Doces artesanais direto na sua porta"
     - HTML Tag: H2
     - Alinhamento: Esquerda
     - Tipografia: Família Poppins, Tamanho 42px, Peso 700, Cor #333333
   - Adicione um widget de **Texto**
     - Texto: "O aplicativo Açucaradas Encomendas conecta você aos melhores confeiteiros artesanais da sua região. Peça bolos, doces, tortas e sobremesas especiais com apenas alguns toques!"
     - Tipografia: Família Poppins, Tamanho 16px, Peso 400, Cor #666666
   - Adicione um widget de **Caixa Interna**
     - Estilo: Sem borda, Sem fundo
     - Adicione dois widgets de **Botão** dentro da caixa:
       - Botão 1:
         - Texto: "Baixe o App"
         - Link: # (temporário)
         - Cor de fundo: #9D4EDD
         - Cor do texto: #FFFFFF
         - Tamanho: Grande
         - Borda: Raio 30px
       - Botão 2:
         - Texto: "Como Funciona"
         - Link: #como-funciona
         - Cor de fundo: Transparente
         - Cor do texto: #7B2CBF
         - Borda: 2px sólida #7B2CBF, Raio 30px
         - Tamanho: Grande

4. Na segunda coluna (direita):
   - Adicione um widget de **Imagem**
     - Imagem: Faça upload da imagem do aplicativo em um smartphone
     - Tamanho: Largura máxima 80%
     - Alinhamento: Centro
     - Efeito: Adicione uma leve sombra (box-shadow: 0 10px 30px rgba(0,0,0,0.1))

## Passo 4: Criar a Seção de Recursos/Vantagens

1. Adicione uma nova seção abaixo da Hero Section
2. Configure o estilo da seção:

   - Padding: 80px (superior e inferior), 20px (esquerda e direita)
   - Fundo: Cor branca (#FFFFFF)

3. Adicione um widget de **Cabeçalho**

   - Título: "Por que escolher o Açucaradas Encomendas?"
   - HTML Tag: H2
   - Alinhamento: Centro
   - Tipografia: Família Poppins, Tamanho 36px, Peso 600, Cor #333333
   - Margem inferior: 50px

4. Adicione uma estrutura de **Grade** com 4 colunas

5. Em cada coluna, crie um card de recurso:

   - Adicione um widget de **Ícone**
     - Ícone: Escolha um ícone apropriado (bolo, caminhão, celular, coração)
     - Tamanho: 50px
     - Cor: #9D4EDD
     - Alinhamento: Centro
   - Adicione um widget de **Cabeçalho**
     - Título: Nome do recurso (ex: "Produtos Artesanais")
     - HTML Tag: H3
     - Alinhamento: Centro
     - Tipografia: Família Poppins, Tamanho 20px, Peso 600, Cor #333333
   - Adicione um widget de **Texto**
     - Texto: Descrição do recurso
     - Alinhamento: Centro
     - Tipografia: Família Poppins, Tamanho 14px, Peso 400, Cor #666666

6. Estilize cada card:
   - Padding: 30px
   - Fundo: #F9F9F9
   - Borda: Raio 10px
   - Sombra: Leve (box-shadow: 0 5px 15px rgba(0,0,0,0.05))
   - Margem: 15px

## Passo 5: Criar a Seção "Como Funciona"

1. Adicione uma nova seção com ID "como-funciona"
2. Configure o estilo da seção:

   - Padding: 80px (superior e inferior), 20px (esquerda e direita)
   - Fundo: Cor clara (#F5F5F5)

3. Adicione um widget de **Cabeçalho**

   - Título: "Como Funciona"
   - HTML Tag: H2
   - Alinhamento: Centro
   - Tipografia: Família Poppins, Tamanho 36px, Peso 600, Cor #333333
   - Margem inferior: 50px

4. Adicione uma estrutura de **Grade** com 3 colunas

5. Em cada coluna, crie um passo numerado:

   - Adicione um widget de **Número**
     - Número: 1, 2, 3 (respectivamente)
     - Estilo: Círculo com fundo #9D4EDD e texto branco
     - Tamanho: 60px
     - Alinhamento: Centro
   - Adicione um widget de **Cabeçalho**
     - Título: Nome do passo (ex: "Baixe o Aplicativo")
     - HTML Tag: H3
     - Alinhamento: Centro
     - Tipografia: Família Poppins, Tamanho 20px, Peso 600, Cor #333333
   - Adicione um widget de **Texto**
     - Texto: Descrição do passo
     - Alinhamento: Centro
     - Tipografia: Família Poppins, Tamanho 14px, Peso 400, Cor #666666

## Passo 6: Criar a Seção de Depoimentos

1. Adicione uma nova seção
2. Configure o estilo da seção:

   - Padding: 80px (superior e inferior), 20px (esquerda e direita)
   - Fundo: Gradiente (Cor 1: #9D4EDD, Cor 2: #7B2CBF, Tipo: Linear, Ângulo: 135°)

3. Adicione um widget de **Cabeçalho**

   - Título: "O que nossos clientes dizem"
   - HTML Tag: H2
   - Alinhamento: Centro
   - Tipografia: Família Poppins, Tamanho 36px, Peso 600, Cor #FFFFFF
   - Margem inferior: 50px

4. Adicione um widget de **Carrossel** ou **Slider**

   - Configure 3 slides, cada um com um depoimento
   - Para cada slide, crie um card de depoimento:

     - Adicione um widget de **Imagem**
       - Imagem: Foto do cliente (ou placeholder)
       - Estilo: Círculo, tamanho 80px
       - Alinhamento: Centro
     - Adicione um widget de **Texto**
       - Texto: Depoimento do cliente
       - Alinhamento: Centro
       - Tipografia: Família Poppins, Tamanho 16px, Peso 400, Cor #333333
       - Estilo: Adicione aspas decorativas
     - Adicione um widget de **Cabeçalho**
       - Título: Nome do cliente
       - HTML Tag: H4
       - Alinhamento: Centro
       - Tipografia: Família Poppins, Tamanho 18px, Peso 600, Cor #333333
     - Adicione um widget de **Estrelas de Avaliação**
       - Valor: 5 estrelas
       - Cor: #FFD700 (dourado)
       - Alinhamento: Centro

   - Estilize cada card:
     - Padding: 30px
     - Fundo: #FFFFFF
     - Borda: Raio 10px
     - Sombra: Média (box-shadow: 0 10px 20px rgba(0,0,0,0.1))

## Passo 7: Criar a Seção Call-to-Action Final

1. Adicione uma nova seção
2. Configure o estilo da seção:

   - Padding: 80px (superior e inferior), 20px (esquerda e direita)
   - Fundo: Cor branca (#FFFFFF)

3. Adicione um widget de **Caixa**

   - Estilo:
     - Fundo: Gradiente (Cor 1: #F8E0FF, Cor 2: #E6E0FF, Tipo: Linear, Ângulo: 135°)
     - Borda: Raio 20px
     - Padding: 50px
     - Alinhamento: Centro

4. Dentro da caixa:

   - Adicione um widget de **Cabeçalho**
     - Título: "Pronto para experimentar?"
     - HTML Tag: H2
     - Alinhamento: Centro
     - Tipografia: Família Poppins, Tamanho 36px, Peso 600, Cor #333333
   - Adicione um widget de **Texto**
     - Texto: "Baixe agora o aplicativo Açucaradas Encomendas e descubra os melhores doces artesanais da sua região!"
     - Alinhamento: Centro
     - Tipografia: Família Poppins, Tamanho 16px, Peso 400, Cor #666666
     - Margem inferior: 30px
   - Adicione um widget de **Botão**
     - Texto: "Baixe o App"
     - Link: # (temporário)
     - Cor de fundo: #9D4EDD
     - Cor do texto: #FFFFFF
     - Tamanho: Grande
     - Borda: Raio 30px
     - Padding: 15px 40px

## Passo 8: Configurar o Rodapé

1. Vá para **Aparência > Personalizar > Rodapé**
2. Configure o rodapé com as seguintes informações:
   - Logo do Açucaradas Encomendas
   - Links para as páginas principais
   - Ícones de redes sociais
   - Informações de contato
   - Direitos autorais

## Passo 9: Otimização e SEO

1. Instale e configure o plugin Yoast SEO
2. Configure o título SEO e meta descrição da página inicial
3. Otimize as imagens para carregamento rápido
4. Teste a responsividade em diferentes dispositivos

## Passo 10: Publicar a Página

1. Clique em "Atualizar" no editor Elementor
2. Visualize a página para verificar se tudo está correto
3. Faça ajustes finais se necessário

---

Esta página inicial servirá como base para o estilo e estrutura das demais páginas do site. Siga o mesmo processo para criar as outras páginas principais, adaptando o conteúdo conforme necessário.
