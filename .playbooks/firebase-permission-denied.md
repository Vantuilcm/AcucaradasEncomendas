# Playbook: Firebase PERMISSION_DENIED

> **Severidade**: P0  
> **Agentes**: Firebase (primário), Architect (secundário), Observability  
> **Erro típico**: `FirebaseError: Missing or insufficient permissions` / code `permission-denied`  
> **Path mais afetado**: `users/{uid}`  
> **Última revisão**: 2026-05-20

---

## 1. Sintomas

| Sintoma | Descrição |
|---------|-----------|
| Alert Firestore Debug | Popup com PATH, CODE, MSG na tela |
| Dados não carregam | Tela vazia ou estado fallback |
| Onboarding Stripe bloqueado | accountData null após loadAccountData |
| Console Metro | `[FS_PERMISSION_DENIED]` ou `[FIRESTORE_PERMISSION_ERROR]` |
| Functions OK, client FAIL | Admin SDK funciona, app SDK nega |

---

## 2. Causas

### C1 — Documento users/{uid} não existe (Mais Comum)
```
Client: GET users/{uid}
Rules: isOwner() → isNotBlocked() → getUserData()
getUserData(): get(/users/{auth.uid}) → DOC NOT FOUND → DENY
```

### C2 — Usuário bloqueado
```javascript
// firestore.rules
function isNotBlocked() {
  return !isAuthenticated() || getUserData().status != 'blocked';
}
// status === 'blocked' → DENY total
```

### C3 — UID mismatch
```javascript
// App usa path errado
f.doc('users', undefined)  // uid não resolvido
f.doc('users', wrongUid)   // uid != request.auth.uid
```

### C4 — Auth token expirado / não propagado
```
request.auth == null → isAuthenticated() false → DENY
```

### C5 — Tentativa de alterar campo protegido
```javascript
// firestore.rules:116
allow update: if (isOwner(userId) && !diff.affectedKeys().hasAny(['role', 'status', 'riskScore'])) || isAdmin();
// User tenta alterar role → DENY
```

### C6 — Recursão em helper functions
```
isAdmin() → getUserData() → get users/{uid}
Se doc não existe, isAdmin() também falha
```

---

## 3. Validações

### V1 — Verificar Auth State
```javascript
// Esperado no Metro
console.log('[DEBUG] auth.uid:', user.uid);
console.log('[DEBUG] auth.email:', user.email);
```
```
□ user.uid definido e string não-vazia
□ user.uid === path userId em users/{userId}
```

### V2 — Verificar existência do documento (Admin)
```bash
# Firebase Console → Firestore → users → {uid}
# OU via Functions log:
firebase functions:log --only createConnectedAccount --limit 10
# Buscar: [STRIPE_USER_DOC_FOUND] { exists: true/false }
```

### V3 — Verificar status do documento
```
□ status !== 'blocked'
□ status !== 'suspicious' (para ações críticas)
□ role definido (producer, produtor, admin, courier, entregador)
```

### V4 — Verificar rules aplicadas
```bash
# Ler regra users
grep -A10 "match /users" firestore.rules

# Verificar isOwner chain
grep -n "isOwner\|isNotBlocked\|getUserData" firestore.rules
```

### V5 — Verificar client SDK init
```
□ [FIREBASE] Initializing App Instance... aparece no boot
□ firebaseConfig.projectId === "acucaradas-encomendas"
□ Sem erro de API key inválida
```

### V6 — Simular cenário no Rules Playground (Firebase Console)
```
Operation: get
Path: /users/{seu-uid-real}
Auth: uid = {seu-uid-real}
Resultado esperado: ALLOW (se doc existe e não blocked)
```

---

## 4. Comandos

```bash
# Buscar todos os PERMISSION_DENIED no app
grep -rn "permission-denied\|PERMISSION_DENIED\|FS_PERMISSION" src/

# ContaBancariaScreen — ponto de falha atual
grep -n "getDoc\|FS_GUARD\|FS_PERMISSION\|showFirestoreDebug" \
  src/screens/ContaBancariaScreen.tsx

# Rules — funções auxiliares
grep -n "function is" firestore.rules

# Functions — fallback doc creation
grep -n "userRef.set\|userRef.update\|STRIPE_USER_DOC" functions/index.js

# AuthContext — uid source
grep -n "uid\|\.id" src/contexts/AuthContext.tsx 2>/dev/null || \
grep -rn "AuthContext" src/contexts/ src/hooks/useAuth.ts

# Deploy rules (⚠️ requer aprovação)
# firebase deploy --only firestore:rules
```

---

## 5. Correções por Cenário

### C1 Fix — Doc não existe

**Opção A (Recomendada — Server-side)**:
Function `createConnectedAccount` já faz fallback:
```javascript
await userRef.set({ uid, email, role, stripeAccountId: null, ... }, { merge: true });
```

