# Resolução de Conflitos de Dependências NPM

## 🔍 Diagnóstico

O projeto **Acucaradas Encomendas** apresentava conflitos severos de dependências NPM, principalmente relacionados a:

1. **React Navigation**: Conflito entre versões 7.x e 6.x
   - `@react-navigation/native@7.1.17` vs `@react-navigation/native@6.1.18`
   - `@react-navigation/elements@2.6.2` vs `@react-navigation/elements@1.3.31`

2. **Expo Constants**: Conflito entre versões
   - `expo-constants@15.4.6` vs `expo-constants@17.1.7`

3. **Dependências Transitivas**: Conflitos em dependências indiretas

## ✅ Solução Implementada

### 1. Atualização de Overrides

Foram adicionados overrides no `package.json` para forçar versões compatíveis:

```json
"overrides": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@types/react": "~18.2.45",
    "react-native": "0.73.6",
    "expo-router": "3.5.24",
    "@react-navigation/native": "6.1.18",
    "@react-navigation/bottom-tabs": "6.5.20",
    "@react-navigation/stack": "6.9.26",
    "expo-constants": "15.4.6"
}
```

### 2. Scripts de Correção

Foram criados scripts para automatizar o processo de correção:

- **Windows**: `scripts/fix-dependencies.ps1`
- **Unix/Linux/Mac**: `scripts/fix-dependencies.sh`

## 🚀 Como Aplicar a Solução

### Windows

```powershell
cd scripts
./fix-dependencies.ps1
```

### Unix/Linux/Mac

```bash
cd scripts
chmod +x fix-dependencies.sh
./fix-dependencies.sh
```

## 📋 Explicação Técnica

### Causa Raiz

O principal problema estava na incompatibilidade entre o `expo-router@3.5.24` (que depende do React Navigation 6.x) e as versões mais recentes do React Navigation (7.x) que foram instaladas diretamente.

A solução força o uso consistente da versão 6.x do React Navigation em todo o projeto, garantindo compatibilidade com o `expo-router`.

### Estratégia de Resolução

1. **Forçar Versões Compatíveis**: Uso de overrides para garantir consistência
2. **Limpeza Completa**: Remoção de node_modules e cache do NPM
3. **Reinstalação com Flag Especial**: Uso de `--legacy-peer-deps` para contornar conflitos de peer dependencies

## ⚠️ Considerações Futuras

1. **Migração para PNPM**: Considere migrar para o gerenciador de pacotes PNPM, que lida melhor com dependências aninhadas
2. **Atualização Gradual do Expo SDK**: Planeje uma atualização coordenada do Expo e suas dependências
3. **Monitoramento de Dependências**: Implemente ferramentas como Dependabot ou Renovate para manter dependências atualizadas de forma controlada

## 📚 Recursos Adicionais

- [Documentação do NPM sobre Overrides](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides)
- [Guia de Migração do React Navigation 6.x para 7.x](https://reactnavigation.org/docs/upgrading-from-6.x/)
- [Documentação do Expo Router](https://docs.expo.dev/router/introduction/)