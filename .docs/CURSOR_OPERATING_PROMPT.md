# CURSOR OPERATING PROMPT — Açucaradas Encomendas

> **Prompt operacional padrão** para iniciar sessões Cursor neste projeto.
> Copie e cole no início de conversas complexas ou ao invocar agentes especializados.

---

## Prompt Base (Copiar)

```
Você está operando no projeto Açucaradas Encomendas — marketplace React Native/Firebase/Stripe.

CONTEXTO OBRIGATÓRIO (leia antes de agir):
- PROJECT_CONTEXT.md
- .cursor/rules/project-rules.md
- Agente relevante em .agents/
- Playbook relevante em .playbooks/

STACK: React Native 0.76.9 | Expo SDK 52 | Firebase | Stripe Connect | OneSignal | Sentry
BRANCH: release-stable-1168
PIPELINE: .github/workflows/ios-production.yml (profile production_v13)

PROBLEMA ATIVO (P0):
Stripe Connect onboarding não abre — PERMISSION_DENIED em GET users/{uid}.
Estratégia: isolar Stripe removendo dependência Firestore client-side.

RESTRIÇÕES ABSOLUTAS:
- NÃO alterar package.json, app.json, eas.json, workflows, Firebase config
- NÃO rodar builds, deploys, npm install
- NÃO fazer commits sem solicitação explícita
- Máximo 3 arquivos por missão (regra de 3)
- Branch lab/* para alterações de código

FORMATO DE RESPOSTA:
## Resumo | ## Risco | ## Arquivos Afetados | ## Próximos Passos | ## Logs a Monitorar

TAREFA ATUAL:
[DESCREVA A TAREFA AQUI]
```

---

## Prompts por Agente

### 🏛️ Architect
```
@architect — Avalie [PROPOSTA/DECISÃO] considerando estabilidade iOS, isolamento Stripe/Firestore,
e impacto no pipeline release-stable-1168. Consulte .agents/architect.md.
Formato: Architect Assessment com trade-offs e rollback.
```

### 🔥 Firebase
```
@firebase — Diagnostique PERMISSION_DENIED em [PATH] para uid [UID].
Consulte firestore.rules, .agents/firebase.md e .playbooks/firebase-permission-denied.md.
Inclua qual rule function causou DENY e correção recomendada (client vs rules vs function).
```

### 💳 Stripe
```
@stripe — Debug fluxo onboarding em ContaBancariaScreen.
Consulte .agents/stripe.md e .playbooks/stripe-debug.md.
Trace: loadAccountData → createConnectedAccount → createStripeOnboardingLink → Linking.openURL.
Identifique step de falha com logs esperados.
```

### 🚀 Pipeline
```
@pipeline — Analise [workflow run / build failure / release].
Consulte .agents/pipeline.md e .github/workflows/ios-production.yml.
Node 20 fixo. Profile production_v13. NÃO dispare build.
Forneça causa raiz, versão gerada e rollback.
```

### 📊 Observability
```
@observability — Correlacionar logs [PREFIXOS] com incidente [DESCRIÇÃO].
Consulte .agents/observability.md.
Mapeie timeline, Sentry issue, uid/path/build correlation.
Identifique gaps de logging.
```

---

## Prompts por Cenário

### Debug Stripe Onboarding
```
PROBLEMA: Stripe onboarding não abre na ContaBancariaScreen.

Siga .playbooks/stripe-debug.md passo a passo.
1. Verifique logs [FS_PERMISSION_DENIED] e [STRIPE_ONBOARDING]
2. Determine se accountData null bloqueia o fluxo
3. Proponha fix mínimo (regra de 3 arquivos) para isolar Stripe do Firestore GET
4. NÃO rode build. Documente risco.
```

### Debug Firestore Permission
```
PROBLEMA: PERMISSION_DENIED em GET users/{uid}.

Siga .playbooks/firebase-permission-denied.md.
1. Verifique se doc existe, status blocked, uid mismatch
2. Analise chain isOwner → isNotBlocked → getUserData
3. Compare client SDK vs Admin SDK behavior
4. Proponha fix sem enfraquecer rules
```

### Análise Pré-Release
```
PRE-RELEASE CHECK para branch release-stable-1168.

Consulte Pipeline agent checklist:
- validate-env.js
- EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS=false (intencional?)
- Build number sync
- Secrets intactos
NÃO dispare workflow. Apenas relatório go/no-go.
```

### Bootstrap / Contexto Only
```
MODO BOOTSTRAP: Apenas criar/editar arquivos .md de contexto IA.
PROIBIDO alterar código fonte, configs ou pipelines.
Pastas: .agents/, .playbooks/, .docs/, .architecture/, .cursor/rules/
```

---

## Hierarquia de Documentos

```
PROJECT_CONTEXT.md          ← memória central (ler primeiro)
    ├── .cursor/rules/project-rules.md   ← governança Cursor
    ├── TRAE_RULES.md                    ← governança legada Trae
    ├── .agents/
    │   ├── architect.md
    │   ├── firebase.md
    │   ├── stripe.md
    │   ├── pipeline.md
    │   └── observability.md
    ├── .playbooks/
    │   ├── stripe-debug.md
    │   └── firebase-permission-denied.md
    └── .architecture/                   ← ADRs futuras
```

---

## Checklist Pré-Ação (Agente)

Antes de qualquer alteração de código:

- [ ] Li PROJECT_CONTEXT.md?
- [ ] Consultei agente especializado?
- [ ] Existe playbook aplicável?
- [ ] Respeito regra de 3 arquivos?
- [ ] Branch será lab/*?
- [ ] Documentei risco e impacto?
- [ ] Não vou rodar build/deploy/install?
- [ ] Usuário pediu commit? (se não, não commitar)

---

## Prefixos de Log para Filtrar (Metro / Cloud)

```
[FS_PERMISSION_DENIED]     → Firestore deny
[FS_GUARD]                 → Fallback/guard client
[STRIPE_ONBOARDING]        → Fluxo Stripe UI
[STRIPE_ONBOARDING_START]  → Function createConnectedAccount
[STRIPE_ACCOUNT_CREATED]   → Express account OK
[STRIPE_FIRESTORE_UPDATED] → Sync server-side OK
[BANK_SCREEN_START]        → Tap botão onboarding
[FIRESTORE_PERMISSION_ERROR] → Debug alert
[FIREBASE]                 → Init SDK
```

---

## Escalation

| Severidade | Tempo | Ação |
|------------|-------|------|
| P0 — App/pagamentos down | Imediato | Architect + domínio afetado |
| P1 — Build falhou | < 1h | Pipeline agent |
| P2 — Logs spike | < 4h | Observability agent |
| P3 — Dúvida arquitetural | Best effort | Architect agent |

---

## Notas de Operação

1. **Dois sistemas de rules**: `TRAE_RULES.md` (legado Trae) + `.cursor/rules/project-rules.md` (Cursor). Em conflito, Cursor rules prevalecem para sessões Cursor.

2. **Guard rail Stripe**: Pipeline tem `EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS=false`. Não habilitar sem plano de QA.

3. **Firebase JS-only**: `src/config/firebase.ts` usa lazy getters. Não reintroduzir `@react-native-firebase/*`.

4. **Commits**: Apenas quando usuário solicitar explicitamente.

5. **Prova de sucesso**: Builds exigem logs + versão + artefato — nunca "missão cumprida" sem evidência.

---

*Documento operacional v1.0.0 — Açucaradas Encomendas Enterprise Bootstrap*
