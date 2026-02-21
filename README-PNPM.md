# Guia de Uso do PNPM - Acucaradas Encomendas

## Visão Geral

Este documento fornece um guia completo para o uso do PNPM no projeto Acucaradas Encomendas, após a migração bem-sucedida do NPM para o PNPM, um gerenciador de pacotes mais eficiente e rápido. A migração foi concluída com sucesso e este guia serve como referência para a equipe.

## Por que migrar para PNPM?

- **Economia de espaço**: Redução de 40-60% no tamanho do `node_modules`
- **Instalação mais rápida**: Até 2x mais rápido que NPM
- **Melhor detecção de conflitos**: Identificação precoce de problemas de dependências
- **Prevenção de dependências fantasma**: Acesso apenas a dependências declaradas
- **Gerenciamento eficiente de versões**: Sistema de `overrides` mais poderoso

## Instalação e Configuração

### 1. Pré-requisitos

```bash
# Instalar PNPM globalmente
npm install -g pnpm

# Verificar instalação
pnpm --version
```

### 2. Configuração do Projeto

O projeto já está configurado com os arquivos necessários:
- `.npmrc` - Configurações específicas para compatibilidade com Expo
- `pnpm-lock.yaml` - Lockfile gerado pelo PNPM

### 3. Primeiros Passos

```bash
# Instalar dependências
pnpm install

# Iniciar o aplicativo
pnpm start

# Verificar dependências
pnpm list --depth=1
```

## Comandos Comuns do PNPM

| Comando NPM | Comando PNPM | Descrição |
|------------|--------------|------------|
| `npm install` | `pnpm install` | Instalar dependências |
| `npm install <pkg>` | `pnpm add <pkg>` | Adicionar dependência |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` | Adicionar dev dependência |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` | Remover dependência |
| `npm run <script>` | `pnpm <script>` | Executar script |
| `npx <comando>` | `pnpm exec <comando>` | Executar binário |
| `npm update` | `pnpm update` | Atualizar dependências |
| `npm cache clean` | `pnpm store prune` | Limpar cache |
| `npm ci` | `pnpm install --frozen-lockfile` | Instalação em CI/CD |

## Resolução de Conflitos

Se encontrar problemas com dependências, utilize o script de resolução de conflitos:

```bash
node scripts/resolver-expo-pnpm.js
```

Este script irá:
1. Configurar o `.npmrc` para compatibilidade com Expo
2. Atualizar as dependências do Expo no `package.json`
3. Limpar o ambiente (remover `node_modules`, `.expo`, `pnpm-lock.yaml`)
4. Fornecer instruções para reinstalação

Após executar o script, siga as instruções para reinstalar as dependências:

```bash
pnpm install --no-frozen-lockfile
npx expo start
```

## Solução de Problemas

### Erro de peer dependencies

```bash
# Verifique as configurações no .npmrc
cat .npmrc

# Se necessário, adicione configurações para hoisting
pnpm install --shamefully-hoist
```

### Problemas com pacotes nativos

```bash
pnpm rebuild
```

### Incompatibilidade com Expo

```bash
# Limpar cache do Expo
npx expo-doctor clear-cache

# Verificar problemas com o Expo
npx expo doctor

# Corrigir dependências do Expo
npx expo install --fix
```

### Problemas com o Metro Bundler

```bash
# Limpar cache do Metro
npx react-native start --reset-cache
```

## CI/CD com PNPM

O projeto está configurado com um pipeline CI/CD usando PNPM no arquivo `.github/workflows/pnpm-ci.yml`. Este pipeline inclui:

- Instalação de dependências com PNPM
- Execução de testes
- Build da aplicação
- Configuração para builds do Expo (quando aplicável)

## Boas Práticas

1. **Sempre use o lockfile**: Em ambientes de produção e CI, use `--frozen-lockfile` para garantir consistência
2. **Mantenha o PNPM atualizado**: Periodicamente, atualize o PNPM para a versão mais recente
3. **Use o comando `why` para investigar dependências**: `pnpm why nome-do-pacote`
4. **Prefira versões fixas**: Use `--save-exact` ao adicionar novas dependências

## Integração Contínua (CI/CD)

O projeto agora conta com um pipeline de CI/CD configurado para trabalhar com PNPM. O arquivo de configuração está em `.github/workflows/pnpm-ci.yml` e inclui:

- Instalação e configuração do PNPM no ambiente de CI
- Cache de dependências para builds mais rápidos
- Execução de testes automatizados
- Build da aplicação
- Integração com EAS (Expo Application Services) para builds nativos

Para executar o pipeline localmente antes de fazer push:

```bash
# Verificar se o código passa nos testes
pnpm test

# Verificar se o build funciona corretamente
pnpm build
```

## Documentação Adicional

Para informações mais detalhadas sobre a migração, consulte o arquivo `MIGRACAO-PNPM.md`.

---

> **Nota**: Em caso de problemas durante a migração, entre em contato com a equipe de DevOps ou com o responsável pela infraestrutura do projeto.