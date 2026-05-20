# PROJECT_CONTEXT — Açucaradas Encomendas

> **Memória arquitetural central** para agentes IA, playbooks e governança Cursor.
> Última atualização: 2026-05-20 | Baseline: `release-stable-1168`

---

## 1. Visão Geral

| Campo | Valor |
|-------|-------|
| **Projeto** | Açucaradas Encomendas |
| **Tipo** | Marketplace de encomendas (produtores, clientes, entregadores) |
| **Versão app** | 1.1.8 |
| **Branch principal** | `release-stable-1168` |
| **Pipeline principal** | 🚀 iOS PRODUCTION RELEASE (`/.github/workflows/ios-production.yml`) |
| **Firebase Project ID** | `acucaradas-encomendas` |
| **EAS Profile iOS** | `production_v13` |
| **Baseline tag** | `stable-baseline-ios` |

---

## 2. Stack Tecnológica

### Mobile
- **React Native** 0.76.9
- **Expo SDK** 52 (`expo ~52.0.49`)
- **Navegação**: React Navigation 7
- **UI**: React Native Paper
- **Pagamentos nativos**: `@stripe/stripe-react-native` 0.38.6 (compat layer em `src/compat/stripeReactNative.tsx`)

### Backend / Cloud
- **Firebase Auth** — autenticação de usuários
- **Firestore** — dados principais (`users`, `orders`, `products`, `producers`, etc.)
- **Firebase Functions** — Stripe Connect, splits, webhooks (`functions/index.js`)
- **Firebase Storage** — assets e uploads

### Integrações
- **Stripe Connect** — Express accounts, onboarding, payouts, payment splits
- **OneSignal** — push notifications
- **Sentry** — error tracking (`@sentry/react-native ~6.10.0`)

### CI/CD
- **GitHub Actions** — build local iOS em `macos-15`
- **EAS Build** — profile `production_v13`, modo `LOCAL`
- **TestFlight** — distribuição iOS
- **Node** 20 (fixo no pipeline)

---

## 3. Estrutura de Diretórios Relevante

```
AcucaradasEncomendas/
├── src/
│   ├── config/          # firebase.ts, env, sentry
│   ├── screens/         # ContaBancariaScreen (Stripe onboarding)
│   ├── services/        # PaymentService, StripeService, LoggingService
│   ├── contexts/        # AuthContext
│   └── navigation/      # AppNavigator
├── functions/           # Cloud Functions (Stripe, splits)
├── firestore.rules      # Security rules
├── .github/workflows/   # ios-production.yml
├── .agents/             # Agentes especializados IA
├── .playbooks/          # Runbooks operacionais
├── .docs/               # Documentação operacional Cursor
├── .architecture/       # Decisões arquiteturais
├── .cursor/rules/       # Regras persistentes Cursor
└── PROJECT_CONTEXT.md   # Este arquivo
```

---

## 4. Fluxos Críticos de Negócio

### 4.1 Stripe Connect Onboarding (Produtor/Entregador)

```
ContaBancariaScreen
  → GET users/{uid}           ← PONTO DE FALHA ATUAL
  → createConnectedAccount    (Cloud Function)
  → createStripeOnboardingLink (Cloud Function)
  → Linking.openURL(url)      (Stripe hosted onboarding)
  → syncStripeAccountStatus   (Cloud Function)
```

**Arquivos-chave:**
- `src/screens/ContaBancariaScreen.tsx`
- `functions/index.js` — `createConnectedAccount`, `createStripeOnboardingLink`, `syncStripeAccountStatus`

### 4.2 Pagamento com Split

```
PaymentService → StripeService → Cloud Functions (split produtor/entregador)
```

### 4.3 Autenticação

```
AuthContext → Firebase Auth → users/{uid} (Firestore profile sync)
```

---

## 5. Problema Ativo (P0)

### Sintoma
Stripe Connect onboarding **não abre corretamente** na tela `ContaBancariaScreen`.

### Erro Identificado
```
PERMISSION_DENIED — Firestore GET users/{uid}
```

### Causa Raiz Provável
1. Documento `users/{uid}` **não existe** no Firestore após signup
2. Regra `isOwner()` em `firestore.rules` exige `isNotBlocked()` que chama `getUserData()` — **recursão circular** se doc não existe
3. Usuário com `status: 'blocked'` recebe deny total
4. UID mismatch entre Auth e Firestore path

