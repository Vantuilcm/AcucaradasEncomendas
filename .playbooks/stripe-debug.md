# Playbook: Stripe Connect Debug

> **Severidade**: P0  
> **Agentes**: Stripe (primário), Firebase (secundário), Observability  
> **Tela afetada**: `ContaBancariaScreen`  
> **Última revisão**: 2026-05-20

---

## 1. Sintomas

| Sintoma | Descrição |
|---------|-----------|
| Onboarding não abre | Botão "Configurar conta" não abre browser/Stripe |
| Alert bloqueante | "Sua conta ainda não foi completamente configurada..." |
| Loading infinito | Spinner após tap, sem redirect |
| Link abre e fecha | Stripe URL abre mas retorna erro |
| Sync falha | Status não atualiza após completar onboarding |

---

## 2. Causas Conhecidas

### C1 — Firestore PERMISSION_DENIED (Ativo)
- **Causa**: GET `users/{uid}` negado → `accountData = null` → gate aborta fluxo
- **Evidência**: `[FS_PERMISSION_DENIED] ContaBancariaScreen.loadAccountData`
- **Fix**: Isolar Stripe — chamar `createConnectedAccount` sem depender de accountData

### C2 — Documento users/{uid} inexistente
- **Causa**: Signup não cria doc Firestore
- **Evidência**: `[FS_GUARD] users/{uid} missing`
- **Fix**: Function fallback `userRef.set()` ou Auth onCreate trigger

### C3 — stripeAccountId inválido
- **Causa**: Conta Stripe deletada ou ID corrompido
- **Evidência**: Stripe API 404 em `accountLinks.create`
- **Fix**: Criar nova Express account via `createConnectedAccount`

### C4 — URLs refresh/return inválidas
- **Causa**: HTTP ou domínio não registrado no Stripe Dashboard
- **Evidência**: Stripe error "Invalid URL"
- **Fix**: Usar HTTPS válidas (`https://acucaradas.com/reauth`, `/success`)

### C5 — Feature flag desabilitada
- **Causa**: `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS=false`
- **Evidência**: Pagamentos desabilitados em prod (intencional)
- **Fix**: Habilitar apenas após onboarding estável + QA

### C6 — Auth UID mismatch
- **Causa**: `(user.uid)` vs `(user.id)` inconsistente
- **Evidência**: path `users/undefined` ou uid diferente do Auth
- **Fix**: Normalizar uid extraction no AuthContext

---

## 3. Validações (Ordem de Execução)

### Step 1 — Confirmar Auth
```
□ Usuário logado (AuthContext.user não null)
□ uid extraído: user.uid || user.id
□ uid !== undefined && uid.length > 10
```

**Log esperado**: nenhum `[FS_GUARD] uid não encontrado`

### Step 2 — Testar Firestore GET
```
□ Metro log: [BANK_FIRESTORE_OPERATION] getDoc users/{uid}
□ Resultado: exists=true OU permission-denied
```

**Se permission-denied** → ir para Playbook `firebase-permission-denied.md`

### Step 3 — Testar createConnectedAccount
```
□ Log: [STRIPE_ONBOARDING] Chamando createConnectedAccount
□ Function retorna: { accountId: "acct_..." }
□ Function log: [STRIPE_ACCOUNT_CREATED]
```

**Comando Functions log**:
```bash
firebase functions:log --only createConnectedAccount --limit 20
```

### Step 4 — Testar createStripeOnboardingLink
```
□ Input: accountId válido (acct_*)
□ Retorno: { url: "https://connect.stripe.com/..." }
□ Log: [STRIPE_ONBOARDING] Abrindo link seguro do Stripe
```

### Step 5 — Testar Linking
```
□ Linking.openURL(url) retorna true
□ Browser/Safari abre Stripe hosted onboarding
```

### Step 6 — Testar syncStripeAccountStatus
```
□ Após return_url, chamar sync
□ Log: [STRIPE_FIRESTORE_UPDATED] success: true
□ Campos: chargesEnabled, payoutsEnabled, detailsSubmitted
```

---

## 4. Comandos de Diagnóstico

