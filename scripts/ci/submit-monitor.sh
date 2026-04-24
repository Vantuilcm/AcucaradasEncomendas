#!/usr/bin/env bash
set -euo pipefail

PLATFORM=${PLATFORM:-"ios"}
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}

echo "------------------------------------------------------------"
echo "[INFO] [SUBMIT MONITOR] Iniciando Submissão para: $APP_NAME ($PLATFORM)"
echo "------------------------------------------------------------"

# Executar EAS Submit capturando logs em tempo real
set +e
if [ -n "${IPA_PATH:-}" ] && [ -f "$IPA_PATH" ]; then
  echo "[INFO] [SUBMIT] Submetendo IPA local: $IPA_PATH"
  npx eas submit --platform "$PLATFORM" --path "$IPA_PATH" --non-interactive 2>&1 | tee submit_log.txt
else
  echo "[INFO] [SUBMIT] Submetendo último build do EAS Cloud..."
  npx eas submit --platform "$PLATFORM" --latest --non-interactive 2>&1 | tee submit_log.txt
fi
SUBMIT_EXIT_CODE=${PIPESTATUS[0]}
set -e

# Se sucesso, retornar 0
if [ $SUBMIT_EXIT_CODE -eq 0 ]; then
  echo "[INFO] [SUCESSO] Submissão para TestFlight concluída com êxito!"
  exit 0
fi

# Detectar Erros Críticos e Retornar Códigos Padronizados
if grep -q "App Store Connect" submit_log.txt || grep -q "Unauthorized" submit_log.txt; then
  echo "[ERROR] Falha de autenticação no App Store Connect."
  exit 10
elif grep -q "Build not found" submit_log.txt || grep -q "No build found" submit_log.txt; then
  echo "[ERROR] Build não encontrado para submissão."
  exit 30
elif grep -q "rejected" submit_log.txt || grep -q "validation failed" submit_log.txt; then
  echo "[ERROR] Submissão rejeitada pela Apple por erro de metadados ou validação."
  exit 40
elif grep -q "Something went wrong when submitting your app" submit_log.txt || grep -q "Submission failed" submit_log.txt; then
  echo "[ERROR] Ocorreu um erro genérico durante a submissão do app."
  exit 50
else
  echo "[ERROR] Falha desconhecida na submissão. Verifique submit_log.txt."
  exit 99
fi