### Estratégia Atual
**Isolar Stripe** removendo dependência Firestore temporariamente no fluxo de onboarding:
- Cloud Functions já possuem fallback para criar `users/{uid}` via Admin SDK
- Cliente deve tolerar `accountData === null` e chamar Functions diretamente
- Pipeline tem `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS: "false"` como guard rail

### Logs de Diagnóstico Esperados
```
[BANK_FIRESTORE_OPERATION] getDoc users/{uid}
[FS_PERMISSION_DENIED] ContaBancariaScreen.loadAccountData
[FS_GUARD] users/{uid} missing, fallback to empty state
[STRIPE_ONBOARDING] Chamando createConnectedAccount...
```

---

## 6. Coleções Firestore Principais

| Coleção | Propósito | Regra de Leitura |
|---------|-----------|------------------|
| `users/{uid}` | Perfil, role, stripeAccountId | Owner ou Admin |
| `producers/{id}` | Cadastro de loja/produtor | Owner ou Admin |
| `products/{id}` | Catálogo | Público (read) |
| `orders/{id}` | Pedidos | Owner, Admin, Producer, Courier |
| `delivery_drivers/{id}` | Entregadores | Owner ou Admin |
| `payment_settings/{uid}` | Config pagamento | Owner |

---

## 7. Cloud Functions Stripe

| Function | Tipo | Descrição |
|----------|------|-----------|
| `createConnectedAccount` | onCall | Cria Express account + fallback doc users |
| `createStripeOnboardingLink` | onCall | Gera accountLink URL |
| `syncStripeAccountStatus` | onCall | Sincroniza status Stripe → Firestore |
| Webhooks Stripe | HTTP | Eventos de conta e pagamento |

---

## 8. Variáveis de Ambiente Críticas

| Variável | Escopo | Notas |
|----------|--------|-------|
| `EXPO_PUBLIC_FIREBASE_*` | Client | Config Firebase |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Chave pública Stripe |
| `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS` | Client | `"false"` no pipeline atual |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | Client | Push |
| `STRIPE_SECRET_KEY` | Functions | Secret Manager / env |
| `EXPO_TOKEN`, `APPLE_ID`, `EXPO_ASC_*` | CI | Secrets GitHub |

---

## 9. Governança IA

### Documentos de Referência
- `TRAE_RULES.md` — regras legadas Trae (baseline histórico)
- `.cursor/rules/project-rules.md` — regras persistentes Cursor
- `.docs/CURSOR_OPERATING_PROMPT.md` — prompt operacional padrão

### Agentes Especializados
| Agente | Arquivo | Domínio |
|--------|---------|---------|
| Architect | `.agents/architect.md` | Decisões, estabilidade |
| Firebase | `.agents/firebase.md` | Firestore, Functions, Rules |
| Stripe | `.agents/stripe.md` | Connect, onboarding, webhooks |
| Pipeline | `.agents/pipeline.md` | CI/CD, EAS, versionamento |
| Observability | `.agents/observability.md` | Logs, Sentry, tracing |

### Playbooks
- `.playbooks/stripe-debug.md`
- `.playbooks/firebase-permission-denied.md`

---

## 10. Restrições Absolutas para Agentes IA

**NUNCA sem aprovação explícita:**
- Alterar `package.json`, `app.json`, `eas.json`
- Upgrade Expo SDK ou React Native
- Rodar builds, deploys ou `npm install`
- Modificar secrets ou `.env` de produção
- Force push para `main` ou `release-stable-*`
- Alterar pipeline sem review do agente Pipeline

**SEMPRE:**
- Trabalhar em branch `lab/*` para código
- Máximo 3 arquivos por missão (regra de 3)
- Documentar risco e impacto antes de alterações
- Consultar playbook relevante antes de debug

---

## 11. Contatos e Escalation

| Nível | Ação |
|-------|------|
| P0 — App down / pagamentos | Architect + Firebase + Stripe agents |
| P1 — Build falhou | Pipeline agent |
| P2 — Logs/Sentry spike | Observability agent |
| P3 — Dúvida arquitetural | Architect agent |

---

## 12. Histórico de Decisões

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-04-22 | Baseline `stable-baseline-ios` | Estabilização iOS |
| 2026-05 | Firebase JS-only (lazy getters) | Evitar conflitos nativos iOS |
| 2026-05 | Isolar Stripe do Firestore client | PERMISSION_DENIED em onboarding |
| 2026-05 | `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS=false` | Guard rail produção |

---

*Este documento é a fonte de verdade para contexto IA. Atualize após cada decisão arquitetural significativa.*
