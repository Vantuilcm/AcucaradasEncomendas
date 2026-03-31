#!/bin/bash

# 🛡️ scripts/build-monitor.sh - Monitor de Build Enterprise Auto-Corretivo (Auto-Healing)
set -e

# Configurações do Build
PLATFORM="ios"
PROFILE="production_v13"
MAX_ATTEMPTS=2
ATTEMPT=1

# Função para Detectar Erros e Definir Ação
analyze_build_failure() {
  local log_file=$1
  
  if grep -q "Apple 401" "$log_file"; then
    echo "❌ [LOG] Erro de autenticação Apple (401)!"
    return 1 # Erro fatal de credencial
  elif grep -q "Apple 403" "$log_file"; then
    echo "❌ [LOG] Erro: Acesso negado pela Apple (403 Forbidden)!"
    echo "👉 [AÇÃO] Verifique se o 'Account Holder' aceitou os termos em developer.apple.com."
    return 2 # Erro fatal de permissão/contrato
  elif grep -q "No certificate exists with serial number" "$log_file" || grep -q "certificate not found" "$log_file"; then
    echo "🧨 [LOG] Certificado inválido ou inexistente detectado!"
    return 3 # Gatilho para Auto-Healing (Reset)
  elif grep -q "Provisioning profile" "$log_file" || grep -q "Failed to create Apple provisioning profile" "$log_file"; then
    echo "⚠️ [LOG] Erro de Provisioning Profile detectado!"
    return 4 # Gatilho para Auto-Healing (Reset)
  fi
  
  return 99 # Erro genérico
}

# Início do Ciclo de Build Resiliente
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "------------------------------------------------------------"
  echo "🚀 [TENTATIVA $ATTEMPT/$MAX_ATTEMPTS] Iniciando build iOS (Enterprise Mode)..."
  echo "------------------------------------------------------------"
  
  # Executar Build capturando logs em tempo real
  EXPO_DEBUG=1 EXPO_ASC_API_KEY_PATH="./AuthKey.p8" eas build --platform $PLATFORM --profile $PROFILE --non-interactive 2>&1 | tee build_log.txt
  BUILD_EXIT_CODE=${PIPESTATUS[0]}

  # Verificar Sucesso
  if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ [SUCESSO] Build iOS finalizado com êxito absoluto!"
    exit 0
  fi
  
  # Analisar Falha
  analyze_build_failure "build_log.txt"
  FAILURE_TYPE=$?
  
  case $FAILURE_TYPE in
    1|2)
      echo "❌ [FALHA CRÍTICA] Erro fatal detectado. Abortando pipeline para evitar loop."
      exit 1
      ;;
    3|4)
      if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "🧨 [AUTO-HEALING] Iniciando reset de credenciais corrompidas..."
        echo "🧹 Limpando credenciais iOS inválidas no EAS Cloud..."
        eas credentials:clear --platform $PLATFORM --non-interactive || true
        
        echo "⏳ [AGUARDANDO] 5 segundos para sincronização com servidores Apple/EAS..."
        sleep 5
        
        echo "🔁 [REBUILD] Reexecutando build com credenciais limpas..."
      else
        echo "❌ [FALHA PERSISTENTE] O Auto-Healing falhou após $MAX_ATTEMPTS tentativas."
        echo "👉 Possível problema estrutural na Apple Developer Account ou API Key."
        exit 1
      fi
      ;;
    *)
      echo "❌ [ERRO DESCONHECIDO] Falha não mapeada durante o build. Verifique build_log.txt."
      exit 1
      ;;
  esac
  
  ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ [FALHA FINAL] Build iOS interrompido após atingir o limite de tentativas."
exit 1
