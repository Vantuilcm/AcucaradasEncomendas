# Instruções para Correção de Erros no Projeto

## Visão Geral

Este documento contém instruções para corrigir erros de TypeScript e problemas de sensibilidade a maiúsculas/minúsculas no projeto Acucaradas Encomendas. Os scripts fornecidos automatizam o processo de correção dos problemas mais comuns encontrados no código.

## Problemas Identificados

1. **Inconsistência na importação do LoggingService**:
   - Alguns arquivos importam de `'../services/loggingService'` (com 'l' minúsculo)
   - Outros importam de `'../services/LoggingService'` (com 'L' maiúsculo)
   - Isso causa erros em sistemas operacionais case-sensitive como Linux e macOS

2. **Métodos incorretos do LoggingService**:
   - Alguns arquivos usam métodos como `logInfo`, `logWarning`, `logError`
   - Os métodos corretos são `info`, `warn`, `error`

3. **Outros problemas de sensibilidade a maiúsculas/minúsculas**:
   - Inconsistências em nomes de arquivos e importações

## Scripts de Correção

Foram criados os seguintes scripts para corrigir automaticamente esses problemas:

### 1. `scripts/corrigir-case-sensibilidade.js`

Corrige problemas de sensibilidade a maiúsculas/minúsculas nos nomes de arquivos.

```bash
node scripts/corrigir-case-sensibilidade.js
```

### 2. `scripts/corrigir-imports-logging.js`

Corrige importações inconsistentes do LoggingService e chamadas incorretas de métodos.

```bash
node scripts/corrigir-imports-logging.js
```

### 3. `scripts/verificar-corrigir-typescript.js`

Verifica erros de TypeScript e aplica correções automáticas para problemas comuns.

```bash
node scripts/verificar-corrigir-typescript.js
```

### 4. `scripts/corrigir-todos-erros.js`

Executa todos os scripts acima em sequência.

```bash
node scripts/corrigir-todos-erros.js
```

## Instruções de Uso

1. Certifique-se de ter o Node.js instalado (versão 14 ou superior)
2. Abra um terminal na raiz do projeto
3. Execute o script principal:

```bash
node scripts/corrigir-todos-erros.js
```

4. Após a execução, verifique se todos os erros foram corrigidos:

```bash
npx tsc --noEmit
```

5. Se ainda houver erros, pode ser necessário corrigir manualmente alguns casos específicos

## Prevenção de Problemas Futuros

Para evitar que esses problemas ocorram novamente:

1. **Padronize as importações**:
   - Sempre use `import { loggingService } from '../services/LoggingService'` (com 'L' maiúsculo)
   - Use os métodos corretos: `info`, `warn`, `error`, `debug`, `fatal`

2. **Configure o ESLint**:
   - Adicione regras para detectar importações inconsistentes

3. **Adicione verificações pré-commit**:
   - Execute `npx tsc --noEmit` antes de cada commit
   - Use o plugin `case-sensitive-paths-webpack-plugin` para detectar problemas de sensibilidade a maiúsculas/minúsculas

4. **Documente as convenções**:
   - Atualize a documentação do projeto com as convenções de nomenclatura e importação

## Suporte

Se encontrar problemas ao executar os scripts ou se os erros persistirem, entre em contato com a equipe de desenvolvimento.