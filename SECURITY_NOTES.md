SECURITY_NOTES

Contexto
Projeto atualizado para Expo SDK 52 com foco em segurança, estabilidade e builds automatizados via RellBuild Pipeline.

Status de Segurança
- Dependências: Atualizadas para versões compatíveis com SDK 52, mitigando vulnerabilidades críticas.
- Gestão de Segredos: Centralizada no GitHub Secrets. Nenhuma chave hardcoded no repositório.
- Pipeline: RellBuild Beta Pipeline configurado para builds gratuitos via GitHub Actions (macOS).

Mitigações Aplicadas
- Injeção dinâmica de arquivos do Firebase (google-services.json / GoogleService-Info.plist) em tempo de build.
- Validação automática de ambiente antes de cada build.
- Hardening do .gitignore para evitar vazamento de credenciais.

Histórico de Upgrades
- SDK 49 -> SDK 52 (Concluído em Março/2026)
- Sentry reativado e configurado via CI.
- OneSignal e Stripe integrados com suporte a prebuild.
