# Deep Link Root Cause — `acucaradas://` ausente no Info.plist

**Data:** 2026-06-03  
**Sintoma:** Safari retorna *"O Safari não pode abrir a página porque o endereço é inválido"* ao executar `acucaradas://stripe/success` após a landing `https://acucaradasencomendas.com.br/stripe-success`.

---

## Resumo

O scheme **`acucaradas`** estava definido em JavaScript (`scheme` no Expo config) mas **não era registrado no `Info.plist` nativo** do IPA. iOS só reconhece custom URL schemes listados em `CFBundleURLSchemes`.

---

## Arquivos auditados

| Arquivo | Papel | Achado |
|---------|-------|--------|
| `app.json` | Base Expo | `"scheme": "acucaradas"` ✅ correto |
| `apps.config.json` | Multi-app | `"scheme": "acucaradas"` ✅ correto |
| `app.config.js` | Config dinâmica (fonte do plist em prebuild) | ❌ **Sobrescrevia `CFBundleURLTypes`** |
| `public/stripe-success/index.html` | Landing | Redireciona para `acucaradas://stripe/success` ✅ |
| `src/navigation/stripeDeepLinking.ts` | Handler RN | `prefixes: ['acucaradas://']` ✅ |

---

## Onde ocorria a sobrescrita

Em `app.config.js`, bloco `ios.infoPlist.CFBundleURLTypes` (linhas ~115–123 antes da correção):

```javascript
CFBundleURLTypes: [
  ...(config.ios?.infoPlist?.CFBundleURLTypes || []),
  {
    CFBundleURLSchemes: [
      facebookAppId ? `fb${facebookAppId}` : undefined,
      googleIosClientId ? googleIosClientId.split('.').reverse().join('.') : undefined,
    ].filter(Boolean),
  },
],
```

### Por que isso remove o scheme do app

1. Expo prebuild injeta o URL type do app a partir de `scheme: "acucaradas"`.
2. Ao definir `CFBundleURLTypes` manualmente em `infoPlist`, o merge **substitui** o conjunto gerado pelo Expo.
3. O array manual continha **apenas** Facebook e Google OAuth — **sem `acucaradas`**.

---

## Evidência forense (IPA instalado / builds anteriores)

Extração de `Info.plist` dos IPAs `build-1780436231399` (BN 1293) e preview `0665196c` (BN 1292):

| `CFBundleURLSchemes` | Presente no IPA |
|----------------------|-----------------|
| `fb1141386540846067` | ✅ |
| `com.googleusercontent.apps.627855691834-cg7iut6b6ebf7tl3eu09icmpbq14h489` | ✅ |
| **`acucaradas`** | ❌ **AUSENTE** |

`EXConstants.bundle/app.config` dentro do IPA reportava `"scheme": "acucaradas"` — prova de que o valor JS existia, mas **não chegava ao plist nativo**.

---

## Mismatch secundário (não causa do Safari)

`src/config/stripe.ts` usa `acucaradas-encomendas://stripe-redirect` para PaymentSheet — scheme **diferente**, legado, **não** usado no fluxo Connect onboarding. Não explica o erro do Safari com `acucaradas://`.

---

## Correção aplicada

Incluir explicitamente o scheme do app no mesmo array `CFBundleURLSchemes`, preservando Facebook e Google:

```javascript
const appScheme = appConfig.scheme || config.scheme || "acucaradas";
const urlSchemes = [appScheme, fbScheme, googleScheme].filter(Boolean);
// CFBundleURLSchemes: urlSchemes
```

Ver `docs/DEEP_LINK_VALIDATION.md` e `docs/IPA_FORENSIC_REPORT.md` para validação pós-correção.
