#!/usr/bin/env bash
set -euo pipefail

APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
PLATFORM=${PLATFORM:-"ios"}

echo "------------------------------------------------------------"
echo "[INFO] [PREBUILD CHECK] Validando Ambiente para: $APP_NAME ($PLATFORM)"
echo "------------------------------------------------------------"

# 1. Validar Variáveis Obrigatórias
vars=("EXPO_TOKEN" "EXPO_ASC_KEY_ID" "EXPO_ASC_ISSUER_ID" "EXPO_ASC_PRIVATE_KEY" "EXPO_APPLE_TEAM_ID")

for var in "${vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "[ERROR] Variável obrigatória $var não encontrada no ambiente!"
    exit 1
  fi
done

echo "[INFO] Variáveis de ambiente obrigatórias presentes."

# 2. Validar Formato da Private Key
if [[ "$EXPO_ASC_PRIVATE_KEY" != *"BEGIN PRIVATE KEY"* ]] || [[ "$EXPO_ASC_PRIVATE_KEY" != *"END PRIVATE KEY"* ]]; then
  echo "[ERROR] Formato da EXPO_ASC_PRIVATE_KEY inválido (Faltam headers BEGIN/END)."
  exit 1
fi

echo "[INFO] Formato da Apple Private Key validado."

# 3. Bloquear Configurações Proibidas (Signing Governance)
forbidden_files=("credentials.json" "*.p12" "*.mobileprovision")
for pattern in "${forbidden_files[@]}"; do
  if ls $pattern 1> /dev/null 2>&1; then
    echo "[ERROR] [GOVERNANÇA] Arquivo proibido detectado: $pattern"
    echo "[WARNING] [REGRA] O pipeline exige EAS Managed Credentials. Remova arquivos de signing manuais."
    exit 1
  fi
done

# 4. Validar eas.json (Anti-Deprecated)
if grep -q "appStoreConnectApiKey" eas.json; then
  echo "[ERROR] [GOVERNANÇA] Configuração 'appStoreConnectApiKey' detectada no eas.json!"
  echo "[WARNING] [REGRA] Use variáveis de ambiente EXPO_ASC_* para maior segurança e flexibilidade."
  exit 1
fi

echo "[INFO] Governança de credenciais respeitada."

# 5. Preparar AuthKey.p8 (Multiline Safe)
echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
if [ ! -s AuthKey.p8 ]; then
  echo "[ERROR] Falha ao gerar arquivo físico AuthKey.p8."
  exit 1
fi

echo "[INFO] AuthKey.p8 preparado para o build."
echo "[INFO] [STATUS] Ambiente validado e pronto para operação."
