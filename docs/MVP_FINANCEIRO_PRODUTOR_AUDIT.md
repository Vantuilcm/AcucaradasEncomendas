# Auditoria MVP Financeiro — Produtor · Carteira · Ganhos · Stripe

**Data:** 2026-05-22  
**Tipo:** Read-only · evidências no repositório + DNS/hosting conhecido  
**Freeze respeitado:** nenhuma alteração em Stripe, Firebase prod, app, rules, pipelines.

**Relacionado:** `docs/STRIPE_CONNECT_FREEZE.md` · `docs/HOSTING_DOMAIN_AUDIT.md`

---

## 1. Resumo executivo

O produtor **consegue concluir onboarding Stripe Connect** (conta Express, Safari, link hosted), mas a **percepção financeira premium (Faria Lima) não está suportada por dados reais** na maior parte da UI.

| Camada | Veredito |
|--------|----------|
| Onboarding Connect (Safari) | ✅ **Real** (Functions + UI) |
| Status Connect no app | ⚠️ **Parcial** (depende de Firestore + sync manual) |
| Carteira / saldo / ganhos na UI | ❌ **Mock ou bloqueado** |
| Repasse automático produtor | ⚠️ **Backend existe**, depende de `stripeAccountId` em `users/{uid}` |
| Relatórios “Carteira e Ganhos” | ❌ **Mock** + menu bloqueado |

**Gap crítico descoberto:** `createConnectedAccount` **não persiste** `stripeAccountId` no Firestore (modo `firestore-isolated` build 1295). O cliente **também não grava** o `accountId` retornado. O webhook de split lê `users/{producerId}.stripeAccountId` — se vazio, repasse fica `missing_connected_account`.

---

## 2. PASSO 1 — Telas financeiras

| Tela / entrada | Rota | Estado | Evidência |
|----------------|------|--------|-----------|
| **ContaBancariaScreen** | `ContaBancaria` | ✅ Funcional real (onboarding + sync) | `src/screens/ContaBancariaScreen.tsx` |
| **ProdutorProfileScreen** — Conta Bancária | → `ContaBancaria` | ✅ Navegação liberada | `handleMenuPress` exceção |
| **ProdutorProfileScreen** — Carteira e Ganhos | `Reports` | ❌ **Bloqueado** (“Em breve”) | `route === 'Reports'` → Alert |
| **ProdutorProfileScreen** — card IA “R$ 850” | — | ❌ **Hardcoded** | linha 91: `R$ 850,00` fixo |
| **ProdutorProfileScreen** — Documentação | `""` | ❌ Placeholder / vazio | Alert ou sem rota |
| **ReportsScreen** | `Reports` (stack) | ⚠️ UI existe, **dados 100% mock** | `ReportService.ts` “Dados simulados” |
| **PlaceholderScreen** | `DriverEarnings`, etc. | ❌ Placeholder | Entregador |
| **DriverHomeScreen** — ganhos | — | ⚠️ Parcial | `totalEarnings` real? + “Calculando…” fixo |
| **EntregadorProfileScreen** | → `ContaBancaria` | ✅ Mesma tela recebimentos | |
| **ContaScreen** | — | ❌ **Não existe** no `src/screens` | — |

### ContaBancariaScreen — o que é real

| Feature | Estado |
|---------|--------|
| `loadAccountData()` → `users/{uid}` | ✅ Real |
| `createConnectedAccount` | ✅ Real (Stripe API) |
| `createStripeOnboardingLink` | ✅ Real (URLs fixas Functions) |
| `Linking.openURL` Safari | ✅ Real |
| `syncStripeAccountStatus` | ✅ Real (`accounts.retrieve` + update Firestore) |
| Status UI (`payoutsEnabled`, `detailsSubmitted`) | ✅ Real **se** campos existirem no doc |
| Saldo / extrato / histórico repasses | ❌ Inexistente na tela |

**Nota:** Cliente envia `refreshUrl`/`returnUrl` alternativos (`acucaradas.com`) na chamada do link — **ignorados** pela Function (usa URLs congeladas `.com.br`). Comportamento correto no backend; parâmetros client são dead code.

---

## 3. PASSO 2 — Firestore `users/{uid}`

### Campos esperados na auditoria vs código

