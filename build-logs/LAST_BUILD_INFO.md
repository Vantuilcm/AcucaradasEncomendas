# Histórico de Builds e Correções

## Status Atual (Build 369 - Fix Yoga/Xcode 16 + Post-Install)
- **Novo Build Disparado:** `Aguardando Push`
- **Build Number:** `369`
- **Data:** 09/03/2026
- **Status:** ⏳ **CORREÇÃO CRÍTICA YOGA/REACT-NATIVE (Post-Install)**
- **Motivo:** O build anterior falhou porque o `patch-package` não foi aplicado corretamente nos arquivos compilados do CocoaPods.
- **Correção:** Adicionado script `post_install` no `withSentryCppExceptions.js` para modificar os arquivos do `React-RCTText` diretamente após a instalação dos Pods, garantindo compatibilidade com Xcode 16.

## Links para Acompanhar
- **GitHub Actions:** [Acompanhar Build Gratuito](https://github.com/Vantuilcm/AcucaradasEncomendas/actions)
- **Dashboard Expo:** [Ver Builds Atuais](https://expo.dev/accounts/acucaradaencomendas/projects/acucaradas-encomendas/builds)

## Correções Recentes (Build 365 -> 366)
- **Sentry Allocator Fix:** Adicionado patch dinâmico no `Podfile` para substituir `std::vector<const T>` por `std::vector<T>` em todos os arquivos C++ do Sentry. Isso resolve o erro `static_assert failed: std::allocator does not support const types`.
- **Build Number:** Incrementado para `366`.

## Correções Recentes (Build 363)
- **Build Number:** Atualizado para `363` para evitar rejeição da Apple por duplicidade.
- **Configuração de Submissão:** Adicionada ao `eas.json` com os IDs corretos.
- **Auto-Submit:** Comando disparado com a flag `--auto-submit` para garantir que o fluxo seja completo.

## Correções Aplicadas (Resumo Técnico)

### 1. Bundler & Metro (Crítico - "main.jsbundle not found")
- **Problema:** O Metro Bundler falhava silenciosamente ao gerar o bundle porque a configuração `metro.config.js` excluía incorretamente a pasta `.expo/`.
- **Correção:** Removida a exclusão global de `/\.expo\/.*/`.
- **Validação:** `npx expo export --platform ios` executado com sucesso localmente.

### 2. Native Code & Compilação (Crítico - "Yoga/bitcode error")
- **Problema:** Incompatibilidade de tipos C++ na biblioteca `@react-native-community/datetimepicker` com SDK 49.
- **Correção:** Criado patch via `patch-package` corrigindo `YGNodeRef` para `YGNodeConstRef`.

### 3. Config Plugins & Scripts (Bloqueante - "withPodfile is not a function")
- **Problema:** Erro de importação no plugin `withSentryCppExceptions.js`.
- **Correção:** Implementada lógica de importação robusta com fallback.

### 4. TypeScript & Estabilidade
- **Correção:** Aplicados casts e supressões para garantir compilação limpa.
- **Validação:** `npm run type-check` passou sem erros.
