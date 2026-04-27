# 📋 CHECKLIST DE RELEASE (RELEASE_CHECKLIST.md)

Este checklist DEVE ser preenchido e validado antes de qualquer merge para a branch `main` ou publicação em Produção.

## 1. ESTABILIDADE E CÓDIGO
- [ ] **Typecheck**: `npm run type-check` passou sem erros.
- [ ] **Lint**: `npm run lint` validado (ou erros conhecidos documentados).
- [ ] **Build Local**: O comando `npx expo prebuild` funciona localmente.
- [ ] **Versão**: `app.json` e `version-state.json` estão sincronizados e incrementados.

## 2. SEGURANÇA E AMBIENTE
- [ ] **Firebase**: `GoogleService-Info.plist` e `google-services.json` presentes e corretos.
- [ ] **Variáveis de Ambiente**: Todas as `EXPO_PUBLIC_*` necessárias estão configuradas no CI/CD.
- [ ] **ASC API Key**: Chave de App Store Connect validada e funcional.

## 3. TESTES FUNCIONAIS (SMOKE TEST)
- [ ] **Login**: Fluxos de Cliente e Produtor funcionando.
- [ ] **Navegação**: O app não apresenta tela branca após o login.
- [ ] **Modo Diagnóstico**: `BootDiagnosticScreen` carregando corretamente se ativado.

## 4. PROCESSO DE RELEASE
- [ ] **Freeze**: O código está em congelamento (no-feature zone) há pelo menos 48h.
- [ ] **TestFlight**: Build enviado e aprovado para testes internos.
- [ ] **Tag**: Tag `stable-prod-baseline` ou equivalente aplicada.

---
**Data da Última Validação**: 2026-04-22
**Responsável**: Trae AI / iOSBuildGuardianAI_V2_LOCAL
