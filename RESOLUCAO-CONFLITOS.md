# Resolução de Conflitos de Dependências - Açucaradas Encomendas

## Problemas Resolvidos

### 1. Arquivos de Imagem SVG com Extensão PNG

Os arquivos `icon.png`, `splash.png` e `adaptive-icon.png` eram na verdade arquivos SVG com extensão PNG, o que causava erros na compilação do Expo. Foi criado um script para converter esses arquivos para PNG reais.

**Solução implementada:**
- Backup dos arquivos SVG originais em `./assets/backup/`
- Script `convert-images.ps1` para criar PNGs reais
- Verificação automática no script `dev-with-node20.bat`

### 2. Configuração do Metro Bundler

O arquivo `metro.config.js` não estendia corretamente `@expo/metro-config`.

**Solução implementada:**
- Atualização do `metro.config.js` para usar `@expo/metro-config`
- Adição de configurações personalizadas para suportar extensões `.cjs`
- Limpeza de cache do Metro no script de desenvolvimento

### 3. Versão do SDK do Expo

A versão do SDK do Expo (inferior a 50) não suporta Android API 34.

**Solução implementada:**
- Atualização para o Expo SDK 50.0.21
- Atualização de todas as dependências relacionadas ao Expo para versões compatíveis
- Correção de conflitos de versões entre React, React Native e outras bibliotecas
- Ajuste das engines no package.json para suportar Node.js 22.x

### 4. Vulnerabilidades de Segurança

Foram identificadas vulnerabilidades de segurança em diversas dependências.

**Solução implementada:**
- Adição de `overrides` para pacotes problemáticos como `undici`
- Atualização de dependências para versões mais seguras
- Uso de `--legacy-peer-deps` para resolver conflitos de dependências

## Como Usar os Scripts

### Para Desenvolvimento

```bash
.\dev-with-node20.bat
```

Este script:
1. Verifica a versão do Node.js e NPM
2. Instala dependências se necessário
3. Verifica e corrige arquivos de imagem SVG
4. Executa diagnóstico do Expo
5. Limpa o cache do Metro
6. Inicia o servidor de desenvolvimento

### Para Atualizar o Expo SDK

```bash
.\update-expo-sdk.bat
```

Este script:
1. Faz backup do `package.json` atual
2. Atualiza as dependências para o Expo SDK 50
3. Corrige vulnerabilidades de segurança
4. Adiciona overrides para pacotes problemáticos
5. Reinstala todas as dependências

## Recomendações Adicionais

1. **Compatibilidade com Node.js**
   - O projeto foi atualizado para funcionar com Node.js 18.x, 20.x e 22.x
   - Recomendado usar o Node.js 20.18.0 para melhor compatibilidade com o Expo SDK 50

2. **Sempre usar `--legacy-peer-deps` ao instalar pacotes**
   - Isso evita conflitos de dependências entre pacotes

3. **Executar `npx expo-doctor` regularmente**
   - Ajuda a identificar problemas de configuração

4. **Considerar migração para o Expo SDK 51 quando disponível**
   - Trará melhorias de desempenho e segurança