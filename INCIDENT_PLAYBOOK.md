# 🚨 PLAYBOOK DE INCIDENTES (INCIDENT_PLAYBOOK.md)

Procedimentos de emergência para recuperação rápida da aplicação em caso de falha crítica em produção.

## 1. TRIAGEM RÁPIDA (O que quebrou?)
- **Tela Branca no Início**: Falha no bootstrap ou Firebase.
- **Erro de Login**: Problema de Auth ou Conectividade.
- **Falha de Build**: Configuração de nativo (Xcode/Gradle) ou credenciais expiradas.

## 2. PROCEDIMENTO DE ROLLBACK (O Botão de Pânico)
Caso o build atual (`v117x`) apresente falha crítica:
1. Identificar o último commit estável via tag `stable-prod-baseline`.
2. Criar branch de emergência: `git checkout -b hotfix/rollback-to-baseline stable-prod-baseline`.
3. Forçar build com buildNumber superior: `npm run force-build-number -- --inc`.
4. Disparar `ios-production.yml` imediatamente.

## 3. MODO DE DIAGNÓSTICO FORÇADO
Se a causa for desconhecida:
1. Ativar `src/screens/BootDiagnosticScreen.tsx`.
2. Forçar redirecionamento em `src/hooks/useRoleRedirect.ts`.
3. Gerar build de diagnóstico via `ios-diagnostic.yml`.

## 4. CONTATOS E ACESSOS
- **Expo Dashboard**: [expo.dev](https://expo.dev)
- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
- **App Store Connect**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---
*Em caso de dúvida: Não tente corrigir o erro na branch atual. Faça o rollback primeiro, estabilize os usuários, e depois investigue no laboratório (`lab/*`).*
