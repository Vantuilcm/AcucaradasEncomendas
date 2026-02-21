# Instruções para Fixar Versões de Dependências

Este documento fornece instruções para executar o script de fixação de versões de dependências, que converte ranges flexíveis (`^` e `~`) em versões exatas no `package.json`.

## Por que fixar versões?

O uso de ranges flexíveis (`^` e `~`) no `package.json` pode causar problemas como:

- **Inconsistência entre ambientes**: Diferentes desenvolvedores podem ter versões diferentes instaladas
- **Builds quebrados**: Atualizações automáticas podem introduzir incompatibilidades
- **Conflitos de dependências**: Versões diferentes de pacotes podem ter requisitos incompatíveis
- **Dificuldade em reproduzir bugs**: Bugs podem aparecer apenas em certas versões de dependências

## Como executar o script

### Pré-requisitos

- Node.js instalado (v18.0.0 ou superior)
- Acesso ao terminal/PowerShell

### Passos

1. Abra o terminal/PowerShell na raiz do projeto
2. Execute o script com o seguinte comando:

```bash
node scripts/fixar-versoes.js
```

3. O script irá:
   - Fazer backup do `package.json` original
   - Analisar todas as dependências com ranges flexíveis
   - Converter para versões exatas com base nas versões atualmente instaladas
   - Atualizar `overrides` e `resolutions` com as mesmas versões exatas
   - Exibir um relatório das alterações realizadas

### Exemplo de saída

```
✅ Backup do package.json criado em: package.json.backup-1234567890

🔒 CONVERSÃO DE VERSÕES FLEXÍVEIS PARA EXATAS
===========================================

✅ 15 dependências convertidas para versões exatas:
  - react: ^18.2.0 → 18.2.0
  - react-native: ^0.72.10 → 0.72.10
  - expo: ~49.0.0 → 49.0.0
  ...

⏩ 10 dependências não modificadas:
  - @types/react: ~18.2.14 (Já é uma versão exata ou usa outro formato)
  ...

📝 Próximos passos:
  1. Revise as alterações no package.json
  2. Execute npm install para atualizar o package-lock.json
  3. Teste a aplicação para garantir que tudo funciona corretamente
  4. Se necessário, restaure o backup: package.json.backup-1234567890
```

## Após a execução

1. **Revise as alterações**: Verifique o `package.json` para garantir que as alterações estão corretas
2. **Atualize o package-lock.json**: Execute `npm install` para atualizar o arquivo de lock
3. **Teste a aplicação**: Certifique-se de que a aplicação continua funcionando corretamente
4. **Commit das alterações**: Adicione as alterações ao controle de versão

## Restaurando o backup

Se algo der errado, você pode restaurar o backup do `package.json` original:

```bash
# Substitua pelo nome do arquivo de backup exibido na saída do script
cp package.json.backup-1234567890 package.json
```

## Manutenção contínua

Para manter as versões fixas no futuro:

1. **Instale novas dependências com versões exatas**:
   ```bash
   npm install pacote@1.2.3 --save-exact
   ```

2. **Atualize dependências uma por uma**:
   ```bash
   npm install pacote@2.0.0 --save-exact
   ```

3. **Execute o script periodicamente**: Especialmente após adicionar novas dependências

4. **Configure o `.npmrc`**: Adicione `save-exact=true` ao `.npmrc` para que o NPM sempre salve versões exatas

## Considerações importantes

- **Atualizações de segurança**: Versões fixas significam que você precisa atualizar manualmente quando houver correções de segurança
- **Compatibilidade**: Teste exaustivamente após atualizar qualquer dependência
- **Documentação**: Mantenha um registro de quais versões são compatíveis entre si

---

> **Nota**: Este script é uma ferramenta de auxílio e pode não cobrir todos os casos especiais. Sempre revise as alterações antes de aplicá-las em ambiente de produção.