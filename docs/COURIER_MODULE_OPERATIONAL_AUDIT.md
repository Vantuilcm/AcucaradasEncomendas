# Auditoria operacional — Módulo Entregador (Courier)

**Data:** 2026-05-22  
**Tipo:** Read-only · evidências no repositório  
**Relacionado:** `docs/MVP_FINANCEIRO_PRODUTOR_AUDIT.md` · `docs/CONTROLLED_PROGRESSIVE_ACTIVATION.md`

---

## 1. Resumo executivo

O módulo entregador **não está “só com UI quebrada”** — há **arquitetura de navegação incompleta** e **mistura de fluxo real + placeholders**.

| Veredito | Detalhe |
|----------|---------|
| **Problema “Dados Bancários não clicam”** | Causa provável: rota `ContaBancaria` **não registrada** no stack do entregador + outros itens do menu usam `Alert` “Em breve” |
| **Home entregador** | ⚠️ Parcial — funciona **se** existir doc em `delivery_drivers` |
| **Cadastro entregador** | ⚠️ Tela pesada existe, mas **sem gate** automático na Home |
| **Stripe courier** | ⚠️ Reutiliza `ContaBancariaScreen` (mesmo gap `stripeAccountId` do produtor) |
| **Operação mundo real** | ❌ **Não** — bloqueadores críticos de navegação + perfil + payouts |

---

## 2. PASSO 1 — Mapa de telas

| Tela / entrada | Componente | Estado | Evidência |
|----------------|------------|--------|-----------|
| **Home** | `DriverHomeScreen` | ⚠️ Parcial | Pedidos, online, aceitar entrega — depende `delivery_drivers` |
| **Perfil (tab)** | `EntregadorProfileScreen` | ⚠️ Parcial | Menu misto: 1 rota real tentada, 4× “Em breve” |
| **Dados Bancários (Stripe)** | `ContaBancariaScreen` (via navigate) | ❌ **Rota ausente** no stack courier | Ver §3 |
| **Dados Bancários (Pix)** | `PlaceholderScreen` (`DriverPix`) | ❌ Placeholder | Só registrado no stack **comprador/produtor**, não courier |
| **Resumo de Ganhos** | `PlaceholderScreen` (`DriverEarnings`) | ❌ Placeholder + Alert | `navigateTo()` bloqueado |
| **Meu Veículo** | `PlaceholderScreen` | ❌ Alert “Em breve” | |
| **Documentos** | `PlaceholderScreen` | ❌ Alert “Em breve” | |
| **Histórico corridas** | `PlaceholderScreen` | ❌ Alert “Em breve” | |
| **Cadastro entregador** | `DeliveryDriverRegistration` | ⚠️ Real (form + upload) | No stack courier, **não** é initial route |
| **Config notificações** | `NotificationSettingsScreen` | ✅ No stack courier | |
| **Detalhe pedido** | `OrderDetailsScreen` | ✅ No stack courier | |
| **Online/offline** | `DriverHomeScreen` toggle | ⚠️ Real | `availability.isAvailable` em `delivery_drivers` |
| **DriverEarningsScreen** | — | ❌ **Não existe** | Só placeholder por nome de rota |

### Estatísticas UI no perfil entregador

```19:26:src/screens/EntregadorProfileScreen.tsx
  const navigateTo = (route: string) => {
    // TODO FASE 2: Habilitar rotas reais quando as telas forem implementadas
    Alert.alert(
      'Em breve 💝',
      'Esta funcionalidade estará disponível em breve.'
    );
    // RootNavigation.navigate(route);
  };
```

- **4 itens** → sempre Alert (parece “não clica” / “não faz nada útil”).
- **1 item** (“Dados Bancários (Stripe)”) → `RootNavigation.navigate('ContaBancaria')` — mas stack courier **não declara** essa screen.

---

## 3. PASSO 2 — Navegação e causa raiz “não clicável”

### Branch entregador (`AppNavigator`)

Quando `isEntregador`, o stack registra **apenas**:

- `DriverTabs` (Home + Profile)
- `OrderDetails`
- `DeliveryDriverRegistration`
- `NotificationSettings`
- `HelpCenter`

**Não inclui:** `ContaBancaria`, `DriverVehicle`, `DriverPix`, `DriverDocuments`, `DriverEarnings`, `DriverHistory`.

```324:351:src/navigation/AppNavigator.tsx
          ) : isEntregador ? (
            <>
              <Stack.Screen name="DriverTabs" component={DriverTabs} ... />
              <Stack.Screen name="OrderDetails" ... />
              <Stack.Screen name="DeliveryDriverRegistration" ... />
              <Stack.Screen name="NotificationSettings" ... />
              <Stack.Screen name="HelpCenter" ... />
            </>
```

No branch **comprador/produtor** (else), as rotas placeholder e `ContaBancaria` **existem**:

