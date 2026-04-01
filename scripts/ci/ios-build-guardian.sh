#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V2 - Ultra Stable)
# Missão: Executar Build iOS 100% estável, automatizado e resiliente via GitHub Actions + EAS Cloud.

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS..."
echo "------------------------------------------------------------"

## ETAPA 1 — PRÉ-VALIDAÇÃO (FAIL FAST)

# 1.1 Variáveis obrigatórias
MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_APPLE_ID:-}" ] && MISSING_VARS+=("EXPO_APPLE_ID")
[ -z "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ] && MISSING_VARS+=("EXPO_APPLE_APP_SPECIFIC_PASSWORD")
[ -z "${EXPO_APPLE_TEAM_ID:-}" ] && MISSING_VARS+=("EXPO_APPLE_TEAM_ID")
[ -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ] && MISSING_VARS+=("GOOGLE_SERVICE_INFO_PLIST")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis obrigatórias ausentes: ${MISSING_VARS[*]}"
    exit 1
fi

# 1.2 Governança de Arquivos (Anti-Signing Manual)
echo "[INFO] Validando governança de credenciais..."
forbidden_files=("credentials.json" "*.p12" "*.mobileprovision")
for pattern in "${forbidden_files[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        echo "❌ [ERROR] [GOVERNANÇA] Arquivo proibido detectado: $pattern"
        echo "💡 [DICA] O pipeline exige EAS Managed Credentials. Remova arquivos de signing manuais."
        exit 1
    fi
done

# 1.3 Firebase Setup (Blindagem)
echo "📲 [FIREBASE] Criando GoogleService-Info.plist..."
if echo "$GOOGLE_SERVICE_INFO_PLIST" | grep -q "<plist"; then
    echo "🔍 Formato detectado: XML (texto puro)"
    echo "$GOOGLE_SERVICE_INFO_PLIST" > GoogleService-Info.plist
else
    echo "🔍 Formato detectado: BASE64"
    if ! echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist 2>/dev/null; then
        echo "❌ ERRO: Falha ao decodificar BASE64 do Firebase"
        exit 1
    fi
fi

if ! grep -q "<plist" GoogleService-Info.plist; then
    echo "❌ ERRO: GoogleService-Info.plist inválido após geração"
    exit 1
fi
echo "✅ [SUCCESS] GoogleService-Info.plist válido."

# 1.4 Expo Config Validation (Bundle ID)
echo "[INFO] Validando Expo Config..."
BUNDLE_ID=$(npx expo config --json | jq -r '.ios.bundleIdentifier // empty')
if [ "$BUNDLE_ID" != "com.acucaradas.encomendas" ]; then
    echo "❌ [ERRO] bundleIdentifier incorreto: $BUNDLE_ID (esperado: com.acucaradas.encomendas)"
    exit 1
fi

## ETAPA 2 — LIMPEZA DE AMBIENTE (ANTI-CONFLITO)
echo "🧹 [INFO] Limpando ambiente de build..."
rm -rf ios/build
rm -rf node_modules/.cache
unset IOS_DIST_CERT_BASE64 IOS_PROV_PROFILE_BASE64 IOS_CERT_PASSWORD EXPO_APP_STORE_CONNECT_API_KEY
echo "🛡️ Ambiente limpo e pronto."

## ETAPA 3 — EXECUÇÃO DO BUILD (PADRÃO OFICIAL EAS CLOUD)
START_TIME=$(date +%s)

run_eas_build() {
  local attempt=$1
  echo "🏗️ [BUILD] Tentativa $attempt de build iOS no EAS Cloud..."
  
  # Executa EAS Build e captura a URL do build
  # --no-wait para disparar e não travar o runner
  set +e
  BUILD_LOG=$(eas build --platform ios --profile production --non-interactive --no-wait 2>&1)
  local exit_code=$?
  set -e
  
  echo "$BUILD_LOG"
  
  # ETAPA 4 — MONITORAMENTO INTELIGENTE
  BUILD_URL=$(echo "$BUILD_LOG" | grep -o "https://expo.dev/accounts/[^ ]*/builds/[^ ]*" | head -1 || echo "")
  
  if [ -n "$BUILD_URL" ]; then
      echo "📦 [SUCCESS] Build iniciado com sucesso!"
      echo "🔗 URL: $BUILD_URL"
      return 0
  else
      echo "⚠️ [WARNING] Não foi possível capturar a URL do build na tentativa $attempt."
      return 1
  fi
}

# ETAPA 5 — AUTO-HEAL (RETRY)
MAX_RETRIES=2
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_RETRIES ]; do
    if run_eas_build $ATTEMPT; then
        SUCCESS=true
        break
    fi
    
    echo "🔄 [AUTO-HEAL] Detectada falha no disparo. Verificando causas comuns..."
    
    # Se erro de credenciais, tenta sincronizar
    if echo "$BUILD_LOG" | grep -q "credentials"; then
        echo "🔑 [FIX] Tentando sincronizar credenciais EAS..."
        eas credentials:sync -p ios --non-interactive || true
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    [ $ATTEMPT -le $MAX_RETRIES ] && echo "⏳ Aguardando 10s para próxima tentativa..." && sleep 10
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

## ETAPA 6 — OUTPUT FINAL
echo "------------------------------------------------------------"
echo "📊 RESUMO FINAL:"
if [ "$SUCCESS" = true ]; then
    echo "STATUS: SUCCESS"
    echo "URL: $BUILD_URL"
    echo "TEMPO: ${DURATION}s"
    exit 0
else
    echo "STATUS: FAILURE"
    echo "MOTIVO: Falha ao disparar build após $MAX_RETRIES tentativas."
    echo "ETAPA: ETAPA 3 (EAS BUILD)"
    echo "DICA: Verifique se o EXPO_TOKEN tem permissão de Admin e se o Apple ID está autenticado no EAS."
    exit 1
fi
