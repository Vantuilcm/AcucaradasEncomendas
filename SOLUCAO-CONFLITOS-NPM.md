# Solução de Conflitos NPM - Açucaradas Encomendas

## 🔍 RELATÓRIO DE CONFLITOS NPM

**STATUS GERAL:** Conflitos moderados a graves parcialmente resolvidos

### 📦 CONFLITOS DETECTADOS:

1. **Metro e pacotes relacionados** - Conflito entre versões declaradas no package.json (^0.76.8) e instaladas no package-lock.json (^0.82.5)
2. **@react-native-async-storage/async-storage** - Versão ^2.2.0 é incompatível com Expo SDK 49
3. **@react-native-community/cli** - Versão ^20.0.0 é muito recente para o React Native 0.72.10
4. **firebase** - Versão ^12.1.0 é muito recente e pode ter incompatibilidades
5. **react-native-svg** - Versão ^15.12.1 é incompatível com Expo SDK 49
6. **Inconsistência entre overrides e resolutions** - Algumas versões diferem entre as duas seções
7. **Imagens SVG** - Arquivos SVG com extensão PNG incorreta

### ✅ AÇÕES RECOMENDADAS:

1. **Corrigir versões do Metro**:
   - Alinhar todas as versões do Metro para ^0.76.8 (compatível com Expo SDK 49)
   - Remover duplicação entre overrides e resolutions

2. **Corrigir dependências incompatíveis**:
   - Downgrade do @react-native-async-storage/async-storage para ~1.18.2
   - Downgrade do @react-native-community/cli para ^11.3.8
   - Downgrade do firebase para ^10.7.1
   - Downgrade do react-native-svg para ~13.9.0

3. **Utilizar scripts de resolução automática existentes**:
   - `resolver-conflitos-npm-simples.ps1` - Atualizar para incluir as novas versões compatíveis
   - `corrigir-imagens.ps1` - Manter para corrigir extensões de imagens SVG
   - `iniciar-app.bat` - Manter como script unificado para iniciar o aplicativo

4. **Atualizar metro.config.js**:
   - Manter configuração atual que já inclui:
     - Suporte para extensões .cjs
     - Configuração para usar polling no Windows
     - Otimizações de desempenho

## 🚀 PLANO DE EXECUÇÃO

### Etapa 1: Atualizar o script resolver-conflitos-npm-simples.ps1

1. Adicionar as seguintes versões compatíveis ao script:

```powershell
$overrides = @{
    "react" = "18.2.0"
    "react-dom" = "18.2.0"
    "@types/react" = "~18.2.14"
    "react-native" = "0.72.10"
    "expo-router" = "~2.0.0"
    "metro" = "^0.76.8"
    "metro-config" = "^0.76.8"
    "metro-core" = "^0.76.8"
    "metro-runtime" = "^0.76.8"
    "metro-resolver" = "^0.76.8"
    "@expo/metro-config" = "^0.10.0"
    "@react-native-async-storage/async-storage" = "~1.18.2"
    "@react-native-community/cli" = "^11.3.8"
    "firebase" = "^10.7.1"
    "react-native-svg" = "~13.9.0"
}
```

### Etapa 2: Executar os scripts de correção

1. Execute o script `iniciar-app.bat` com duplo clique, que irá automaticamente:
   - Resolver conflitos de dependências com o script atualizado
   - Corrigir imagens SVG com extensão PNG
   - Limpar o cache do NPM
   - Instalar dependências com flags de compatibilidade
   - Iniciar o aplicativo

### Método Manual (Alternativo)

Se preferir executar os passos manualmente:

1. Execute `powershell -ExecutionPolicy Bypass -File .\resolver-conflitos-npm-simples.ps1`
2. Execute `powershell -ExecutionPolicy Bypass -File .\corrigir-imagens.ps1`
3. Execute `npm cache clean --force`
4. Execute `rm -rf node_modules package-lock.json`
5. Execute `npm install --legacy-peer-deps`
6. Execute `npx expo start --clear`

## 📋 AÇÕES REALIZADAS (ATUALIZAÇÃO)

### Data: 2024-06-19

1. **Análise de Dependências Problemáticas**:
   - Identificado conflito entre versão declarada e override para `@react-native-voice/voice`
   - Verificado que o package.json já continha correções para `xmldom` (atualizado para 0.6.0)
   - Confirmado total de 27 vulnerabilidades (2 baixas, 17 moderadas, 7 altas, 1 crítica)

2. **Implementação de Soluções**:
   - Executado script `resolver-conflitos-npm-simplificado.ps1` para aplicar correções automáticas
   - Corrigido conflito entre a versão declarada em `dependencies` (3.2.4) e `overrides` (3.1.5) para `@react-native-voice/voice`
   - Executado `npm cache clean --force` para limpar o cache do NPM
   - Executado `npm install --legacy-peer-deps` para reinstalar as dependências respeitando as versões definidas

3. **Verificação de Integridade**:
   - Executado `npx expo-doctor` para verificar a integridade do projeto
   - Identificados 2 problemas não críticos:
     - Configuração personalizada do Metro que não estende @expo/metro-config
     - Versão do SDK que não atende aos requisitos para submissão na Google Play Store após agosto de 2024

4. **Inicialização do Aplicativo**:
   - Executado `npx expo start --clear` para iniciar o aplicativo com cache limpo
   - Aplicativo iniciado com sucesso, embora ainda exiba os 2 avisos não críticos do expo-doctor

## 🧠 SUGESTÕES AVANÇADAS:

1. **Otimização de dependências**:
   - Considerar migração para pnpm para melhor gerenciamento de dependências (instruções em [MIGRACAO-PNPM.md](./MIGRACAO-PNPM.md))
   - Utilizar apenas overrides (remover resolutions) para evitar duplicação
   - Sempre use `--legacy-peer-deps` ao instalar novas dependências

2. **Melhoria de configuração**:
   - Manter a seção `overrides` no package.json ao atualizar dependências
   - Executar `npx expo-doctor` regularmente para verificar a saúde do projeto
   - Atualizar o Expo SDK de forma coordenada para evitar conflitos (instruções em [RECOMENDACOES-AVANCADAS.md](./RECOMENDACOES-AVANCADAS.md))
   - Atualizar o arquivo metro.config.js para estender @expo/metro-config

3. **Estratégia de versionamento rígida**:
   - Implementado script para fixar versões exatas de dependências (sem ^ ou ~)
   - Instruções detalhadas em [INSTRUCOES-FIXAR-VERSOES.md](./INSTRUCOES-FIXAR-VERSOES.md)
   - Execute o script com: `node scripts/fixar-versoes.js`
   - Benefícios: maior estabilidade, builds consistentes, menos conflitos

4. **Práticas recomendadas**:
   - Manter o Node.js na versão recomendada (18.x ou superior, mas menor que 23.0.0)
   - Verificar compatibilidade de novas dependências com o Expo SDK atual
   - Adicionar `save-exact=true` ao `.npmrc` para sempre salvar versões exatas

## ⚠️ OBSERVAÇÕES IMPORTANTES

- O projeto foi configurado para funcionar com Node.js 18.x ou superior (menor que 23.0.0)
- As alterações feitas são compatíveis com Windows, mas podem precisar de ajustes para outros sistemas operacionais
- Se encontrar problemas após as correções, tente limpar completamente o cache e node_modules:
  ```
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install --legacy-peer-deps
  ```
- Para verificar a saúde do projeto após as correções, execute:
  ```
  npx expo-doctor
  ```

---

*Solução implementada por NPMConflictSolverAI - 2024*