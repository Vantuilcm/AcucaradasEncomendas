# Guia Rápido: Resolução de Conflitos com PNPM

## Comandos Essenciais

### Verificação de Conflitos

```bash
# Executar análise de conflitos
node scripts/npm-conflict-solver.js

# Verificar por que um pacote está sendo instalado
pnpm why <nome-do-pacote>

# Listar todas as dependências com múltiplas versões
pnpm list --json | grep -A 1 "\"version\":"
```

### Resolução de Conflitos

```bash
# Corrigir conflitos específicos do Expo/React Native
node scripts/fix-expo-conflicts.js

# Otimizar configuração do PNPM
node scripts/otimizar-pnpm-config.js

# Remover duplicações no node_modules
pnpm dedupe

# Verificar vulnerabilidades de segurança
pnpm audit

# Corrigir vulnerabilidades (não críticas)
pnpm audit fix
```

## Estratégias de Resolução

### 1. Conflitos de Versão

Adicione ao `package.json`:

```json
"pnpm": {
  "overrides": {
    "pacote-problematico": "versao-compativel"
  }
}
```

### 2. Peer Dependencies Não Satisfeitas

```bash
# Instalar peer dependency manualmente
pnpm add <peer-dependency>@<versao-compativel>

# Ou adicionar ao pnpm.overrides
```

### 3. Dependências Obsoletas/Inseguras

```bash
# Atualizar para versão segura
pnpm update <pacote> --latest

# Ou fixar versão específica
pnpm add <pacote>@<versao-segura>
```

## Melhores Práticas

1. **Mantenha o arquivo `.npmrc` otimizado**
   - Execute `node scripts/otimizar-pnpm-config.js` após atualizações importantes

2. **Documente decisões de fixação de versão**
   - Adicione comentários no `package.json` explicando por que uma versão específica foi fixada

3. **Monitore regularmente**
   - Execute `node scripts/npm-conflict-solver.js` mensalmente ou antes de releases importantes

4. **Atualize dependências em grupos**
   - Atualize pacotes relacionados juntos (ex: todos os pacotes React ou todos os pacotes Expo)

5. **Mantenha backups**
   - Antes de grandes atualizações, faça backup do `package.json` e `pnpm-lock.yaml`

## Resolução de Problemas Comuns

### Erro: "Peer dependencies conflict"

Verifique quais pacotes estão causando o conflito:

```bash
pnpm why <pacote-mencionado-no-erro>
```

Adicione a versão correta ao `pnpm.overrides`.

### Erro: "Cannot find module"

```bash
# Limpar cache e reinstalar
pnpm store prune
pnpm install
```

### Erro: "Incompatible native module"

```bash
# Reconstruir módulos nativos
pnpm rebuild
```

## Recursos Adicionais

- [Documentação completa](./RESOLUCAO-CONFLITOS-NPM.md)
- [Relatório de análise](./RELATORIO-CONFLITOS-NPM.md)
- [Scripts de automação](./scripts/)

> **Dica**: Para projetos Expo/React Native, sempre verifique a compatibilidade de versões em https://docs.expo.dev/versions/latest/