```505:510:src/navigation/AppNavigator.tsx
                <Stack.Screen name="DriverVehicle" component={PlaceholderScreen} ... />
                <Stack.Screen name="DriverPix" component={PlaceholderScreen} ... />
                ...
                <Stack.Screen name="ContaBancaria" component={ContaBancariaScreen} ... />
```

### Comportamento esperado ao tocar “Dados Bancários”

1. `onPress` executa → log `[Navegando para ContaBancaria via Entregador]`
2. `navigationRef.navigate('ContaBancaria')` → **ação não tratada** (screen não está no navigator tree do entregador)
3. Utilizador percebe: **botão não abre nada** (sem crash visível em alguns builds)

**Conclusão:** não é `disabled` nem `TouchableOpacity` quebrado — é **desconexão arquitetural** entre menu e `Stack.Screen`.

### Role routing

| Item | Estado |
|------|--------|
| `UserUtils.getNavigationTarget('entregador')` → `DriverTabs` | ✅ |
| `usePermissions` → `isEntregador` (`entregador` / `driver`) | ✅ |
| `permissionsLoading` forçado `false` | ⚠️ Bypass diagnóstico |
| Tabs courier | 2 abas: Home + Profile | ✅ |

---

## 4. PASSO 3 — Firestore (dois modelos)

### A) `users/{uid}` (Auth + Stripe)

| Campo (auditoria) | Usado pelo courier? | Persistido? |
|-------------------|---------------------|-------------|
| `role: "entregador"` | ✅ Login / routing | ✅ Register |
| `stripeAccountId` | ✅ `ContaBancaria` + webhook split | ❌ Mesmo gap Semana 1 produtor |
| `payoutsEnabled` / `chargesEnabled` | Via sync Stripe | ⚠️ Se sync manual |
| `onboardingComplete` | ❌ Não no código | — |
| `isOnline` | ❌ **Não** em `users` | Online está em `delivery_drivers` |
| `deliveryStatus` | ❌ Não encontrado | — |

### B) `delivery_drivers/{driverId}` (perfil operacional)

| Campo | Uso |
|-------|-----|
| `userId` | Ligação ao auth |
| `availability.isAvailable` | Toggle online (`DriverHomeScreen`) |
| `status` | `pending` / `active` / … |
| `totalEarnings` / `totalDeliveries` | Stats header (parcial) |
| `vehicle`, `documents` | Cadastro + aceite pedido |

**Gap:** utilizador pode ter `users.role = entregador` **sem** documento em `delivery_drivers` → Home sem perfil, toggle falha, aceitar corrida falha.

`DeliveryDriverRegistration` grava **`delivery_drivers` apenas** — não atualiza automaticamente `users` Stripe fields.

---

## 5. PASSO 4 — Placeholders e padrões

| Padrão | Onde | Efeito |
|--------|------|--------|
| `PlaceholderScreen` | Rotas Driver* no stack **não-courier** | Martelo “próximo build” |
| `navigateTo()` + Alert | `EntregadorProfileScreen` | Bloqueio explícito Fase 2 |
| “Calculando…” | `DriverHomeScreen` ganhos sem./média | ❌ Placeholder copy |
| `deliveryFee \|\| 5.00` | Cards de corrida | ⚠️ Fallback monetário fixo |
| `DriverPix` título “Pix” vs menu “Stripe” | Inconsistência de produto | Confusão UX |

---

## 6. PASSO 5 — Dados bancários (diagnóstico)

| Pergunta | Resposta |
|----------|----------|
| Reutiliza `ContaBancariaScreen`? | ✅ Intenção sim (`RootNavigation.navigate`) |
| Tela exclusiva courier? | ❌ `DriverPix` é placeholder Pix, não Stripe |
| Depende `stripeAccountId`? | ✅ Igual produtor |
| Bloqueio role producer? | ⚠️ `createConnectedAccount` usa `role \|\| 'producer'` se campo ausente no doc |
| Bloqueio UI produtor? | ❌ Não há gate `produtor only` na tela — problema é **navegação** |

**Produtor** (`ProdutorProfileScreen`): `ContaBancaria` no stack ✅  
**Entregador**: mesma tela chamada, stack ❌

---

## 7. PASSO 6 — Fluxo operacional ponta a ponta

| Etapa | Estado | Notas |
|-------|--------|-------|
| Registro role entregador | ✅ | `RegisterScreen` |
| Login → `DriverTabs` | ✅ | Se `user.role` definido |
| Cadastro `delivery_drivers` | ⚠️ | Manual via `DeliveryDriverRegistration` — **sem redirect** da Home |
| Home carregar driver | ⚠️ | `getDriverByUserId` — null = sem online/aceite |
| Dados bancários Stripe | ❌ | Rota não no stack |
| Online/offline | ⚠️ | Real se `driver.id` existe |
| Ver corridas disponíveis | ⚠️ | `getOrders()` + filter `ready` — escala/permisões |
| Aceitar entrega | ⚠️ | `acceptOrderAtomic` — precisa online + driver |
| Atualizar status entrega | ⚠️ | `updateOrderStatus` delivering → delivered |
| Repasse taxa entrega (Stripe) | ⚠️ | `onOrderDelivered` + `users.stripeAccountId` |
| Ganhos / histórico premium | ❌ | Placeholder / Alert |

