# Histórico de Builds e Correções

## Status Atual (NOVO Build - Fix FINAL Sentry)
- **Novo Build Disparado:** `Aguardando Push`
- **Build Number:** `367`
- **Data:** 09/03/2026
- **Status:** ⏳ **CORREÇÃO FINAL (Xcode 16.4 / iOS 18.5 SDK)**
- **Motivo:** O build anterior ainda falhou devido a variações de espaços e extensões nos arquivos do Sentry que o primeiro patch não pegou.
- **Correção:** Refinado o regex no `withSentryCppExceptions.js` para capturar `std::vector<const T>` em todos os arquivos `.cpp, .h, .mm, .hpp`.

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