| Campo (auditoria) | Existe no código? | Quem escreve? | Lido na UI? |
|-------------------|-------------------|---------------|-------------|
| `stripeAccountId` | ✅ Esperado | ❌ **Ninguém persiste** (gap) | ContaBancaria, webhook |
| `stripeConnected` | ❌ Não usado | — | — |
| `payoutsEnabled` | ✅ | `syncStripeAccountStatus` | ContaBancaria |
| `chargesEnabled` | ✅ | `syncStripeAccountStatus` | ❌ Não exibido |
| `onboardingComplete` | ❌ | — | — |
| `detailsSubmitted` | ✅ | sync | ContaBancaria |
| `accountStatus` | ❌ | — | — |
| `stripeOnboardingStatus` | ✅ | sync (`started`/`pending`/`approved`) | ❌ Não exibido diretamente |
| `stripeRequirementsDue` | ✅ | sync | ❌ Não exibido |
| `stripeLastSyncAt` | ✅ | sync | ❌ Não exibido |
| `estimatedBalance` | ❌ | — | — |
| `estimatedWeeklyRevenue` | ❌ | — | — |

### Evidência `stripeAccountId`

```javascript
// functions/index.js — createConnectedAccount (build 1295)
return { accountId: account.id };  // sem userRef.update

// src/screens/ContaBancariaScreen.tsx
currentAccountId = data.accountId;  // só em memória na sessão
// ausência de f.updateDoc(..., { stripeAccountId })
```

**Implicação:** produtor pode completar Stripe no Safari, mas **sync e repasses** podem falhar na visita seguinte se `stripeAccountId` nunca foi gravado (manual/admin ou legado).

---

## 4. PASSO 3 — Cloud Functions

| Function | Existe | Real? | Notas |
|----------|--------|-------|-------|
| `createConnectedAccount` | ✅ | ✅ Stripe `accounts.create` | Sem write Firestore |
| `createStripeOnboardingLink` | ✅ | ✅ `accountLinks.create` | return/refresh URLs fixas |
| `syncStripeAccountStatus` | ✅ | ✅ `stripe.accounts.retrieve` | Update `users/{uid}` |
| `stripeWebhook` | ✅ | ✅ `payment_intent.succeeded` + transfers | Split 90% produtor |
| `onOrderDelivered` | ✅ | ✅ Repasse entregador | Trigger Firestore |
| `createPaymentIntent` | ✅ | ✅ | `transfer_group` |
| `executePaymentSplit` | ✅ | Admin only | Alternativa manual |
| Consulta saldo Stripe Balance API | ❌ | — | Não implementado |
| Webhook `account.updated` | ❌ | — | Sync automático pós-onboarding ausente |

### Webhook vs onboarding

- Onboarding **não** dispara sync automático ao voltar ao app (sem deep link handler, sem `account.updated` webhook handler documentado).
- Sync é **manual** (“Já preenchi, atualizar status”) e exige `stripeAccountId` no documento.

---

## 5. PASSO 4 — Componentes UI mock

| UI | Valor | Tipo | Ficheiro |
|----|-------|------|----------|
| “R$ 850,00” estimativa semanal | Fixo | ❌ Hardcoded | `ProdutorProfileScreen.tsx:91` |
| “Carteira e Ganhos” | Alert “Em breve” | ❌ Bloqueado | `ProdutorProfileScreen.tsx:24-26` |
| Reports semana `R$ 8.450,75` | Mock | ❌ Simulado | `ReportService.ts:54-58` |
| Gráficos / top produtos | Mock | ❌ delay + arrays fixos | `ReportService.ts` |
| “Calculando…” ganhos sem. entregador | Placeholder | ❌ | `DriverHomeScreen.tsx:212-218` |
| ContaBancaria “repasses automáticos” | Copy | ⚠️ Verdadeiro **só se** split + `stripeAccountId` OK | |

**Conclusão UX:** a desconfiança do produtor é **coerente com o código** — a única área financeira honesta é **Recebimentos (Stripe status)**; o resto transmite receita fictícia.

---

## 6. PASSO 5 — Fluxo produtor ponta a ponta

| Etapa | Estado | Notas |
|-------|--------|-------|
| Cadastro / login | ✅ | Auth + `users/{uid}` |
| Onboarding Stripe | ✅ | Safari + Connect |
| Persistência `stripeAccountId` | ❌ | Gap crítico |
| Sync status pós-onboarding | ⚠️ | Manual; pode falhar sem accountId |
| Loja / produtos | ✅ | `ProductManagement`, `StorePreview` |
| Pedido comprador | ✅ | Orders flow |
| Pagamento checkout | ⚠️ | `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS === 'true'` |
| Webhook confirma pagamento | ✅ | Functions |
| Repasse 90% produtor | ⚠️ | Real se `stripeAccountId` + PI metadata |
| Repasse entregador | ⚠️ | `onOrderDelivered` |
| Carteira / ganhos / histórico | ❌ | Mock ou bloqueado |
| Payout tracking UI | ❌ | Sem tela |
| Saldo Stripe real na app | ❌ | Sem Balance API |

