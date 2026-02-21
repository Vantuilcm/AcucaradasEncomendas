# Instruções para Correção de Problemas de Navegação

## Visão Geral

Este documento contém instruções para corrigir problemas relacionados à navegação no aplicativo Acucaradas Encomendas, especificamente com as dependências do React Navigation e suas configurações.

## Problemas Identificados

1. **Incompatibilidade de Versões**: Versões incompatíveis entre `@react-navigation/native`, `@react-navigation/stack` e outras dependências relacionadas. Atualmente, o projeto está usando React Navigation v7, que pode estar causando conflitos.
2. **Problemas de Permissão**: Dificuldades na instalação de pacotes devido a problemas de permissão no Windows.
3. **Configuração do Metro Bundler**: Erros no Metro Bundler ao iniciar o aplicativo, especialmente relacionados ao modo de observação (watch mode).

## Scripts de Correção

Foram criados três scripts para ajudar na correção desses problemas:

### 1. `fix-permissions.js`

Este script corrige problemas de permissão que podem estar impedindo a instalação correta das dependências.

**Como usar:**

```bash
node fix-permissions.js
```

**O que ele faz:**

- Corrige permissões do cache do npm e pnpm
- Verifica e corrige permissões do diretório `node_modules`
- Limpa caches do Metro Bundler e Watchman
- Instala as dependências específicas de navegação

### 2. `fix-navigation-deps.js`

Este script garante que todas as dependências de navegação estejam instaladas com versões compatíveis.

**Como usar:**

```bash
node fix-navigation-deps.js
```

**O que ele faz:**

- Atualiza o `package.json` com versões compatíveis das dependências de navegação
- Limpa caches
- Reinstala dependências
- Verifica a instalação das dependências de navegação

### 3. `test-navigation.js`

Este script testa a navegação do aplicativo para verificar se tudo está configurado corretamente.

**Como usar:**

```bash
node test-navigation.js
```

**O que ele faz:**

- Verifica a estrutura de navegação no arquivo `AppNavigator.tsx`
- Verifica as telas disponíveis no diretório `src/screens`
- Verifica se todas as dependências necessárias estão presentes no `package.json`

## Procedimento de Correção

Siga estas etapas na ordem indicada para corrigir os problemas de navegação:

1. **Parar qualquer servidor Metro em execução**:
   Certifique-se de que não há nenhum servidor Metro ou processo Expo em execução antes de prosseguir.

2. **Corrigir problemas de permissão**:
   ```bash
   node fix-permissions.js
   ```
   Este script irá corrigir problemas de permissão que podem estar impedindo a instalação correta das dependências. Se ocorrerem erros relacionados a permissões, tente executar o PowerShell como administrador.

3. **Corrigir dependências de navegação**:
   ```bash
   node fix-navigation-deps.js
   ```
   Este script irá atualizar o package.json com versões compatíveis e reinstalar as dependências. O processo pode levar alguns minutos.

4. **Testar a navegação**:
   ```bash
   node test-navigation.js
   ```
   Este script verificará se todas as configurações de navegação estão corretas. Se algum problema for encontrado, siga as instruções exibidas no console.

5. **Limpar caches do Metro**:
   ```bash
   npx react-native-clean-project --keep-node-modules
   ```
   ou
   ```bash
   npx expo start --clear
   ```

6. **Iniciar o aplicativo**:
   ```bash
   npx expo start --web
   ```
   Inicie primeiro com a opção --web para verificar se a navegação está funcionando corretamente no ambiente web, que é mais rápido para testes.

## Verificação de Compatibilidade

As versões compatíveis das dependências de navegação são:

- `@react-navigation/native`: 6.1.9
- `@react-navigation/stack`: 6.3.20
- `@react-navigation/bottom-tabs`: 6.5.11
- `react-native-screens`: 3.22.0
- `react-native-safe-area-context`: 4.6.3
- `react-native-gesture-handler`: 2.12.0

## Recomendações para Prevenir Problemas Futuros

1. **Fixar Versões de Dependências**:
   - Use versões exatas no package.json (sem ^ ou ~) para evitar atualizações automáticas que possam quebrar a compatibilidade.
   - Exemplo: `"@react-navigation/native": "6.1.9"` em vez de `"@react-navigation/native": "^6.1.9"`.

2. **Configuração do Metro Bundler**:
   - Mantenha um arquivo `metro.config.js` atualizado com as configurações corretas para o seu projeto.
   - Considere adicionar exclusões para arquivos problemáticos que possam causar erros no Metro.

