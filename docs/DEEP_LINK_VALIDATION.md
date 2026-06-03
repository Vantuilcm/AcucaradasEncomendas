# Deep Link Validation — Pré-build Expo Config

**Data:** 2026-06-03  
**Commit:** (após fix `app.config.js`)  
**Comando:**

```powershell
$env:EXPO_PUBLIC_FACEBOOK_APP_ID='1141386540846067'
$env:EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID='627855691834-cg7iut6b6ebf7tl3eu09icmpbq14h489.apps.googleusercontent.com'
$env:APP_ENV='preview'
npx expo config --type public --json
```

---

## Resultado

| Campo | Valor |
|-------|--------|
| `scheme` (Expo) | `acucaradas` |
| `hasAcucaradas` | **true** |

### `ios.infoPlist.CFBundleURLTypes`

```json
[
  {
    "CFBundleURLSchemes": [
      "acucaradas",
      "fb1141386540846067",
      "com.googleusercontent.apps.627855691834-cg7iut6b6ebf7tl3eu09icmpbq14h489"
    ]
  }
]
```

---

## Checklist pré-build

| Item | Status |
|------|--------|
| `acucaradas` em `CFBundleURLSchemes` | ✅ |
| Facebook scheme preservado | ✅ |
| Google reversed client ID preservado | ✅ |
| `scheme` Expo alinhado | ✅ |

**Conclusão:** Config Expo resolvida pronta para prebuild/iOS. Próximo passo: Build Guardian (GitHub Actions) e auditoria do IPA gerado.
