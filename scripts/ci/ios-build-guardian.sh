#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V3.0 - GitHub Local Build)
# Missão: Executar Build iOS 100% estável no GitHub Runner (macOS) SEM usar créditos da Expo.
# Suporte: Apple ID (2FA) ou ASC API Key (Recomendado para CI).

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS (LOCAL)..."
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

## ETAPA 3 — EXECUÇÃO DO BUILD LOCAL (GITHUB RUNNER)
START_TIME=$(date +%s)

# 3.1 Carregar variáveis de ambiente do Perfil (EAS Local exige injeção manual)
echo "🌍 [ENV] Injetando variáveis do Perfil: ${PROFILE:-production_v13}..."
# Injeção manual das variáveis críticas para evitar crash no startup (Sentry, OneSignal, etc)
export APP_ENV="production"
export EXPO_PUBLIC_APP_ENV="production"
export EXPO_PUBLIC_APP_NAME="Açucaradas Encomendas"
export EXPO_PUBLIC_PROJECT_ID="6090106b-e327-4744-bce5-9ddb0d037045"
export APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"

# 3.2 Pré-geração Nativa (Garante injeção do GoogleService-Info.plist)
echo "🏗️ [PREBUILD] Gerando diretório nativo iOS..."
npx expo prebuild --platform ios --no-install --non-interactive

# 3.3 Validar se o prebuild injetou o arquivo no local correto do Xcode
if [ ! -f "ios/Açucaradas Encomendas/GoogleService-Info.plist" ] && [ ! -f "ios/AcucaradasEncomendas/GoogleService-Info.plist" ]; then
    echo "⚠️ [WARNING] GoogleService-Info.plist não encontrado no diretório nativo. Copiando manualmente..."
    # Tentar encontrar o diretório correto (com ou sem espaços)
    TARGET_DIR=$(find ios -maxdepth 1 -type d -not -path 'ios' -not -name 'Pods' -not -name '*.xcodeproj' -not -name '*.xcworkspace' | head -n 1)
    cp GoogleService-Info.plist "$TARGET_DIR/"
fi

run_eas_build_local() {
  local attempt=$1
  local build_profile=${PROFILE:-"production_v13"}
  echo "🏗️ [BUILD] Tentativa $attempt de build iOS LOCAL (Perfil: $build_profile)..."
  
  # Executa EAS Build Local
  # --local: Compila no runner macos, não usa créditos Expo Cloud
  set +e
  eas build --platform ios --profile "$build_profile" --local --non-interactive
  local exit_code=$?
  set -e
  
  if [ $exit_code -eq 0 ]; then
      echo "📦 [SUCCESS] Build Local concluído com sucesso!"
      # Encontrar o arquivo .ipa gerado
      IPA_FILE=$(ls *.ipa 2>/dev/null | head -n 1 || echo "")
      if [ -n "$IPA_FILE" ]; then
          echo "📂 Arquivo gerado: $IPA_FILE"
          echo "IPA_PATH=$IPA_FILE" >> $GITHUB_ENV
      fi
      return 0
  else
      echo "⚠️ [WARNING] Falha no build local na tentativa $attempt."
      return 1
  fi
}

# ETAPA 4 — AUTO-HEAL (RETRY)
MAX_RETRIES=2
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_RETRIES ]; do
    if run_eas_build_local $ATTEMPT; then
        SUCCESS=true
        break
    fi
    
    echo "🔄 [AUTO-HEAL] Detectada falha no build. Verificando causas comuns..."
    
    # Se erro de credenciais, tenta sincronizar
    # No build local, as credenciais ainda são baixadas do EAS
    echo "🔑 [FIX] Sincronizando credenciais EAS para garantir acesso local..."
    eas credentials:sync -p ios --non-interactive || true
    
    ATTEMPT=$((ATTEMPT + 1))
    [ $ATTEMPT -le $MAX_RETRIES ] && echo "⏳ Aguardando 10s para próxima tentativa..." && sleep 10
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

## ETAPA 5 — OUTPUT FINAL
echo "------------------------------------------------------------"
echo "📊 RESUMO FINAL:"
if [ "$SUCCESS" = true ]; then
    echo "STATUS: SUCCESS"
    echo "TIPO: LOCAL BUILD (GitHub)"
    echo "TEMPO: ${DURATION}s"
    exit 0
else
    echo "STATUS: FAILURE"
    echo "MOTIVO: Falha no build local após $MAX_RETRIES tentativas."
    echo "DICA: Verifique os logs do Xcode acima para erros de compilação ou certificados."
    exit 1
fi
