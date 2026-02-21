# Passo a Passo para Implementação do Site Açucaradas Encomendas na HostGator

Este documento fornece um guia detalhado para implementar o site da Açucaradas Encomendas na hospedagem HostGator, seguindo as instruções do documento INSTRUCOES_WEBSITE.md.

## 1. Configuração da Hospedagem na HostGator

### 1.1 Contratação do Plano

1. Acesse o site da [HostGator](https://www.hostgator.com.br/)
2. Escolha um plano de hospedagem adequado (recomendado: plano básico de hospedagem compartilhada)
3. Registre o domínio `acucaradas.com.br` ou utilize um domínio existente
4. Finalize a compra e aguarde a confirmação por e-mail

### 1.2 Acesso ao Painel de Controle

1. Após receber as credenciais por e-mail, acesse o painel de controle da HostGator (cPanel)
2. Faça login com as credenciais fornecidas
3. Familiarize-se com o painel de controle e suas funcionalidades

### 1.3 Configuração de DNS (se necessário)

1. No cPanel, acesse a seção "Domínios" ou "Zona DNS"
2. Verifique se os registros DNS estão configurados corretamente para apontar para sua hospedagem
3. Aguarde a propagação dos DNS (pode levar até 24 horas)

## 2. Preparação dos Arquivos do Site

### 2.1 Criação da Estrutura de Pastas

1. Crie uma pasta local em seu computador chamada `acucaradas-site`
2. Dentro desta pasta, crie os seguintes arquivos HTML:
   - `index.html` (Página Inicial)
   - `sobre.html` (Sobre Nós)
   - `aplicativo.html` (Aplicativo)
   - `privacidade.html` (Política de Privacidade)
   - `termos.html` (Termos de Uso)
   - `contato.html` (Contato)
3. Crie uma pasta `images` para armazenar as imagens do site

### 2.2 Preparação das Imagens

1. Prepare as seguintes imagens:
   - Logo da Açucaradas Encomendas (salve como `logo.png`)
   - Botões de download (salve como `google-play.png` e `app-store.png`)
   - Capturas de tela do aplicativo (salve como `screenshot1.png`, `screenshot2.png`, `screenshot3.png`)
   - Favicon (salve como `favicon.ico`)
2. Coloque todas as imagens na pasta `images`

### 2.3 Conversão dos Documentos Markdown para HTML

1. Abra os arquivos `politica_privacidade.md` e `termos_uso.md`
2. Utilize uma ferramenta online como [MarkdownToHTML.com](https://markdowntohtml.com/) para converter os documentos
3. Copie o conteúdo convertido para os arquivos `privacidade.html` e `termos.html` respectivamente

## 3. Implementação das Páginas HTML

### 3.1 Página Inicial (index.html)

1. Utilize o modelo HTML fornecido nas instruções como base
2. Personalize o conteúdo da página inicial com informações sobre o aplicativo
3. Adicione as meta tags de SEO no cabeçalho
4. Verifique se todos os links estão funcionando corretamente

### 3.2 Página Sobre Nós (sobre.html)

1. Crie a página seguindo o mesmo modelo da página inicial
2. Adicione informações sobre a história da empresa, missão e valores
3. Inclua fotos da equipe (se disponível)
4. Adicione as meta tags de SEO no cabeçalho

### 3.3 Página do Aplicativo (aplicativo.html)

1. Crie a página seguindo o mesmo modelo da página inicial
2. Destaque os recursos e funcionalidades do aplicativo
3. Adicione capturas de tela e/ou vídeos demonstrativos
4. Inclua uma seção de perguntas frequentes
5. Adicione as meta tags de SEO no cabeçalho

### 3.4 Página de Política de Privacidade (privacidade.html)

1. Utilize o modelo HTML básico
2. Insira o conteúdo HTML convertido do arquivo `politica_privacidade.md`
3. Formate o conteúdo para melhor legibilidade
4. Adicione as meta tags de SEO no cabeçalho

### 3.5 Página de Termos de Uso (termos.html)

1. Utilize o modelo HTML básico
2. Insira o conteúdo HTML convertido do arquivo `termos_uso.md`
3. Formate o conteúdo para melhor legibilidade
4. Adicione as meta tags de SEO no cabeçalho

### 3.6 Página de Contato (contato.html)

1. Crie a página seguindo o mesmo modelo da página inicial
2. Adicione um formulário de contato utilizando HTML e CSS
3. Inclua informações de contato (e-mail, telefone, endereço)
4. Adicione as meta tags de SEO no cabeçalho

## 4. Upload dos Arquivos para a Hospedagem

### 4.1 Acesso via FTP

1. No cPanel da HostGator, localize as informações de FTP (servidor, usuário, senha)
2. Utilize um cliente FTP como FileZilla para conectar ao servidor
3. Configure a conexão com as informações de FTP fornecidas
4. Conecte-se ao servidor

### 4.2 Upload dos Arquivos

1. No cliente FTP, navegue até a pasta `public_html` do servidor
2. Faça upload de todos os arquivos e pastas do site
3. Verifique se a estrutura de pastas está correta
4. Certifique-se de que todos os arquivos foram transferidos com sucesso

## 5. Configurações Finais e Testes

### 5.1 Verificação do Site

1. Acesse o site pelo domínio configurado (ex: `acucaradas.com.br`)
2. Verifique se todas as páginas estão carregando corretamente
3. Teste todos os links internos e externos
4. Verifique se as imagens estão sendo exibidas corretamente

### 5.2 Testes de Responsividade

1. Teste o site em diferentes dispositivos (desktop, tablet, smartphone)
2. Verifique se o layout se adapta corretamente a diferentes tamanhos de tela
3. Ajuste o CSS conforme necessário para garantir a responsividade

### 5.3 Validação HTML e SEO

1. Utilize o [W3C Validator](https://validator.w3.org/) para verificar o HTML de todas as páginas
2. Corrija quaisquer erros ou avisos encontrados
3. Verifique se as meta tags de SEO estão presentes em todas as páginas

### 5.4 Configuração de SSL (HTTPS)

1. No cPanel da HostGator, localize a seção "SSL/TLS"
2. Instale um certificado SSL gratuito (Let's Encrypt) ou adquira um certificado pago
3. Configure o site para redirecionar automaticamente para HTTPS
4. Teste o acesso seguro ao site

## 6. Verificação para as Lojas de Aplicativos

1. Teste os links para a Política de Privacidade e Termos de Uso
2. Verifique se as páginas carregam rapidamente
3. Certifique-se de que o site está seguro (HTTPS)
4. Verifique se o site funciona bem em dispositivos móveis

## 7. Manutenção e Atualizações

1. Estabeleça um cronograma para verificar e atualizar o conteúdo do site
2. Mantenha as informações de contato atualizadas
3. Atualize as capturas de tela do aplicativo quando novas versões forem lançadas
4. Considere adicionar recursos adicionais conforme o aplicativo evolui:
   - Blog com novidades e atualizações
   - Área de imprensa
   - Integração com redes sociais
   - Formulários de feedback
   - Depoimentos de clientes

---

Seguindo este passo a passo, você terá um site completo para o Açucaradas Encomendas hospedado na HostGator, atendendo aos requisitos das lojas de aplicativos para hospedar a documentação legal.
