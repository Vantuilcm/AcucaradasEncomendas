# Resolução de Conflitos de Dependências NPM

## Visão Geral

Este documento descreve o processo de detecção e resolução de conflitos de dependências NPM no projeto Acucaradas Encomendas, utilizando o PNPM como gerenciador de pacotes.

## Ferramenta de Análise de Conflitos

O projeto inclui um script especializado para detectar e resolver conflitos de dependências, localizado em `scripts/npm-conflict-solver.js`. Esta ferramenta realiza uma análise completa do projeto e gera recomendações específicas para resolver problemas encontrados.

### Funcionalidades do Analisador

- **Detecção de conflitos de versão**: Identifica pacotes com múltiplas versões instaladas
- **Verificação de peer dependencies**: Encontra peer dependencies não satisfeitas
- **Análise de dependências obsoletas**: Identifica pacotes desatualizados com priorização por severidade
- **Verificação de vulnerabilidades**: Detecta problemas de segurança nas dependências
- **Recomendações automáticas**: Gera sugestões específicas para resolver cada tipo de problema

### Como Executar a Análise

```bash
# Instalar dependência necessária para o script
pnpm add -D chalk

# Executar o analisador de conflitos
node scripts/npm-conflict-solver.js
```

## Tipos de Conflitos Comuns

### 1. Múltiplas Versões de um Mesmo Pacote

Quando diferentes dependências exigem versões incompatíveis do mesmo pacote, o PNPM instala múltiplas versões, o que pode causar problemas em tempo de execução.

**Solução**: Utilizar `pnpm.overrides` no `package.json` para forçar uma versão específica:

```json
"pnpm": {
  "overrides": {
    "pacote-problematico": "versao-compativel"
  }
}
```

### 2. Peer Dependencies Não Satisfeitas

Ocorre quando um pacote espera que outro pacote esteja disponível em uma versão específica, mas essa dependência não está instalada ou está em uma versão incompatível.

**Solução**: Instalar manualmente a peer dependency na versão correta:

```bash
pnpm add pacote-peer@versao-compativel
```

### 3. Dependências Obsoletas ou Inseguras

Pacotes desatualizados podem conter bugs ou vulnerabilidades de segurança.

**Solução**: Atualizar para versões mais recentes, com cautela para evitar quebras de compatibilidade:

```bash
pnpm update pacote-obsoleto
```

Para vulnerabilidades de segurança:

```bash
pnpm audit fix
```

## Estratégias de Resolução

### Abordagem Conservadora (Recomendada)

1. Execute o analisador de conflitos para identificar problemas
2. Resolva primeiro os conflitos de alta severidade
3. Teste a aplicação após cada conjunto de alterações
4. Documente as decisões tomadas para referência futura

### Abordagem Agressiva (Usar com Cautela)

1. Atualize todas as dependências para as versões mais recentes
2. Utilize `pnpm.overrides` para forçar versões específicas
3. Execute `pnpm audit fix --force` para resolver vulnerabilidades
4. Teste extensivamente a aplicação após as alterações

## Melhores Práticas

- **Fixe versões exatas** para dependências críticas (sem `^` ou `~`)
- **Documente decisões** de fixação de versão com comentários no `package.json`
- **Execute o analisador regularmente**, especialmente antes de deploys importantes
- **Mantenha um histórico** de alterações de dependências para rastreabilidade
- **Teste extensivamente** após resolver conflitos de dependências

## Monitoramento Contínuo

Para evitar futuros conflitos, considere implementar:

1. **Verificações automatizadas** no pipeline de CI/CD
2. **Ferramentas de atualização automática** como Dependabot ou Renovate
3. **Revisões periódicas** de dependências (mensais ou trimestrais)

## Referências

- [Documentação oficial do PNPM](https://pnpm.io/)
- [Guia de resolução de conflitos do PNPM](https://pnpm.io/how-peers-are-resolved)
- [Melhores práticas de segurança para NPM](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities)