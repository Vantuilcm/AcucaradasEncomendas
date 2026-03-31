#!/bin/bash

# 🛡️ scripts/build-monitor.sh - Monitor de Build Enterprise Auto-Corretivo
set -e

# Configurações do Build
PLATFORM="ios"
PROFILE="production_v13"
MAX_ATTEMPTS=2
ATTEMPT=1

# Função para Detectar Erros
detect_errors() {
  local log_file=$1
  
  if grep -q "Apple 401" "$log_file"; then
    echo "❌ Erro de autenticação Apple (401)!"
    return 1
  elif grep -q "Apple 403" "$log_file"; then
    echo "❌ Erro: Contrato Apple ou permissão inválida (403)!"
    echo "👉 Verifique se o contrato de desenvolvedor foi aceito no portal da Apple."
    return 2
  elif grep -q "No certificate exists" "$log_file" || grep -q "certificate not found" "$log_file"; then
    echo "⚠️ Inconsistência de certificado detectada!"
    return 3
  elif grep -q "Provisioning profile" "$log_file"; then
    echo "⚠️ Erro de Provisioning Profile detectado!"
    return 4
  fi
  
  return 0
}

# Início do Ciclo de Build
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "🚀 Tentativa $ATTEMPT de $MAX_ATTEMPTS: Iniciando build iOS..."
  
  # Executar Build capturando logs
  EXPO_DEBUG=1 EXPO_ASC_API_KEY_PATH="./AuthKey.p8" eas build --platform $PLATFORM --profile $PROFILE --non-interactive 2>&1 | tee build_log.txt
  
  # Verificar Resultado do Build
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Build iOS finalizado com sucesso absoluto!"
    exit 0
  fi
  
  # Analisar Erros
  detect_errors "build_log.txt"
  ERROR_CODE=$?
  
  case $ERROR_CODE in
    1)
      echo "❌ Falha crítica de autenticação (401). Abortando."
      exit 1
      ;;
    2)
      echo "❌ Falha crítica de acesso (403). Verifique contratos Apple. Abortando."
      exit 1
      ;;
    3|4)
      echo "🛡️ Auto-Correção Iniciada: Limpando credenciais EAS corrompidas..."
      eas credentials:clear --platform $PLATFORM --non-interactive || true
      echo "⏳ Aguardando 5s para sincronização..."
      sleep 5
      ;;
    *)
      echo "❌ Erro desconhecido durante o build. Veja build_log.txt."
      exit 1
      ;;
  esac
  
  ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ Falha no build iOS após $MAX_ATTEMPTS tentativas. Verifique build_log.txt."
exit 1
