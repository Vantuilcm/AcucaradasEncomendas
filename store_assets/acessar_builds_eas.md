# Como Acessar e Monitorar Builds no EAS

## Método 1: Acesso via Navegador Web

1. **Acesse o Dashboard do Expo**
   - Abra seu navegador e vá para: https://expo.dev/
   - Faça login com sua conta Expo
   - Clique em "Dashboard" no menu superior

2. **Encontre seu Projeto**
   - Na lista de projetos, localize "Açucaradas Encomendas"
   - Clique no nome do projeto para abrir sua página

3. **Acesse a Seção de Builds**
   - No menu lateral, clique em "Builds"
   - Aqui você verá todos os builds em andamento e concluídos
   - Os builds são ordenados do mais recente para o mais antigo

4. **Verifique o Status do Build**
   - Builds em andamento: mostram indicador de progresso e tempo estimado
   - Builds concluídos: mostram status "Completed" e botão de download
   - Builds com erro: mostram status "Failed" com detalhes do erro

5. **Baixe o AAB**
   - Quando o build for concluído com sucesso, clique no botão "Download"
   - Salve o arquivo AAB em sua pasta `store_assets`

## Método 2: Acesso via Linha de Comando

1. **Verifique o Status do Build**
   ```powershell
   npx eas build:list
   ```

2. **Obtenha Detalhes do Build Específico**
   ```powershell
   npx eas build:view
   ```
   (Você poderá selecionar o build da lista)

3. **Baixe o AAB via Linha de Comando**
   ```powershell
   npx eas build:download
   ```
   (Selecione o build concluído da lista)

## Método 3: Acesso Direto via URL

Se você tiver o ID do seu projeto e da sua conta, pode acessar diretamente:

```
https://expo.dev/accounts/[SEU-NOME-DE-USUARIO]/projects/[NOME-DO-PROJETO]/builds
```

Substitua:
- `[SEU-NOME-DE-USUARIO]` pelo seu nome de usuário do Expo
- `[NOME-DO-PROJETO]` pelo nome do projeto no Expo (geralmente "acucaradas-encomendas")

## Solução de Problemas

Se você não conseguir encontrar seus builds:

1. **Verifique se está logado na conta correta**
   - O Expo permite múltiplas contas e organizações
   - Certifique-se de estar na conta usada para iniciar o build

2. **Verifique o nome do projeto**
   - O nome do projeto no Expo pode ser diferente do nome da pasta local
   - Verifique o nome no arquivo `app.json` na propriedade `expo.name`

3. **Verifique se o build foi realmente iniciado**
   - Execute `npx eas build:list` para ver todos os builds
   - Se não houver builds, o processo pode não ter sido iniciado corretamente