#!/usr/bin/env bash
set -euo pipefail

SUMMARY_FILE="error_summary.txt"
APP_NAME=${APP_NAME:-"Açucaradas Encomendas"}
PLATFORM=${PLATFORM:-"ios"}

echo "------------------------------------------------------------"
echo "[INFO] [SUMMARIZE FAILURE] Gerando Relatório de Erro para: $APP_NAME ($PLATFORM)"
echo "------------------------------------------------------------"

# Função para Escrever no Sumário
write_summary() {
  local key=$1
  local value=$2
  echo "$key: $value" >> $SUMMARY_FILE
}

# Iniciar Sumário
echo "------------------------------------------------------------" > $SUMMARY_FILE
echo "🍎 RELATÓRIO DE FALHA CI/CD iOS (Enterprise Mode)" >> $SUMMARY_FILE
echo "------------------------------------------------------------" >> $SUMMARY_FILE
write_summary "APP" "$APP_NAME"
write_summary "DATA" "$(date '+%Y-%m-%d %H:%M:%S')"
write_summary "PLATAFORMA" "$PLATFORM"

# Determinar Etapa que Falhou
if [ -f "build_log.txt" ] && (grep -q "Build failed" build_log.txt || grep -q "build command failed" build_log.txt); then
  write_summary "ETAPA" "Build iOS (EAS Cloud)"
  
  # Causa Provável do Build
  if grep -q "Apple 401" build_log.txt; then
    write_summary "CAUSA" "Autenticação Apple 401 (API Key inconsistente)"
    write_summary "AÇÃO MANUAL" "Revise a Key ID e permissão ADMIN no App Store Connect."
  elif grep -q "Apple 403" build_log.txt; then
    write_summary "CAUSA" "Acesso negado 403 (Contratos pendentes)"
    write_summary "AÇÃO MANUAL" "O 'Account Holder' deve aceitar contratos no portal Apple Developer."
  elif grep -q "No certificate exists" build_log.txt || grep -q "certificate not found" build_log.txt; then
    write_summary "CAUSA" "Certificado inexistente ou revogado"
    write_summary "AÇÃO AUTOMÁTICA" "Limpeza de credenciais executada (Auto-Heal)"
    write_summary "AÇÃO MANUAL" "Se falhou na segunda tentativa, verifique a Apple API Key."
  elif grep -q "Provisioning profile" build_log.txt; then
    write_summary "CAUSA" "Falha de Provisioning Profile"
    write_summary "AÇÃO AUTOMÁTICA" "Limpeza de credenciais executada (Auto-Heal)"
    write_summary "AÇÃO MANUAL" "Verifique se o Bundle ID está correto no portal Apple."
  else
    write_summary "CAUSA" "Erro desconhecido no build"
    write_summary "AÇÃO MANUAL" "Consulte o artefato build_log.txt para detalhes técnicos."
  fi

elif [ -f "submit_log.txt" ] && (grep -q "Submission failed" submit_log.txt || grep -q "Something went wrong when submitting" submit_log.txt); then
  write_summary "ETAPA" "Submit TestFlight (EAS Submit)"
  
  # Causa Provável do Submit
  if grep -q "App Store Connect" submit_log.txt; then
    write_summary "CAUSA" "Autenticação App Store Connect falhou"
    write_summary "AÇÃO MANUAL" "Revise as credenciais de submissão ou Apple ID."
  elif grep -q "Build not found" submit_log.txt; then
    write_summary "CAUSA" "Build não encontrado no servidor EAS"
    write_summary "AÇÃO MANUAL" "Garanta que o build terminou com sucesso antes do submit."
  else
    write_summary "CAUSA" "Erro desconhecido na submissão"
    write_summary "AÇÃO MANUAL" "Consulte o artefato submit_log.txt."
  fi
else
  write_summary "ETAPA" "Pré-Build / Validação"
  write_summary "CAUSA" "Variáveis ausentes ou ambiente mal configurado"
  write_summary "AÇÃO MANUAL" "Configure os Secrets do GitHub conforme documentação."
fi

echo "------------------------------------------------------------" >> $SUMMARY_FILE
echo "[INFO] Sumário gerado em error_summary.txt."
