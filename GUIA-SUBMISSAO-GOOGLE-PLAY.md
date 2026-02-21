# Guia de Submissão na Google Play Store

## Pré-requisitos

- [x] Conta de desenvolvedor Google Play ativa ($25 taxa única)
- [x] Build AAB (Android App Bundle) gerado via EAS
- [x] Metadados e assets preparados conforme documentação
- [x] Política de privacidade hospedada em URL acessível

## Processo de Submissão Passo a Passo

### 1. Acesse o Google Play Console

- Entre em [play.google.com/console](https://play.google.com/console)
- Faça login com sua conta de desenvolvedor
- Se for seu primeiro app, aceite os termos de serviço

### 2. Crie um novo app

- Clique no botão "Criar app" na página inicial
- Preencha os detalhes básicos:
  - Nome do app: "Açucaradas Encomendas"
  - Idioma padrão: Português (Brasil)
  - Tipo de app: Aplicativo
  - Gratuito ou pago: Gratuito
- Confirme detalhes de declarações:
  - O app contém anúncios? Não
  - O app tem conteúdo direcionado a crianças? Não
- Aceite as diretrizes do desenvolvedor e clique em "Criar app"

### 3. Configure a ficha do app

#### Ficha da loja

- Acesse "Ficha da loja" no menu lateral
- Preencha os seguintes campos:
  - **Descrição curta** (até 80 caracteres)
  - **Descrição completa** (até 4000 caracteres)
  - **Ícone do app** (512x512 px, PNG ou JPEG)
  - **Gráfico de recurso** (1024x500 px, PNG ou JPEG)
  - **Capturas de tela do telefone** (mínimo 2, máximo 8)
    - Formato: PNG ou JPEG
    - Dimensões mínimas: 320 px
    - Dimensões máximas: 3840 px
    - Proporção: 16:9, 9:16, 2:1 ou 1:2
  - **Capturas de tela do tablet** (opcional)
  - **Vídeo promocional** (opcional, link do YouTube)
  - **Tags** (até 5 palavras-chave)

#### Categorização

- Selecione a categoria principal: "Alimentação e bebida"
- Selecione a categoria secundária (opcional): "Compras"
- Defina tags relevantes para melhorar a descoberta do app

### 4. Configure a seção de segurança de dados

- Acesse "Segurança de dados" no menu lateral
- Preencha o formulário de segurança de dados:
  - Declare todos os dados coletados pelo app
  - Especifique como cada tipo de dado é usado
  - Indique se os dados são compartilhados com terceiros
  - Explique as práticas de segurança implementadas
- Adicione link para política de privacidade
- Certifique-se de que todas as permissões solicitadas pelo app estão justificadas

### 5. Configure o conteúdo do app

- Acesse "Classificação de conteúdo" no menu lateral
- Preencha o questionário IARC para obter classificação etária
- Responda todas as perguntas com precisão sobre:
  - Violência
  - Conteúdo sexual
  - Linguagem
  - Substâncias controladas
  - Compras
  - Interação com usuários
- Confirme público-alvo e conteúdo sensível

### 6. Faça upload do AAB

- Acesse "Produção" no menu lateral
- Clique em "Criar nova versão"
- Faça upload do arquivo AAB gerado pelo EAS
  - Comando para gerar: `eas build --platform android --profile production`
- Adicione notas da versão (o que há de novo nesta versão)
- Defina o número da versão e o código da versão
  - Certifique-se de que o código da versão é maior que qualquer versão anterior

### 7. Revise e publique

- Verifique todos os requisitos pendentes na seção "Revisão da versão"
- Certifique-se de que todos os itens estão marcados como concluídos
- Clique em "Iniciar lançamento para produção"
- Selecione o tipo de lançamento:
  - Lançamento completo (para todos os usuários)
  - Lançamento gradual (% de usuários)
  - Teste fechado/aberto (para testers específicos)
- Envie para revisão
- Aguarde aprovação (geralmente 1-3 dias úteis)

## Monitoramento e Pós-lançamento

### Acompanhamento da revisão

- Verifique regularmente o status da revisão no Play Console
- Esteja preparado para responder rapidamente a quaisquer solicitações da equipe de revisão
- Se o app for rejeitado, analise cuidadosamente os motivos e faça as correções necessárias

### Após a aprovação

- Monitore as métricas de desempenho do app
- Acompanhe avaliações e comentários dos usuários
- Prepare atualizações regulares para corrigir bugs e adicionar novos recursos

## Solução de Problemas Comuns

### App rejeitado por política de metadados

- Verifique se a descrição, capturas de tela e gráficos estão em conformidade com as diretrizes
- Remova qualquer menção a outras plataformas (como iOS, App Store)
- Evite usar palavras-chave excessivas ou irrelevantes

### App rejeitado por problemas de funcionalidade

- Certifique-se de que todas as funcionalidades descritas estão funcionando corretamente
- Verifique se o app não trava ou apresenta comportamento inesperado
- Teste em diferentes dispositivos e versões do Android

### App rejeitado por questões de privacidade

- Revise a política de privacidade para garantir que está completa e precisa
- Verifique se todas as permissões solicitadas são necessárias e justificadas
- Certifique-se de que a seção de segurança de dados está preenchida corretamente

---

**Lembre-se**: Mantenha uma cópia de todas as credenciais de acesso em um local seguro e documente todo o processo de submissão para referência futura.