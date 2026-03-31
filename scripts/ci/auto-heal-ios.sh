#!/usr/bin/env bash
set -euo pipefail

PLATFORM=${PLATFORM:-"ios"}
ERROR_CODE=$1

echo "------------------------------------------------------------"
echo "[AUTO-HEAL] [INFO] Iniciando Mecanismo de Auto-Correção para iOS"
echo "------------------------------------------------------------"

case $ERROR_CODE in
  30|40)
    # 30 (Certificado inexistente) ou 40 (Provisioning failure)
    echo "[AUTO-HEAL] [INFO] Auto-heal ativado: Certificado/Provisioning inconsistente detectado (Erro $ERROR_CODE)."
    echo "[AUTO-HEAL] [INFO] [AÇÃO] Credenciais limpas: Removendo credenciais iOS órfãs no EAS Cloud..."
    
    # Executar reset de credenciais no servidor da Expo
    npx eas-cli credentials:clear --platform "$PLATFORM" --non-interactive || true
    
    echo "[AUTO-HEAL] [INFO] [AGUARDANDO] 10 segundos para propagação de credenciais limpas..."
    sleep 10
    
    echo "[AUTO-HEAL] [INFO] [REBUILD] Segunda tentativa iniciada com ambiente limpo..."
    
    # Chamar build-monitor novamente
    ./scripts/ci/build-monitor.sh
    BUILD_EXIT_CODE=$?
    
    if [ $BUILD_EXIT_CODE -eq 0 ]; then
      echo "[AUTO-HEAL] [INFO] [SUCESSO] Sucesso absoluto na segunda tentativa!"
      exit 0
    else
      echo "[AUTO-HEAL] [ERROR] Falha persistente após reset de credenciais. Ação manual necessária."
      exit 1
    fi
    ;;
  20)
    # 20 (Apple 403)
    echo "[AUTO-HEAL] [ERROR] Bloqueio Apple 403 detectado. Não é possível auto-corrigir via reset."
    echo "[AUTO-HEAL] [WARNING] [AÇÃO] O 'Account Holder' deve aceitar contratos no portal Apple Developer."
    exit 1
    ;;
  10)
    # 10 (Apple 401)
    echo "[AUTO-HEAL] [ERROR] Erro 401 detectado. Chave ASC inválida ou inconsistente."
    echo "[AUTO-HEAL] [WARNING] [AÇÃO] Verifique se a chave ASC tem permissão 'ADMIN' e o Key ID está correto."
    exit 1
    ;;
  *)
    echo "[AUTO-HEAL] [ERROR] Erro $ERROR_CODE não possui mecanismo de auto-correção automático."
    echo "[AUTO-HEAL] [WARNING] [AÇÃO] Analise o build_log.txt para diagnóstico manual."
    exit 1
    ;;
esac
