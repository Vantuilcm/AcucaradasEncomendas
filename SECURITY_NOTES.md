SECURITY_NOTES

Contexto
Projeto Expo SDK 49 com decisão explícita de não migrar SDK apenas por npm audit.

Vulnerabilidades remanescentes aceitas temporariamente
- send e tar provenientes de @expo/cli (build-time)
- Mitigações: CI efêmero, sem expo start exposto, PR obrigatório e checks de build

Mitigações aplicadas sem mexer no SDK
- Override de undici para ^6.22.1 via Firebase
- Override de semver para ^7.5.4 via @expo/image-utils / expo-notifications

Plano de upgrade
- Migração por etapas (49 → 50 → 51 → 52) quando houver necessidade real de runtime
