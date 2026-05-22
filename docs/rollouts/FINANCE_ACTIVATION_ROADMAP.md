# Rollout CPA — Financeiro Produtor

**Política:** `docs/CONTROLLED_PROGRESSIVE_ACTIVATION.md`  
**Baseline audit:** `docs/MVP_FINANCEIRO_PRODUTOR_AUDIT.md`  
**Stripe freeze:** `stripe-connect-stable-v1` — não alterar onboarding/return_url na mesma PR que persistência sem tag successor.

---

## Semana 0 — Baseline (sem feature nova)

| Ação | Tipo | Risco |
|------|------|-------|
| `git tag finance-stable-v1` | Tag | Nenhum |
| Commit audit docs (se pendente) | Docs | Nenhum |
| Remover ou disclaimer **R$ 850,00** em `ProdutorProfileScreen` | UX honesty | Baixo |
| Desbloquear menu “Carteira” **somente** com flag off + texto “Em construção” | UX | Baixo |

**Critério de saída:** zero valores monetários inventados visíveis ao produtor.

**Teste:** abrir perfil produtor → não ver receita falsa.

---

## Semana 1 — Persistência `stripeAccountId`

**Problema auditado:** conta Connect criada na API mas `users/{uid}.stripeAccountId` não gravado.

| Opção | Toca freeze? | Preferência CPA |
|-------|--------------|-----------------|
| A) Client `updateDoc` após `createConnectedAccount` | Não Functions | ✅ Primeira tentativa |
| B) Function `createConnectedAccount` grava Firestore | Sim | Tag `stripe-connect-stable-v2` |

**Flag:** `EXPO_PUBLIC_ENABLE_STRIPE_ACCOUNT_PERSIST=true` (preview/internal)

**Escopo único:** gravar `stripeAccountId` + opcional `stripeAccountCreatedAt`.

**Teste real:**

1. Produtor novo → Configurar conta → completar Stripe  
2. Firestore Console → `users/{uid}` tem `stripeAccountId: acct_*`  
3. Fechar app → reabrir → Conta Bancária não cria segunda conta  
4. “Atualizar status” → sync OK  

**Logs:** `[STRIPE_ACCOUNT_PERSISTED]`, Cloud Logging sync.

**Rollback:** revert 1 commit; flag false.

---

## Semana 2 — Sync automático (focus)

**Escopo:** `useFocusEffect` em `ContaBancariaScreen` → `syncStripeAccountStatus` se `stripeAccountId` presente (debounce 30s).

**Flag:** pode reutilizar `ENABLE_STRIPE_ACCOUNT_PERSIST` ou `ENABLE_FINANCIAL_REAL_DATA`.

**Não altera:** Safari, links, Functions Stripe congeladas.

**Teste:** voltar do Safari → status atualiza sem botão manual.

**Rollback:** remover hook; flag off.

---

## Semana 3 — Status Stripe honesto

**Escopo:**

- Exibir `chargesEnabled`, `stripeRequirementsDue` (se houver)  
- Copy alinhada ao estado real (não prometer repasse se `payoutsEnabled` false)

**Flag:** `EXPO_PUBLIC_ENABLE_FINANCIAL_REAL_DATA=true`

**Teste:** contas em pending / approved no Dashboard vs app.

---

## Semana 4 — Pedidos pagos reais (mínimo)

**Escopo:** tela ou secção “Últimos repasses” — query `orders` onde `producerId == uid` e `payoutStatus in ['paid','pending',...]`, mostrar `producerPayoutAmount`, data.

**Flag:** `EXPO_PUBLIC_ENABLE_PRODUCER_PAYOUTS_UI=true`

**Sem:** saldo Stripe Balance API ainda.

**Teste:** 1 pedido pago real end-to-end → valor aparece.

---

## Semana 5 — Próximo repasse / transfers

**Escopo:** listar `producerTransferId` + link conceitual “ver no Stripe Express” (deep link dashboard se disponível).

**Depende:** Semana 1 + webhook split funcionando.

**Teste:** Stripe Dashboard transfer id = Firestore `orders.producerTransferId`.

---

## Semana 6 — Reports (substituir mock)

**Escopo:** `ReportService` lê Firestore aggregates; remover arrays simulados.

**Flag:** `EXPO_PUBLIC_ENABLE_STRIPE_REPORTS=true`

**Pré-requisito:** desbloquear rota Reports em `ProdutorProfileScreen` na mesma PR.

---

## Semana 7+ — IA financeira (só com dados)

**Escopo:** card “Assistente” usa soma semanal real de `orders`, não R$ 850.

**Flag:** `EXPO_PUBLIC_ENABLE_FINANCIAL_AI=true`

**Proibido:** GPT inventar valores — só copy sobre números já calculados.

---

## Checklist por semana (copiar)

```
[ ] Tag/freeze documentado
[ ] Uma feature apenas
[ ] Flag default false em production profile
[ ] Teste iPhone
[ ] Stripe Dashboard conferido
[ ] Cloud Logging sem spike de erros
[ ] Regra Faria Lima: sem mock com flag on
[ ] Rollback path testado (revert ou flag)
[ ] PR template CPA preenchido
```

---

## Dependências externas (paralelo, tags separados)

| Item | Não bloquear Semana 1–3 se… |
|------|------------------------------|
| DNS `acucaradasencomendas.com.br` → Firebase | `web.app` return OK |
| Marketing pipeline HostGator | Independente |
| Universal links retorno app | Fase 2 Stripe doc |

---

## Métricas de sucesso (Faria Lima MVP)

| Métrica | Alvo |
|---------|------|
| Produtores com `stripeAccountId` no Firestore | 100% pós-onboarding |
| UI com valor monetário fake | 0 |
| Pedidos pagos com `payoutStatus=paid` visíveis ao produtor | ≥ 1 caso real validado |
| Crash rate pós-release financeiro | Sem aumento vs baseline |

---

**Próximo passo operacional:** criar tag `finance-stable-v1` no commit atual de docs + baseline UX (Semana 0).
