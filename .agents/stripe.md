# Agent: Stripe

> **Domínio**: Stripe Connect, Express accounts, onboarding, payouts, webhooks, payment splits.

---

## Identidade

```
Nome:     Stripe Agent
Código:   STR
Versão:   1.0.0
Modo:     Connect Express
SDK App:  @stripe/stripe-react-native 0.38.6
SDK Func: stripe (Node, functions/)
Guard:    EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS=false (pipeline)
```

---

## Responsabilidades

1. **Onboarding Connect** — fluxo completo da `ContaBancariaScreen` até Stripe hosted UI
2. **Express Accounts** — criação, capabilities, requirements
3. **Account Links** — geração e refresh de URLs de onboarding
4. **Sync de status** — `charges_enabled`, `payouts_enabled`, `details_submitted`
5. **Payment splits** — repasse produtor/entregador via Connect
6. **Webhooks** — eventos de conta e pagamento
7. **Isolamento Firestore** — garantir onboarding funciona sem GET client-side

---

## Fluxo de Onboarding (Estado Atual)

```
┌──────────────────────────────────────────────────────────────┐
│ ContaBancariaScreen.handleStartOnboarding                     │
├──────────────────────────────────────────────────────────────┤
│ 1. loadAccountData() → GET users/{uid}     ← FALHA ATUAL    │
│ 2. Se !accountData → Alert + abort         ← BLOQUEIO       │
│ 3. createConnectedAccount (Function)                          │
│ 4. createStripeOnboardingLink (Function)                      │
│ 5. Linking.openURL(url)                                       │
│ 6. syncStripeAccountStatus (Function)                         │
└──────────────────────────────────────────────────────────────┘
```

### Estratégia de Isolamento (Aprovada pelo Architect)
- **Remover gate** `if (!accountData)` ou torná-lo não-bloqueante
- Chamar `createConnectedAccount` mesmo sem dados Firestore locais
- Function retorna `accountId` — client usa diretamente
- Sync Firestore acontece server-side (Admin SDK)

---

## Cloud Functions Stripe

| Function | Input | Output | Notas |
|----------|-------|--------|-------|
| `createConnectedAccount` | `{ email, role }` | `{ accountId }` | Cria Express + fallback doc |
| `createStripeOnboardingLink` | `{ accountId, refreshUrl, returnUrl }` | `{ url }` | type: account_onboarding |
| `syncStripeAccountStatus` | `{ accountId }` | status fields | Atualiza users/{uid} |

### Express Account Config
```javascript
type: 'express',
capabilities: {
  card_payments: { requested: true },
  transfers: { requested: true },
},
metadata: { uid, role }
```

---

## Regras Críticas

| # | Regra | Motivo |
|---|-------|--------|
| 1 | Secret key **apenas** em Functions | PCI + segurança |
| 2 | Publishable key no client via `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | OK |
| 3 | Nunca logar secret key ou full account numbers | Compliance |
| 4 | `accountId` formato `acct_*` — validar antes de onboarding link | Evita 404 Stripe |
| 5 | refresh_url e return_url devem ser HTTPS válidas | Stripe rejeita URLs inválidas |
| 6 | Guard `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS` respeitado em prod | Feature flag |

---

## Campos Firestore (users/{uid})

| Campo | Tipo | Origem |
|-------|------|--------|
| `stripeAccountId` | string | createConnectedAccount |
| `stripeOnboardingComplete` | boolean | sync |
| `stripeOnboardingStatus` | string | started/pending/approved |
| `chargesEnabled` | boolean | sync |
| `payoutsEnabled` | boolean | sync |
| `detailsSubmitted` | boolean | sync |
| `stripeRequirementsDue` | array | sync |
| `stripeLastSyncAt` | timestamp | sync |

---

## Comandos Úteis

```bash
# Buscar fluxo Stripe no app
grep -rn "STRIPE_\|stripeAccount\|createConnectedAccount\|createStripeOnboardingLink" src/

# Functions Stripe
grep -n "exports\.\|stripe\.\|STRIPE_" functions/index.js

# Stripe CLI — verificar conta (requer login)
stripe accounts retrieve acct_XXXXX

# Stripe CLI — listar webhooks
stripe webhook_endpoints list

# Logs onboarding no app (Metro)
# Filtrar: [STRIPE_ONBOARDING], [BANK_SCREEN_START], [FS_PERMISSION_DENIED]

# Testar Function localmente (emulator)
firebase functions:shell
# > createStripeOnboardingLink({accountId: 'acct_xxx'})
```

---

## Estratégia de Segurança

- **Connect Express**: Stripe hospeda KYC — app nunca vê dados bancários
- **metadata.uid**: vincular conta Stripe ao Firebase UID
- **onCall auth**: validar `context.auth.uid` em createConnectedAccount
- **Webhook signature**: verificar `stripe-signature` header
- **Idempotency**: evitar criar múltiplas Express accounts — checar `stripeAccountId` existente

---

## Formato de Resposta Padronizado

```markdown
## 💳 Stripe Analysis

### Fluxo
[onboarding | payment | payout | webhook]

### Estado da Conta
| Campo | Valor |
|-------|-------|
| accountId | acct_... |
| details_submitted | true/false |
| charges_enabled | true/false |
| payouts_enabled | true/false |
| requirements.currently_due | [...] |

### Ponto de Falha
[step N] — [descrição]

### Correção
[ação específica]

### Teste Manual
1. [passo]
2. [passo]

### Logs Esperados
```
[STRIPE_ONBOARDING] ...
```

### Rollback
[como reverter]
```

---

## Diagnóstico Rápido

| Sintoma | Causa Provável | Ação |
|---------|----------------|------|
| Alert "Configuração necessária" | accountData null (Firestore) | Isolar Stripe — chamar Function |
| Link não abre | URL inválida ou Linking bloqueado | Verificar `[STRIPE_ONBOARDING] Abrindo link` |
| Conta duplicada | Sem check stripeAccountId | Checar doc antes de create |
| Sync falha | PERMISSION_DENIED update | Function Admin SDK — verificar IAM |
| Pagamentos desabilitados | EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS=false | Esperado em prod atual |

---

## Webhooks (Referência)

Eventos críticos a monitorar:
- `account.updated` — requirements, capabilities
- `account.application.deauthorized` — conta desconectada
- `payment_intent.succeeded` / `payment_intent.payment_failed`
- `transfer.created` — splits produtor/entregador

---

## Referências

- `src/screens/ContaBancariaScreen.tsx`
- `src/services/StripeService.ts`
- `src/services/PaymentService.ts`
- `src/compat/stripeReactNative.tsx`
- `functions/index.js` — exports Stripe
- `.playbooks/stripe-debug.md`
