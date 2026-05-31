# Baseline — Módulos Perfil Produtor

| Campo | Valor |
|-------|--------|
| **Branch origem** | `safe/preview-88064fe-build` |
| **Hash origem** | `7d16ff04e5b5b63aa48fdc672901243a77095868` |
| **Build validado** | 1295 |
| **Branch implementação** | `feature/producer-account-modules` |
| **Data** | 2026-05-31 |

## Inventário inicial (pré-implementação)

### Telas com popup "Em breve" no perfil produtor

| Módulo | Rota anterior | Estado |
|--------|---------------|--------|
| Carteira e Ganhos | `Reports` (bloqueado) | Popup |
| Documentação | `""` (vazio) | Popup |
| Preferências | `NotificationSettings` (bloqueado) | Popup |
| Segurança | `""` (vazio) | Popup |

### Arquivos tocados pelo escopo

- `src/screens/ProdutorProfileScreen.tsx` — rotas e remoção de popup
- `src/navigation/AppNavigator.tsx` — registro de 4 telas
- `firestore.rules` — nova coleção `userPreferences` (somente leitura/escrita do dono)

### Fluxos protegidos (não alterados)

- `functions/index.js` (Stripe Connect)
- `ContaBancariaScreen.tsx` (fluxo Stripe)
- `useStripeDeepLink.ts`, Hosting, AuthContext login/logout
- `app.config.js`, `package.json`, dependências
