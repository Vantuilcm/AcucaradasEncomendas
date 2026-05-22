# CPA Week 1 — Validação operacional (48h)

**Feature:** persistência `users/{uid}.stripeAccountId`  
**Branch:** `feature/persist-stripe-account-id`  
**Commit:** `c804ba0`  
**Baseline:** `finance-stable-v1`  
**Flag:** `EXPO_PUBLIC_ENABLE_STRIPE_ACCOUNT_PERSIST`

---

## Status da fase

| Item | Estado |
|------|--------|
| Implementação | ✅ `c804ba0` |
| Produção App Store | ❌ flag **OFF** (não mergear ainda) |
| Validação controlada | 🔄 Este documento |
| Semana 2 (sync focus) | ⏸ Bloqueada até aprovação |

---

## PASSO 1 — Ambiente controlado

Ativar persistência **somente** nestes perfis EAS:

| Perfil | `EXPO_PUBLIC_ENABLE_STRIPE_ACCOUNT_PERSIST` |
|--------|-----------------------------------------------|
| `development` | `true` |
| `preview` | `true` |
| `beta` | `false` (extends production) |
| `production` / `production_v13` | **`false`** |

Build recomendado:

```bash
git checkout feature/persist-stripe-account-id
eas build --platform ios --profile preview
# ou development para dev client
```

**Não** promover build de produção com flag `true`.

---

## PASSO 2 — Flag

```env
EXPO_PUBLIC_ENABLE_STRIPE_ACCOUNT_PERSIST=true
```

Já configurado em `eas.json` para `development` e `preview` apenas.

Produção permanece sem a variável → default off no app.

---

## PASSO 3 — Teste real (roteiro)

| # | Ação | OK |
|---|------|-----|
| 1 | Conta produtor **nova** ou limpa (sem `stripeAccountId` no doc) | ☐ |
| 2 | Login → Perfil → **Conta Bancária** | ☐ |
| 3 | **Configurar conta bancária** | ☐ |
| 4 | Safari → completar onboarding Stripe | ☐ |
| 5 | Voltar ao app (manual ou CTA web) | ☐ |
| 6 | Opcional: **Já preenchi, atualizar status** | ☐ |

---

## PASSO 4 — Firestore

Console → `users/{uid}`:

```text
stripeAccountId: "acct_xxxxxxxx"
```

| Verificação | ☐ |
|-------------|---|
| Campo existe após passo 3 (criar conta), antes ou após Safari | |
| Valor começa com `acct_` | |
| Mesmo UID após reopen / logout | |

---

## PASSO 5 — Logs (Metro / Xcode / TestFlight logs)

| Log | Esperado |
|-----|----------|
| `[STRIPE_ACCOUNT_PERSIST]` | ✅ 1x ao criar conta |
| `[STRIPE_ACCOUNT_PERSIST_OK]` | ✅ |
| `[STRIPE_ACCOUNT_PERSIST_ERROR]` | ❌ **não deve aparecer** |

Logs relacionados (regressão onboarding):

- `[STRIPE_ONBOARDING] Conta criada com sucesso`
- `[STRIPE_ONBOARDING] Chamando createStripeOnboardingLink`
- `[STRIPE_OPENURL_DONE]`

---

## PASSO 6 — Teste crítico (reopen)

| # | Ação | Esperado | ☐ |
|---|------|----------|---|
| 1 | Force quit app | — | ☐ |
| 2 | Reabrir → Conta Bancária | **Não** chama `createConnectedAccount` de novo | ☐ |
| 3 | Logs | Sem novo `[STRIPE_ACCOUNT_PERSIST]` se ID já existe | ☐ |
| 4 | Stripe Dashboard | **Uma** conta Express por UID de teste | ☐ |

**Falha:** segundo `acct_` no Stripe ou novo persist no reopen = **bloquear merge**.

---

## PASSO 7 — Logout / login

| # | Ação | Esperado | ☐ |
|---|------|----------|---|
| 1 | Logout | — | ☐ |
| 2 | Login mesmo utilizador | — | ☐ |
| 3 | Conta Bancária | `stripeAccountId` no Firestore inalterado | ☐ |
| 4 | UI status | Consistente com sync (pending/approved) | ☐ |

---

## PASSO 8 — Observação 48h

### Cloud Logging (Functions)

Filtros sugeridos:

```text
[STRIPE_ONBOARDING_START]
[STRIPE_ACCOUNT_CREATED]
[STRIPE_SYNC_START]
missing_connected_account
```

### Firestore

- Amostrar 5–10 `users` de teste: campo `stripeAccountId` presente  
- `orders` com `payoutStatus` — sem spike em `missing_connected_account` pós-teste de pedido (se houver pedido real)

### Stripe Dashboard

- Connect → contas: sem duplicatas por email de teste  
- Transfers (se pedido pago em staging): destino = `acct_` persistido

### Sentry / crashes

- Sem aumento em `ContaBancariaScreen` / onboarding

### Registo diário (template)

| Data/hora | Tester | Reopen OK | Logout OK | Firestore OK | Erros | Notas |
|-----------|--------|-----------|-----------|--------------|-------|-------|
| | | | | | | |

---

## PASSO 9 — Não evoluir durante 48h

- ❌ Semana 2 sync on focus  
- ❌ Carteira / ganhos / reports / IA  
- ❌ Merge para `main` / produção  

---

## PASSO 10 — Critérios de aprovação

Semana 1 **aprovada** somente se **todos**:

| Critério | ☐ |
|----------|---|
| Persistência consistente em Firestore | |
| Reconnect (reopen) sem segunda conta | |
| Logout/login preserva `stripeAccountId` | |
| Sem regressão onboarding Safari | |
| Sem regressão iOS (crash / freeze) | |
| Sem `[STRIPE_ACCOUNT_PERSIST_ERROR]` em testes | |
| Payout eligibility: webhook lê `stripeAccountId` em pedido de teste (opcional mas recomendado) | |

**Aprovação:** preencher data + responsável abaixo → então permitir PR merge para branch de integração (ainda não produção pública).

---

## PASSO 11 — Rollback

### Imediato (sem rebuild)

```env
EXPO_PUBLIC_ENABLE_STRIPE_ACCOUNT_PERSIST=false
```

Redistribuir build preview com flag off.

### Código

```bash
git revert c804ba0
# ou
git checkout finance-stable-v1 -- src/screens/ContaBancariaScreen.tsx src/config/env.ts
```

### Critérios de rollback automático

- `[STRIPE_ACCOUNT_PERSIST_ERROR]` permission-denied em massa  
- Segunda conta Stripe no reopen  
- Onboarding Safari quebrado  
- Crash rate ↑ em Conta Bancária  

---

## Após aprovação (não agora)

1. Merge `feature/persist-stripe-account-id` → `lab/stripe-isolation` (ou develop)  
2. Tag opcional: `finance-persist-v1`  
3. Produção: manter flag **off** até decisão explícita  
4. Iniciar **CPA Week 2** — sync on focus (branch nova)  

---

## Referências

- `docs/rollouts/FINANCE_ACTIVATION_ROADMAP.md`
- `docs/CONTROLLED_PROGRESSIVE_ACTIVATION.md`
- `docs/MVP_FINANCEIRO_PRODUTOR_AUDIT.md`

---

**Responsável validação:** _______________  
**Início 48h:** _______________  
**Fim 48h:** _______________  
**Resultado:** ☐ Aprovado ☐ Rollback ☐ Estender observação
