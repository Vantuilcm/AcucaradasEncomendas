# Guia para Upload de Imagens no Firebase Storage

## Acessando o Firebase Storage

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto "acucaradas-encomendas"
3. No menu lateral, clique em "Storage"

## Organizando as Pastas

1. Crie as seguintes pastas no Storage:
   - `products/` - Para imagens de produtos
   - `categories/` - Para imagens de categorias
   - `users/` - Para imagens de perfil (se necessário)

## Fazendo Upload das Imagens

### Para Produtos

1. Entre na pasta `products/`
2. Clique em "Upload arquivo"
3. Selecione a imagem do produto
4. Recomendações para imagens de produtos:
   - Use formato JPG ou PNG
   - Resolução mínima: 800x800 pixels
   - Tamanho máximo: 5MB
   - Nome do arquivo: use o nome do produto em minúsculas, sem acentos, separado por hífens
     Exemplo: `bolo-chocolate-belga.jpg`

### Para Categorias

1. Entre na pasta `categories/`
2. Clique em "Upload arquivo"
3. Selecione a imagem da categoria
4. Recomendações para imagens de categorias:
   - Use formato JPG ou PNG
   - Resolução ideal: 600x400 pixels
   - Tamanho máximo: 2MB
   - Nome do arquivo: use o nome da categoria em minúsculas, sem acentos
     Exemplo: `bolos.jpg`

## Obtendo a URL da Imagem

1. Após o upload, clique na imagem
2. Na barra lateral direita, procure por "URL de download"
3. Clique no botão de copiar ao lado da URL
4. Use esta URL no campo `imageUrl` do documento correspondente no Firestore

## Boas Práticas

1. Sempre otimize as imagens antes do upload para melhor performance
2. Mantenha um padrão consistente de nomeação de arquivos
3. Organize as imagens nas pastas corretas
4. Faça backup das imagens originais em seu computador
5. Verifique se a URL está funcionando antes de salvar no Firestore

## Dicas de Segurança

1. Configure as regras de segurança do Storage para controlar o acesso
2. Não compartilhe as URLs das imagens publicamente
3. Monitore o uso do Storage para controle de custos
4. Implemente validação de tipo de arquivo no frontend

## Solução de Problemas

1. Se a imagem não aparecer, verifique:
   - Se a URL foi copiada corretamente
   - Se as regras de segurança permitem acesso
   - Se o arquivo existe no Storage
2. Para imagens muito grandes:
   - Redimensione antes do upload
   - Comprima sem perder qualidade
   - Considere usar um formato mais eficiente

## Próximos Passos

Após fazer o upload das imagens e copiar as URLs:

1. Volte ao Firestore Database
2. Crie ou edite os documentos necessários
3. Cole as URLs nos campos `imageUrl` correspondentes
4. Teste se as imagens estão aparecendo corretamente no app