### Backend entregador (Functions)

- Webhook repasse produtor no `payment_intent.succeeded`
- Repasse entregador: trigger `onOrderDelivered` quando `deliveryFeeHeld` — requer `courierId` + `stripeAccountId` em `users/{courier}`

---

## 8. PASSO 7 — Matriz executiva

| Área | Estado | Risco |
|------|--------|-------|
| Login courier | ✅ | Baixo |
| Role routing (`DriverTabs`) | ✅ | Baixo |
| Perfil `delivery_drivers` | ⚠️ | **Alto** — doc ausente = módulo morto |
| Dados bancários (UI) | ❌ | **Crítico** — rota não registrada |
| Stripe courier | ⚠️ | Alto — herda persistência + stack |
| Delivery flow (Home) | ⚠️ | Médio — lógica existe, dados/escala |
| Online/offline | ⚠️ | Médio — depende perfil driver |
| Pedidos / aceite | ⚠️ | Médio |
| Payout entregador | ⚠️ | Alto — `stripeAccountId` + delivered |
| Ganhos / relatórios | ❌ | Médio (percepção) |
| Configurações | ⚠️ | Parcial (só algumas rotas no stack) |

---

## 9. PASSO 8 — MVP Faria Lima: o entregador opera no mundo real?

### Resposta: **Não hoje** (com confiança operacional)

### Bloqueadores críticos (obrigatório MVP)

1. **Registrar `ContaBancaria` (e rotas filhas necessárias) no stack `isEntregador`** — ou nested stack comum.
2. **Gate onboarding courier:** se `!delivery_drivers` → redirect `DeliveryDriverRegistration` (ou wizard).
3. **Persistência `stripeAccountId`** (CPA Semana 1 — já em feature branch) — também para role `entregador`.
4. **Remover/bypass `navigateTo` Alert** nos itens que já têm `Stack.Screen` (mesmo que placeholder) — transparência mínima.
5. **Validar** `getOrders()` / regras Firestore para entregador em produção (não auditado em runtime aqui).

### Importante (pós-MVP imediato)

- Unificar copy Stripe vs Pix (`DriverPix` naming).
- Ganhos reais (`totalEarnings` + `orders.deliveryFee`) — não “Calculando…”.
- `DriverEarnings` real ou disclaimer.
- Lista corridas com query indexada (não scan all orders).
- Status `delivery_drivers.status === active` antes de aceitar.

### Pós-MVP

- Mapa / GPS integrado
- `driver_earnings` collection (rules existem, UI não)
- IA / rotas otimizadas

---

## 10. Comparação produtor vs entregador (herança)

| Aspecto | Produtor | Entregador |
|---------|----------|------------|
| Menu financeiro | Conta Bancária ✅ stack | Conta Bancária ❌ stack |
| Bloqueio “Em breve” | Carteira/Reports | Veículo, Docs, Ganhos, Histórico |
| Coleção operacional | `users` + loja | `users` + **`delivery_drivers`** |
| Stripe screen | Mesma `ContaBancariaScreen` | Mesma (inacessível) |

---

## 11. Evidências de ficheiro (auditoria)

| Artefato | Path |
|----------|------|
| Perfil menu | `src/screens/EntregadorProfileScreen.tsx` |
| Home | `src/screens/DriverHomeScreen.tsx` |
| Navegação | `src/navigation/AppNavigator.tsx` |
| Root navigate | `src/services/RootNavigation.ts` |
| Driver service | `src/services/DeliveryDriverService.ts` |
| Cadastro | `src/screens/DeliveryDriverRegistration.tsx` |
| Stripe UI | `src/screens/ContaBancariaScreen.tsx` |
| Rules | `firestore.rules` (`delivery_drivers`) |
| Placeholder | `src/screens/PlaceholderScreen.tsx` |

---

## 12. Recomendação CPA (quando implementar — fora desta auditoria)

**Uma ativação por vez** (não misturar com Semana 2 produtor sync):

| Ativação | Escopo | Flag sugerida |
|----------|--------|---------------|
| CPA-C1 | `Stack.Screen ContaBancaria` no branch entregador | `ENABLE_COURIER_BANK_NAV` |
| CPA-C2 | Redirect se sem `delivery_drivers` | `ENABLE_COURIER_PROFILE_GATE` |
| CPA-C3 | Menu: navegar placeholders reais vs Alert | — |
| CPA-C4 | Ganhos header dados reais | `ENABLE_COURIER_EARNINGS_UI` |

**Não alterar nesta auditoria:** Stripe freeze, Functions, Hosting, rules.

---

**Assinatura:** módulo courier = **fundação parcial na Home** + **perfil/navegação financeira desconectados** — correção mínima de maior impacto = **registrar `ContaBancaria` no navigator do entregador** e **gate `delivery_drivers`**.
