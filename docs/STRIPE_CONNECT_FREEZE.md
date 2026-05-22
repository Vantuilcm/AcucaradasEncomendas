# Stripe Connect — Freeze de Estabilidade (v1)

**Tag Git:** `stripe-connect-stable-v1`  
**Data do freeze:** 2026-05-22  
**Branch de referência:** `lab/stripe-isolation`  
**Status:** Produção estabilizada — **não refatorar sem aprovação explícita**

---

## Objetivo

Preservar a stack Stripe Connect após validação em produção (iOS Safari, Functions v7, Secret Manager, Hosting, Apple Review safe).

Este documento é a **fonte oficial** do fluxo congelado e do que **não** deve ser alterado.

---

## Fluxo oficial (congelado)

```
App (ContaBancariaScreen)
  → Linking.openURL (Safari externo)
  → Stripe Connect onboarding (hosted)
  → https://acucaradasencomendas.com.br/stripe-success
  → usuário toca "Abrir aplicativo"
  → acucaradas://stripe/onboarding-complete (CTA explícito, sem auto-redirect)
  → retorno manual / futuro handler (Fase 2+)
```

**Refresh (sessão expirada):** `https://acucaradasencomendas.com.br/stripe-refresh`

---

## Componentes congelados — NÃO ALTERAR

| Área | Artefato | Motivo |
|------|----------|--------|
| Functions | `createConnectedAccount` | Conta Express estável |
| Functions | `createStripeOnboardingLink` | Account Links Stripe |
| Functions | `getStripeSecret` / Secret Manager | Credenciais v7 |
| Functions | `return_url` / `refresh_url` HTTPS | Requisito Stripe |
| Hosting | `firebase.json` rewrites `/stripe-success`, `/stripe-refresh` | Landing pós-onboarding |
| App | Safari flow (`Linking.openURL`) | Apple Review safe |
| App | Lógica onboarding `ContaBancariaScreen` | Fluxo validado |
| Runtime | Firebase Functions runtime / Stripe SDK | Build 1294+ estável |
| iOS | Associated Domains / universal links | Fora de escopo v1 |

---

## Backup de configuração (snapshot)

Cópias imutáveis em:

```
docs/stripe-freeze-v1/backup/
  firebase.json
  functions-index.js          (cópia de functions/index.js no momento do tag)
  stripe-success.index.html
  stripe-refresh.index.html
```

**Rollback Hosting (só UX web):** restaurar HTML do backup e `firebase deploy --only hosting`.

**Rollback Functions:** exige processo separado — não fazer sem janela de manutenção.

---

## Monitoramento (permitido)

| Sinal | Onde observar |
|-------|----------------|
| `createConnectedAccount` erros/latência | Cloud Logging → filtro function name |
| `createStripeOnboardingLink` falhas de URL | Logs `[STRIPE_*]` no app + Functions |
| Onboarding abandonado | Stripe Dashboard → Connect → contas incompletas |
| Safari / return | Taxa de hits em `/stripe-success` (Hosting analytics) |
| Sync manual | Uso do botão "Já preenchi, atualizar status" na Conta Bancária |

**Logs app (Metro / dispositivo):** `[STRIPE_ONBOARDING]`, `[STRIPE_OPENURL_*]`, `[BANK_SCREEN_START]`

---

## Permitido sem quebrar o freeze

- Monitoramento e alertas
- Logs adicionais (não alterar lógica)
- Testes reais em dispositivo
- Pequenos ajustes **visuais** em `public/stripe-success` / `stripe-refresh` (sem mudar `return_url`)
- Documentação e auditorias
- Analytics na landing web

---

## Proibido nesta fase (roadmap futuro)

- Universal Links / `apple-app-site-association`
- Auto-redirect para `acucaradas://`
- `Linking.addEventListener('url')` / handler `onboarding-complete`
- Auto-sync Firestore ao retorno do Safari
- Alterar `return_url` / `refresh_url` para custom scheme
- Refatorar Functions Stripe
- Migrar runtime ou Stripe SDK

---

## Roadmap futuro (após novo ciclo de aprovação)

| Fase | Escopo | Risco |
|------|--------|-------|
| 2 | Handler deep link + navegação Conta Bancária | Baixo |
| 2b | `useFocusEffect` / AppState → `syncStripeAccountStatus` | Baixo |
| 3 | Universal Links + AASA + `associatedDomains` | Médio |

**Pré-requisito:** tag `stripe-connect-stable-v1` intacto; mudanças em branch dedicada (`feat/stripe-return-v2`).

---

## Checklist App Store Review

- [x] Onboarding financeiro em browser externo (Stripe)
- [x] `return_url` HTTPS no domínio do produto
- [x] Página de conclusão com copy clara (não é IAP)
- [x] Retorno ao app via CTA explícito (sem redirect agressivo)
- [ ] Mencionar fluxo Connect nas notas de revisão se solicitado

---

## Referências

- Agente Stripe: `.agents/stripe.md`
- Playbook debug: `.playbooks/stripe-debug.md`
- Auditoria return flow: conversa / relatório arquitetural 2026-05-22

---

**Assinatura do freeze:** alterações em itens da tabela "NÃO ALTERAR" exigem novo tag (`stripe-connect-stable-v2`) e teste completo iOS + Functions + Hosting.
