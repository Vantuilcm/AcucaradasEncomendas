# Regras Persistentes — Açucaradas Encomendas

> Aplicam-se a **todos** os agentes Cursor neste repositório.
> Complementam `TRAE_RULES.md` e `PROJECT_CONTEXT.md`.

---

## 1. Proibições Absolutas

### Builds e Deploy
- **PROIBIDO** rodar `eas build`, `eas submit`, `expo prebuild` ou qualquer build sem solicitação explícita do usuário
- **PROIBIDO** disparar GitHub Actions (`workflow_dispatch`) automaticamente
- **PROIBIDO** fazer deploy de Firebase Functions, Firestore Rules ou Hosting sem aprovação
- **PROIBIDO** submeter para TestFlight ou Play Store

### Dependências e Upgrades
- **PROIBIDO** alterar `package.json`, `package-lock.json`, `functions/package.json`
- **PROIBIDO** upgrade automático de Expo SDK, React Native ou qualquer major dependency
- **PROIBIDO** `npm install`, `pnpm install`, `yarn add` sem solicitação explícita
- **PROIBIDO** alterar `app.json`, `app.config.js`, `eas.json`

### Infraestrutura
- **PROIBIDO** modificar `.github/workflows/*` sem agente Pipeline
- **PROIBIDO** alterar `firestore.rules`, `firestore.indexes.json` sem agente Firebase
- **PROIBIDO** expor ou commitar secrets (`.env`, chaves Stripe, ASC keys)
- **PROIBIDO** force push para `main`, `master`, `release-stable-*`, `prod-release-*`

---

## 2. Governança de Código

### Escopo
- **Regra de 3**: máximo 3 arquivos alterados por missão, salvo refactor explícito
- **Isolamento de domínio**: nunca misturar (App + Pipeline), (Auth + Navegação), (Firebase + UI) na mesma missão
- **Branch obrigatória**: alterações de código em `lab/*`, nunca direto em release branches

### Qualidade
- Proibido refactor estético — se funciona, não altere sem pedido
- Manter `BootDiagnosticScreen` e Error Boundaries intactos
- Preservar logs estruturados existentes (`[FS_*]`, `[STRIPE_*]`, `[BANK_*]`)
- Não remover fallbacks de segurança sem substituto validado

### Commits
- **NUNCA** commitar automaticamente — apenas quando o usuário solicitar
- Mensagens em português ou inglês, focadas no **porquê**
- Nunca commitar arquivos com secrets

---

## 3. Validações Obrigatórias

Antes de qualquer alteração de código, verificar:

```
□ Consultei PROJECT_CONTEXT.md para contexto atual?
□ Identifiquei o agente especializado correto (.agents/)?
□ Existe playbook aplicável (.playbooks/)?
□ A alteração respeita a regra de 3 arquivos?
□ Documentei risco e impacto para o usuário?
□ Não estou tocando em pipeline/deps/build sem aprovação?
```

Antes de alterar Firebase:
```
□ Li firestore.rules para impacto em isOwner/getUserData?
□ Functions usam Admin SDK (bypass rules)?
□ Testei mentalmente cenário: users/{uid} não existe?
```

Antes de alterar Stripe:
```
□ Fluxo tolera accountData null?
□ createConnectedAccount tem fallback?
□ EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS está considerado?
```

---

## 4. Observabilidade

### Logs Obrigatórios em Alterações
Manter ou adicionar logs com prefixos padronizados:
- `[FS_*]` — Firestore operations
- `[STRIPE_*]` — Stripe operations
- `[BANK_*]` — ContaBancariaScreen
- `[FIREBASE]` — Firebase init
- `[SENTRY_*]` — Error reporting

### Sentry
- Erros fatais devem ser capturados via `@sentry/react-native`
- Nunca silenciar exceções sem log equivalente
- Incluir `uid`, `path`, `build` no contexto de erros Firestore/Stripe

### Diagnóstico
- Preferir logs estruturados (objetos JSON) sobre strings concatenadas
- Manter `showFirestoreDebug` em modo debug até PERMISSION_DENIED resolvido

---

## 5. Segurança

### Dados Sensíveis
- Nunca logar tokens, API keys, ou dados de cartão
- Stripe: apenas `accountId`, nunca secret keys no client
- Firestore: validar que rules não são enfraquecidas

### Auth
- Toda operação Firestore client-side requer `request.auth.uid === userId`
- Functions onCall devem validar `context.auth` antes de operações sensíveis
- Campos protegidos em `users`: `role`, `status`, `riskScore` — apenas admin altera

### Pipeline
- Secrets apenas via GitHub Secrets / EAS Secrets
- `GOOGLE_SERVICE_INFO_PLIST` e `GOOGLE_SERVICES_JSON_BASE64` nunca em código

---

## 6. Referência Rápida de Agentes

| Situação | Agente | Playbook |
|----------|--------|----------|
| PERMISSION_DENIED Firestore | Firebase | `firebase-permission-denied.md` |
| Stripe onboarding falha | Stripe | `stripe-debug.md` |
| Build iOS falhou | Pipeline | — |
| Decisão arquitetural | Architect | — |
| Spike de erros Sentry | Observability | — |

---

## 7. Modo Bootstrap (Este Setup)

Durante criação de contexto IA (`.md` only):
- **PERMITIDO**: criar/editar arquivos `.md` em `.agents/`, `.playbooks/`, `.docs/`, `.architecture/`, `.cursor/rules/`
- **PROIBIDO**: alterar qualquer código fonte, config ou pipeline

---

## 8. Formato de Resposta Padrão

Toda resposta de agente deve incluir:

```markdown
## Resumo
[1-2 frases do que foi feito/analisado]

## Risco
[baixo | médio | alto] — [justificativa]

## Arquivos Afetados
- [lista ou "nenhum"]

## Próximos Passos
- [ações recomendadas]

## Logs a Monitorar
- [prefixos relevantes]
```

---

*Regras versionadas com o projeto. Violações devem ser reportadas ao usuário imediatamente.*
