# Análise de Arquivos HTML na Raiz do Projeto

## Inventário de Arquivos HTML

Foram identificados os seguintes arquivos HTML na raiz do projeto:

| Arquivo | Tamanho (bytes) | Última Modificação | Propósito Provável |
|---------|----------------|-------------------|--------------------|
| dashboard-seguranca.html | 23.687 | 11/09/2025 | Interface de demonstração do painel de segurança |
| demo.html | 91.041 | 07/08/2025 | Página de demonstração do aplicativo |
| index.html | 52.643 | 02/08/2025 | Página inicial do site ou aplicativo web |
| login.html | 0 | 02/09/2025 | Página de login (vazia/em desenvolvimento) |
| perfil.html | 0 | 02/09/2025 | Página de perfil de usuário (vazia/em desenvolvimento) |
| site_content.html | 923.124 | 08/09/2025 | Conteúdo do site (arquivo grande, possivelmente com recursos embutidos) |
| test-web.html | 1.530 | 02/08/2025 | Página de teste para funcionalidades web |
| web-app.html | 26.247 | (data não visível) | Interface web do aplicativo |

## Classificação dos Arquivos

### Arquivos para Desenvolvimento (Podem ser Removidos na Versão de Produção)

1. **demo.html** - Arquivo de demonstração, não necessário em produção
2. **test-web.html** - Arquivo de teste, não necessário em produção
3. **login.html** e **perfil.html** - Arquivos vazios, provavelmente em desenvolvimento ou obsoletos
4. **dashboard-seguranca.html** - Interface de demonstração, provavelmente substituída por componentes nativos no app

### Arquivos que Podem ser Necessários em Produção (Requer Verificação Adicional)

1. **index.html** - Pode ser necessário se o aplicativo usar WebView para carregar conteúdo HTML
2. **site_content.html** - Arquivo grande que pode conter conteúdo importante para o aplicativo
3. **web-app.html** - Pode ser parte da interface web do aplicativo

## Análise de Referências

Não foram encontradas referências diretas a estes arquivos HTML nos arquivos de código (.js, .jsx, .ts, .tsx) ou nos arquivos de configuração (.json, .gradle, .xml, .properties, .plist) do projeto.

Isso sugere que estes arquivos HTML podem ser:

1. Resquícios de desenvolvimento anterior
2. Exemplos ou templates não utilizados ativamente
3. Conteúdo estático carregado dinamicamente (sem referência direta no código)
4. Arquivos de documentação ou demonstração

## Próximos Passos

1. Verificar se há carregamentos dinâmicos de arquivos HTML (por exemplo, através de strings construídas em tempo de execução)
2. Consultar a equipe de desenvolvimento sobre o propósito destes arquivos
3. Implementar estratégia de exclusão para os arquivos identificados como não necessários em produção
4. Considerar mover os arquivos necessários para uma estrutura de diretórios mais organizada (como `/assets/web/`)