3. **Gerenciamento de Dependências**:
   - Utilize sempre o mesmo gerenciador de pacotes (npm, yarn ou pnpm) para evitar conflitos.
   - Documente no README qual gerenciador de pacotes deve ser usado.

4. **Testes de Navegação**:
   - Implemente testes automatizados para a navegação para detectar problemas rapidamente.
   - Teste a navegação em diferentes plataformas (iOS, Android, web) regularmente.

5. **Atualizações Controladas**:
   - Ao atualizar o React Navigation ou o Expo, faça-o em um branch separado e teste completamente antes de mesclar.
   - Mantenha-se atualizado com as notas de lançamento do React Navigation e Expo para antecipar problemas de compatibilidade.

## Solução de Problemas Adicionais

Se você continuar enfrentando problemas após executar os scripts acima, tente as seguintes soluções:

1. **Erro "Failed to start watch mode"**:
   - Reinicie o computador para liberar processos do Watchman ou Metro que possam estar travados
   - Execute `watchman watch-del-all` para limpar o cache do Watchman
   - Verifique se há arquivos muito grandes ou muitos arquivos no projeto que possam estar sobrecarregando o Metro

2. **Erros de importação no React Navigation**:
   - Verifique se todas as importações no `AppNavigator.tsx` seguem o padrão correto para a versão 6.x
   - Exemplo: `import { createStackNavigator } from '@react-navigation/stack'`
   - Certifique-se de que o componente `NavigationContainer` envolve toda a navegação

3. **Problemas com o PowerShell**:
   - Se encontrar erros como `System.ArgumentOutOfRangeException` no PowerShell, tente usar um terminal CMD ou Git Bash
   - Ou execute `powershell -NoProfile` para iniciar o PowerShell sem perfis que possam estar causando conflitos

4. **Problemas com o pnpm**:
   - Se o pnpm estiver causando problemas, tente usar npm temporariamente:
     ```bash
     npm install --legacy-peer-deps
     ```

5. **Limpar todos os caches**:
   ```bash
   npx expo-doctor clear-cache
   watchman watch-del-all
   pnpm cache clean --force
   ```

6. **Reinstalar todas as dependências**:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

7. **Problemas com o Metro Bundler**:
   - Crie ou atualize o arquivo `metro.config.js` na raiz do projeto:
     ```javascript
     module.exports = {
       resolver: {
         sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
         blacklistRE: [/node_modules\/.*\/node_modules\/react-native\/.*/],
       },
       transformer: {
         getTransformOptions: async () => ({
           transform: {
             experimentalImportSupport: false,
             inlineRequires: true,
           },
         }),
       },
     };
     ```

8. **Último recurso**:
   - Se nenhuma das soluções acima funcionar, considere criar um novo projeto Expo e migrar os componentes e lógica gradualmente

9. **Verificar a saúde do projeto**:
   ```bash
   npx expo-doctor
   ```

10. **Atualizar o Expo CLI**:
    ```bash
    pnpm install -g expo-cli
    ```

## Prevenção de Problemas Futuros

Para evitar problemas semelhantes no futuro:

1. **Mantenha as dependências atualizadas** usando `pnpm update` regularmente
2. **Verifique a compatibilidade** entre as versões do React Navigation antes de atualizar
3. **Use o mesmo gerenciador de pacotes** (npm, yarn ou pnpm) consistentemente
4. **Documente as versões** das dependências que funcionam corretamente

## Recursos Adicionais

- [Documentação do React Navigation](https://reactnavigation.org/docs/getting-started)
- [Guia de Solução de Problemas do Expo](https://docs.expo.dev/troubleshooting/)
- [Guia de Compatibilidade do React Navigation](https://reactnavigation.org/docs/compatibility/)

## Conclusão

Este documento fornece um guia abrangente para corrigir problemas de navegação no aplicativo Acucaradas Encomendas. Seguindo as etapas descritas e utilizando os scripts fornecidos, você deve ser capaz de resolver os problemas de incompatibilidade de versões, permissões e configuração do Metro Bundler.

Lembre-se de que a manutenção regular das dependências e a adoção de boas práticas de desenvolvimento são essenciais para evitar problemas semelhantes no futuro. Se você encontrar dificuldades persistentes, não hesite em consultar a documentação oficial ou buscar ajuda na comunidade do React Native e Expo.