```bash
# App — buscar fluxo completo
grep -n "handleStartOnboarding\|STRIPE_ONBOARDING\|FS_GUARD\|FS_PERMISSION" \
  src/screens/ContaBancariaScreen.tsx

# Functions — exports Stripe
grep -n "exports\.\(createConnectedAccount\|createStripeOnboardingLink\|syncStripeAccountStatus\)" \
  functions/index.js

# Logs produção Functions
firebase functions:log --only createConnectedAccount,syncStripeAccountStatus --limit 50

# Stripe CLI — verificar conta (substituir acct_XXX)
stripe accounts retrieve acct_XXXXX

# Stripe CLI — simular account link
stripe account_links create \
  --account acct_XXXXX \
  --refresh-url https://acucaradas.com/reauth \
  --return-url https://acucaradas.com/success \
  --type account_onboarding

# Verificar feature flag no pipeline
grep "ENABLE_STRIPE" .github/workflows/ios-production.yml
```

---

## 5. Rollback

### Rollback App (client)
```bash
git checkout release-stable-1168 -- src/screens/ContaBancariaScreen.tsx
```

### Rollback Functions
```bash
git checkout release-stable-1168 -- functions/index.js
firebase deploy --only functions:createConnectedAccount,functions:createStripeOnboardingLink
# ⚠️ Requer aprovação explícita — não executar automaticamente
```

### Rollback Stripe (conta duplicada)
1. Identificar conta correta no Stripe Dashboard
2. Atualizar `stripeAccountId` manualmente via Admin SDK ou Console Firebase
3. Deletar conta orphan no Stripe Dashboard (se necessário)

### Rollback Feature Flag
```yaml
# .github/workflows/ios-production.yml
EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS: "false"  # manter false até estável
```

---

## 6. Logs Esperados (Fluxo Saudável)

```
[BANK_SCREEN_START]
[STRIPE_ONBOARDING] Chamando createConnectedAccount para UID: abc123
[STRIPE_ONBOARDING] Conta criada: acct_1XXXX
[STRIPE_ONBOARDING] Chamando createStripeOnboardingLink...
[STRIPE_ONBOARDING] Link recebido com sucesso
[STRIPE_ONBOARDING] Abrindo link seguro do Stripe...
```

### Functions (Cloud Logging)
```
[STRIPE_ONBOARDING_START] { uid, email, role, build: '1294' }
[STRIPE_USER_DOC_FOUND] { uid, exists: true, hasData: 5 }
[STRIPE_ACCOUNT_CREATED] { uid, stripeAccountId: 'acct_...' }
[STRIPE_FIRESTORE_UPDATED] { uid, path: 'users/abc123', success: true }
```

---

## 7. Logs Críticos (Alertar Imediato)

| Log | Severidade | Ação |
|-----|------------|------|
| `[FS_PERMISSION_DENIED]` | 🔴 High | Playbook firebase-permission-denied |
| `[FS_GUARD] accountData é null` + abort | 🔴 High | Remover gate — isolar Stripe |
| `[STRIPE_ONBOARDING_ERROR]` | 🔴 High | Verificar Stripe API + secrets |
| `[STRIPE_FIRESTORE_UPDATE_ERROR]` | 🟡 Medium | Admin SDK IAM — raro |
| `[SENTRY_MISSING]` | 🟡 Medium | Instalar @sentry/node em functions |
| `Falha ao criar conta conectada` | 🔴 High | Function internal error — check logs |
| Stripe 401/403 | 🔴 Critical | Rotacionar STRIPE_SECRET_KEY |

---

## 8. Árvore de Decisão

```
Onboarding falhou?
├── Auth ok?
│   ├── Não → logout/login, verificar AuthContext
│   └── Sim ↓
├── GET users/{uid} ok?
│   ├── permission-denied → firebase-permission-denied playbook
│   ├── doc missing → Function fallback (createConnectedAccount)
│   └── ok ↓
├── stripeAccountId existe?
│   ├── Não → createConnectedAccount
│   └── Sim ↓
├── createStripeOnboardingLink ok?
│   ├── Não → verificar accountId + URLs
│   └── Sim ↓
├── Linking.openURL ok?
│   ├── Não → permissão iOS / URL scheme
│   └── Sim → onboarding deve abrir ✅
```

---

## 9. Pós-Resolução

```
□ Fluxo completo testado em device físico
□ syncStripeAccountStatus atualiza Firestore
□ Sentry sem spike FS_PERMISSION_DENIED
□ Documentar fix em PROJECT_CONTEXT.md
□ Considerar habilitar EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS
□ ADR em .architecture/decisions/ se mudança permanente
```

---

## Referências

- `.agents/stripe.md`
- `.agents/firebase.md`
- `.playbooks/firebase-permission-denied.md`
- `src/screens/ContaBancariaScreen.tsx`
- `functions/index.js`
