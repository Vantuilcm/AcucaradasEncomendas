#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V2.1 - Hybrid Auth)
# Missão: Executar Build iOS 100% estável, automatizado e resiliente via GitHub Actions + EAS Cloud.
# Suporte: Apple ID (2FA) ou ASC API Key (Recomendado para CI).

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS..."
echo "------------------------------------------------------------"

## ETAPA 1 — PRÉ-VALIDAÇÃO (FAIL FAST)

# 1.1 Variáveis obrigatórias base
MISSING_BASE_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_BASE_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_APPLE_TEAM_ID:-}" ] && MISSING_BASE_VARS+=("EXPO_APPLE_TEAM_ID")
[ -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ] && MISSING_BASE_VARS+=("GOOGLE_SERVICE_INFO_PLIST")

if [ ${#MISSING_BASE_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis base ausentes: ${MISSING_BASE_VARS[*]}"
    exit 1
fi

# 1.2 Validação de Autenticação (Apple ID ou ASC API Key)
AUTH_METHOD=""

# Verificar ASC API Key (Prioridade)
if [ -n "${EXPO_ASC_KEY_ID:-}" ] && [ -n "${EXPO_ASC_ISSUER_ID:-}" ] && { [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ] || [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; }; then
    AUTH_METHOD="ASC_API_KEY"
    echo "🔑 [AUTH] Utilizando App Store Connect API Key (Admin)."
    
    # Normalizar Private Key para arquivo se necessário pelo EAS
    if [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ] && [ -z "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
        echo "🔑 [INFO] Decodificando ASC Private Key de Base64..."
        echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode > AuthKey.p8
        export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
    elif [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
        echo "$EXPO_ASC_PRIVATE_KEY" > AuthKey.p8
        export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
    fi
# Verificar Apple ID
elif [ -n "${EXPO_APPLE_ID:-}" ] && [ -n "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]; then
    AUTH_METHOD="APPLE_ID"
    echo "🔑 [AUTH] Utilizando Apple ID + App Specific Password."
else
    echo "❌ [ERRO] Nenhuma credencial de autenticação Apple válida encontrada."
    echo "💡 [DICA] Configure (EXPO_APPLE_ID + EXPO_APPLE_APP_SPECIFIC_PASSWORD) OU (EXPO_ASC_KEY_ID + EXPO_ASC_ISSUER_ID + EXPO_ASC_PRIVATE_KEY)."
    exit 1
fi

# 1.3 Governança de Arquivos (Anti-Signing Manual)
echo "[INFO] Validando governança de credenciais..."
forbidden_files=("credentials.json" "*.p12" "*.mobileprovision")
for pattern in "${forbidden_files[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        echo "❌ [ERROR] [GOVERNANÇA] Arquivo proibido detectado: $pattern"
        echo "💡 [DICA] O pipeline exige EAS Managed Credentials. Remova arquivos de signing manuais."
        exit 1
    fi
done

# 1.4 Firebase Setup (Blindagem)
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

# 1.5 Expo Config Validation (Bundle ID)
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
# Limpar variáveis que podem causar conflito se estivermos usando API Key
if [ "$AUTH_METHOD" = "ASC_API_KEY" ]; then
    unset EXPO_APPLE_ID EXPO_APPLE_PASSWORD EXPO_APPLE_APP_SPECIFIC_PASSWORD
fi
echo "🛡️ Ambiente limpo e pronto."

## ETAPA 3 — EXECUÇÃO DO BUILD (PADRÃO OFICIAL EAS CLOUD)
START_TIME=$(date +%s)

run_eas_build() {
  local attempt=$1
  echo "🏗️ [BUILD] Tentativa $attempt de build iOS no EAS Cloud..."
  
  # Executa EAS Build e captura a URL do build
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
    echo "DICA: Verifique se o EXPO_TOKEN tem permissão de Admin e se as credenciais ($AUTH_METHOD) estão corretas."
    exit 1
fi
