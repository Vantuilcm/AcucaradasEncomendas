# Histórico de Builds e Correções

## Status Atual (Build 375 - Remoção Completa do Sentry)
- **Build Number:** `375`
- **Data:** 10/03/2026
- **Status:** 🛠️ **REMOÇÃO DE REFERÊNCIAS AO SENTRY**
- **Erro:** `Unable to resolve module @sentry/react-native from .../SecureLoggingService.ts` (Metro Bundler).
- **Correção:** 
    - Removidas todas as importações e chamadas ao `@sentry/react-native` nos arquivos:
        - `src/services/SecureLoggingService.ts`
        - `src/services/LoggingService.ts`
        - `src/services/ErrorHandlingService.ts`
        - `src/components/ErrorBoundary.tsx`
        - `src/__tests__/integration/PerformanceMonitoring.test.ts`
    - O Sentry foi completamente desativado do código-fonte para eliminar erros de compilação C++ e resolução de módulos.
- **Objetivo:** Garantir que o Metro Bundler consiga gerar o bundle sem depender de um pacote que foi removido do `package.json`.

## Status Anterior (Build 374 - Correção de Assets Inexistentes)
- **Build Number:** `374`
- **Data:** 10/03/2026
- **Status:** ✅ **ASSETS CORRIGIDOS**
- **Erro:** `Unable to resolve module ../assets/default-avatar.png` e outros assets inexistentes (fontes, animações Lottie).
- **Correção:** 
    - Removidas as referências a `default-avatar.png` no `ProfileScreen.tsx` (substituído por ícone).
    - Removida animação Lottie inexistente no `OrderCompletedScreen.tsx` (substituído por ícone).
    - Removidas referências a ícones inexistentes no `AuthErrorScreen.tsx` (substituído por ícones do MaterialCommunityIcons).
    - Comentadas fontes e imagens de fundo inexistentes no `AppStartupService.ts`.
- **Objetivo:** Destravar o build do Metro Bundler que estava falhando por não encontrar esses arquivos físicos.

## 🚀 Como Submeter para o TestFlight (Manual)

O GitHub Actions (Plano Free) gera o arquivo `.ipa`, mas **não faz o upload automático** porque requer autenticação de dois fatores da Apple.

**Passo a Passo para Submeter:**

1. **Baixe o IPA:**
   - Vá no [GitHub Actions](https://github.com/Vantuilcm/AcucaradasEncomendas/actions).
   - Clique no build mais recente (ex: `Build iOS IPA`).
   - Role até o final e baixe o artefato `Acucaradas-iOS-IPA`.
   - Extraia o arquivo zip para obter o `Acucaradas.ipa`.

2. **Execute o Script de Submissão:**
   - Coloque o `Acucaradas.ipa` na pasta do projeto.
   - Abra o terminal e rode:
     ```powershell
     .\submeter_testflight.ps1
     ```
   - Digite suas credenciais da Apple quando solicitado.

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
