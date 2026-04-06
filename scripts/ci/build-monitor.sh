#!/usr/bin/env bash
set -euo pipefail

PLATFORM=${PLATFORM:-"ios"}
PROFILE=${PROFILE:-"production_v13"}
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

# Início do script
DRY_RUN=${DRY_RUN:-false}

echo "------------------------------------------------------------"
echo "[INFO] [BUILD MONITOR] Iniciando Build para: $APP_NAME ($PLATFORM)"
echo "------------------------------------------------------------"

if [ "$DRY_RUN" = "true" ]; then
  echo "[INFO] [DRY RUN] Simulando execução do build..."
  if [ -f "mock_error_code.txt" ]; then
    ERROR_CODE_MOCK=$(cat mock_error_code.txt)
    case $ERROR_CODE_MOCK in
      10) echo "Apple 401" > build_log.txt ;;
      20) echo "Apple 403" > build_log.txt ;;
      30) echo "No certificate exists with serial number" > build_log.txt ;;
      40) echo "Provisioning profile" > build_log.txt ;;
      50) echo "Failed to set up credentials" > build_log.txt ;;
      60) echo "build command failed" > build_log.txt ;;
      0) echo "Build successful" > build_log.txt; exit 0 ;;
      *) echo "Unknown error" > build_log.txt ;;
    esac
    BUILD_EXIT_CODE=1
  else
    echo "[INFO] Build successful" > build_log.txt
    exit 0
  fi
else
  # Executar EAS Build capturando logs em tempo real (Shell Strict Mode)
  # Usamos pipefail para garantir que falhas no EAS retornem erro mesmo com tee
  set +e
  EXPO_DEBUG=1 EXPO_ASC_API_KEY_PATH="./AuthKey.p8" npx eas build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive 2>&1 | tee build_log.txt
  BUILD_EXIT_CODE=${PIPESTATUS[0]}
  set -e
fi

# Se sucesso, retornar 0
if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo "[INFO] [SUCESSO] Build finalizado com êxito!"
  exit 0
fi

# Detectar Erros Críticos e Retornar Códigos Padronizados
if grep -q "Apple 401" build_log.txt; then
  echo "[ERROR] Falha de autenticação Apple (401 Unauthorized)."
  exit 10
elif grep -q "Apple 403" build_log.txt; then
  echo "[ERROR] Acesso negado pela Apple (403 Forbidden) - Contratos pendentes."
  exit 20
elif grep -q "No certificate exists with serial number" build_log.txt || grep -q "certificate not found" build_log.txt; then
  echo "[ERROR] Certificado inconsistente ou inexistente detectado."
  exit 30
elif grep -q "Provisioning profile" build_log.txt || grep -q "Failed to create Apple provisioning profile" build_log.txt; then
  echo "[WARNING] Falha ao criar/sincronizar Provisioning Profile."
  exit 40
elif grep -q "Failed to set up credentials" build_log.txt || grep -q "Failed to display prompt" build_log.txt; then
  echo "[ERROR] Falha crítica de configuração de credenciais no EAS."
  exit 50
elif grep -q "build command failed" build_log.txt || grep -q "Build failed" build_log.txt; then
  echo "[ERROR] O comando de build falhou no servidor EAS."
  exit 60
else
  echo "[ERROR] Falha desconhecida no build. Verifique build_log.txt."
  exit 99
fi