---

## 7. PASSO 6 — Matriz executiva

| Área | Estado | Risco | Evidência |
|------|--------|-------|-----------|
| Stripe onboarding | ✅ Real | Baixo | Functions + ContaBancaria |
| Conta Connect criada (API) | ✅ Real | Baixo | `accounts.create` |
| `stripeAccountId` em Firestore | ❌ Ausente no pipeline | **Alto** | Sem write client/server |
| Status payouts/charges (UI) | ⚠️ Parcial | Médio | Sync manual |
| Ganhos reais na UI | ❌ Mock / bloqueado | **Alto** | R$ 850, ReportService |
| Carteira real | ❌ Inexistente | **Alto** | Menu bloqueado |
| Payout tracking (UI) | ❌ Inexistente | **Alto** | — |
| Saldo estimado | ❌ Fake (850) | **Alto** | Hardcoded |
| Repasse produtor (backend) | ⚠️ Parcial | **Alto** | Webhook + stripeAccountId |
| Relatórios vendas | ❌ Mock | Médio | ReportService |
| Pagamentos app em prod | ⚠️ Flag env | Médio | `ENABLE_STRIPE` |
| Domínio stripe-success | ⚠️ Infra | Médio | HostGator vs Firebase |

---

## 8. PASSO 7 — MVP Faria Lima (objetivo)

### Obrigatório antes de lançamento premium SP

1. **Persistir `stripeAccountId`** em `users/{uid}` após `createConnectedAccount` (Function ou client seguro) — sem quebrar freeze: novo tag + teste.
2. **Remover ou substituir** copy `R$ 850,00` por dado real ou remover card até existir dado.
3. **Desbloquear “Carteira e Ganhos”** só quando backend existir — ou renomear para “Relatórios (beta)” com disclaimer.
4. **Sync automático** após onboarding (mínimo: `useFocusEffect` + sync na ContaBancaria) — Fase 2 freeze.
5. **Painel mínimo real:** disponível para receber (já existe) + **total repassado** (agregar `orders` onde `producerPayoutAmount` + `payoutStatus=paid`).
6. **Validar** `stripeAccountId` antes de aceitar pedidos pagos (gate produtor).
7. **Hosting:** `return_url` a resolver página correta (domínio → Firebase ou redirect).

### Importante (pós-MVP imediato)

- Balance / próximo payout via Stripe API (read-only).
- Lista de transfers / `producerTransferId` por pedido.
- `account.updated` webhook → sync silencioso.
- ReportsScreen ligado a Firestore/aggregates (não mock).
- Documentação produtor (CPF/CNPJ) — rota real.

### Pós-MVP

- Universal links retorno onboarding.
- Previsão IA de receita (modelo, não hardcode).
- Export CSV, gráficos premium, franquias.

---

## 9. Por que o produtor “já conectou” mas não confia

| Percepção | Realidade no código |
|-----------|-------------------|
| “Concluí Stripe” | ✅ Stripe hosted flow funciona |
| “Conta aprovada” | ⚠️ Só após sync manual e campos no Firestore |
| “Vou receber X esta semana” | ❌ R$ 850 é texto fixo |
| “Carteira e histórico” | ❌ Menu não abre Reports; Reports é fake |
| “Repasses automáticos” | ⚠️ Backend sim, se `stripeAccountId` existir no pedido |

---

## 10. PASSO 8 — Não implementado nesta auditoria

- Nenhuma correção de código
- Nenhuma alteração Stripe / Firebase / rules

---

## 11. Referências de ficheiro (auditoria)

| Artefato | Path |
|----------|------|
| Recebimentos UI | `src/screens/ContaBancariaScreen.tsx` |
| Perfil produtor + mock 850 | `src/screens/ProdutorProfileScreen.tsx` |
| Relatórios mock | `src/services/ReportService.ts`, `src/screens/ReportsScreen.tsx` |
| Functions Stripe | `functions/index.js` (L995–1202, L467–667, L840+) |
| Placeholder entregador | `src/screens/PlaceholderScreen.tsx` |
| Freeze política | `docs/STRIPE_CONNECT_FREEZE.md` |

---

**Assinatura auditoria:** estado real = **onboarding forte, carteira/ganhos fracos, persistência accountId crítica, UX premium não suportada por dados.**