**Opção B (Client-side — Auth trigger futuro)**:
Criar Cloud Function `onAuthUserCreate` para auto-criar doc.

**Opção C (Client-side — imediato)**:
```javascript
// No signup flow, após Auth.createUserWithEmailAndPassword:
await setDoc(doc(db, 'users', uid), { uid, email, role: 'customer', createdAt: serverTimestamp() });
```

### C2 Fix — Usuário blocked
```
1. Admin verifica users/{uid}.status no Console
2. Se blocked indevido → admin update status para 'active'
3. Se blocked correto → informar usuário, não alterar rules
```

### C3 Fix — UID mismatch
```javascript
// Padronizar em todo o app:
const uid = user?.uid;
if (!uid) throw new Error('UID inválido');
// Remover fallback (user as any).id se inconsistente
```

### C4 Fix — Auth expirado
```
1. Force refresh: auth.currentUser.getIdToken(true)
2. Logout + login
3. Verificar persistência AsyncStorage auth
```

### C5 Fix — Campo protegido
```
// Apenas admin pode alterar role/status/riskScore
// Client deve usar updateDoc apenas com campos permitidos
```

---

## 6. Rollback

### Rollback Rules
```bash
git checkout release-stable-1168 -- firestore.rules
# firebase deploy --only firestore:rules  # ⚠️ aprovação necessária
```

### Rollback Client Debug
```bash
git checkout release-stable-1168 -- src/screens/ContaBancariaScreen.tsx
```

### Rollback — Nunca fazer
```
❌ allow read: if true  em users/{uid}  — expõe PII
❌ Remover isNotBlocked() — bypassa security
❌ Desabilitar rules temporariamente
```

---

## 7. Logs Esperados

### Falha (atual)
```
[BANK_FIRESTORE_OPERATION] getDoc users/abc123xyz
[FS_PERMISSION_DENIED] ContaBancariaScreen.loadAccountData {
  uid: 'abc123xyz',
  path: 'users/abc123xyz',
  code: 'permission-denied',
  message: 'Missing or insufficient permissions.'
}
[FIRESTORE_PERMISSION_ERROR] { path: 'users/abc123xyz', code: 'permission-denied' }
[FS_GUARD] users/{uid} missing, fallback to empty state
```

### Sucesso (pós-fix)
```
[BANK_FIRESTORE_OPERATION] getDoc users/abc123xyz
// Sem FS_PERMISSION_DENIED
// accountData populado com { role, stripeAccountId, ... }
```

### Function fallback (server-side OK)
```
[STRIPE_USER_DOC_FOUND] { uid: 'abc123xyz', exists: false }
[STRIPE_USER_DOC_CREATED_FALLBACK] { uid: 'abc123xyz' }
[STRIPE_FIRESTORE_UPDATED] { success: true }
```

---

## 8. Logs Críticos

| Log | Significado | Ação |
|-----|-------------|------|
| `permission-denied` + path `users/` | Rules deny read/write | Este playbook |
| `getUserData()` implicit fail | Doc users não existe | Criar doc |
| `status != 'blocked'` fail | Conta bloqueada | Admin review |
| `affectedKeys hasAny role` | Tentativa elevar privilégio | Investigar segurança |
| Admin SDK `permission-denied` | IAM Service Account | Firebase Console IAM |
| `PERMISSION_DENIED: Missing Cloud Functions` | IAM invoker | Cloud Functions permissions |

---

## 9. Árvore de Decisão

```
PERMISSION_DENIED em users/{uid}?
├── Auth.uid definido?
│   ├── Não → fix AuthContext
│   └── Sim ↓
├── Doc existe no Console?
│   ├── Não → createConnectedAccount fallback OU signup setDoc
│   └── Sim ↓
├── status === 'blocked'?
│   ├── Sim → admin unblock ou informar user
│   └── Não ↓
├── auth.uid === path userId?
│   ├── Não → fix uid extraction
│   └── Sim ↓
├── Operation = update com role/status?
│   ├── Sim → usar admin ou remover campo
│   └── Não ↓
└── Rules playground ALLOW?
    ├── Não → revisar rules (Firebase agent)
    └── Sim → client SDK init issue (firebase.ts)
```

---

## 10. Prevenção (Longo Prazo)

```
□ Auth onCreate trigger → auto-create users/{uid}
□ Remover dependência client GET antes de Stripe onboarding
□ Normalizar uid (apenas user.uid, sem .id fallback)
□ Teste E2E: signup → users doc exists → ContaBancariaScreen loads
□ Rules unit tests no Firebase Emulator
□ Monitor Sentry: alert em FS_PERMISSION_DENIED > 10/h
```

---

## Referências

- `firestore.rules` — linhas 110-118 (users)
- `src/screens/ContaBancariaScreen.tsx`
- `src/config/firebase.ts`
- `functions/index.js` — Admin SDK fallbacks
- `.agents/firebase.md`
- `.playbooks/stripe-debug.md`
