#!/usr/bin/env bash
set -euo pipefail

# 🍎 scripts/ci/ios-build-guardian.sh - O Guardião do Build iOS (V4.0 - EAS Cloud Guard)
# Missão: Executar Build iOS 100% estável no EAS Cloud, garantindo normalização de credenciais.
# Suporte: ASC API Key (Obrigatório para CI).

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Guardião de Build iOS (EAS CLOUD V4.0)..."
echo "------------------------------------------------------------"

## ETAPA 1 — PRÉ-VALIDAÇÃO (FAIL FAST)

# 1.1 Variáveis obrigatórias base
MISSING_BASE_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_BASE_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_APPLE_TEAM_ID:-}" ] && MISSING_BASE_VARS+=("EXPO_APPLE_TEAM_ID")
# GOOGLE_SERVICE_INFO_PLIST não é obrigatório para o Guardian se já existir o arquivo
# Mas no CI geralmente é injetado via secret.
[ -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ] && echo "⚠️ [WARNING] GOOGLE_SERVICE_INFO_PLIST não definida. O build pode falhar se o arquivo não existir."

if [ ${#MISSING_BASE_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis base obrigatórias ausentes: ${MISSING_BASE_VARS[*]}"
    exit 1
fi

# 1.2 Validação de Autenticação (Apple ID ou ASC API Key)
AUTH_METHOD=""

# Debug credential checks
echo "🔍 [DEBUG] Verificando credenciais para iOS..."
echo "[DEBUG] EXPO_ASC_KEY_ID: ${EXPO_ASC_KEY_ID:-(vazia)}"
echo "[DEBUG] EXPO_ASC_ISSUER_ID: ${EXPO_ASC_ISSUER_ID:-(vazia)}"
echo "[DEBUG] EXPO_ASC_PRIVATE_KEY: ${EXPO_ASC_PRIVATE_KEY:+(presente)}"
echo "[DEBUG] EXPO_ASC_PRIVATE_KEY_BASE64: ${EXPO_ASC_PRIVATE_KEY_BASE64:+(presente)}"

# Verificar ASC API Key (Obrigatório para iOS EAS Cloud em modo não-interativo)
MISSING_ASC_VARS=()
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_ASC_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_ASC_VARS+=("EXPO_ASC_ISSUER_ID")
if [ -z "${EXPO_ASC_PRIVATE_KEY:-}" ] && [ -z "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
    MISSING_ASC_VARS+=("EXPO_ASC_PRIVATE_KEY ou EXPO_ASC_PRIVATE_KEY_BASE64")
fi

if [ ${#MISSING_ASC_VARS[@]} -ne 0 ]; then
    echo "❌ [ERRO] Variáveis de ASC API Key ausentes: ${MISSING_ASC_VARS[*]}"
    echo "💡 [DICA] Sem estas variáveis, o EAS Build solicitará credenciais interativamente e falhará no CI."
    exit 1
fi

AUTH_METHOD="ASC_API_KEY"
echo "🔑 [AUTH] Utilizando App Store Connect API Key (Admin)."
    
    # Normalizar Private Key para arquivo se necessário pelo EAS
    if [ -n "${EXPO_ASC_PRIVATE_KEY_BASE64:-}" ]; then
        echo "🔑 [INFO] Decodificando ASC Private Key de Base64..."
        echo "$EXPO_ASC_PRIVATE_KEY_BASE64" | base64 --decode > AuthKey.p8
    elif [ -n "${EXPO_ASC_PRIVATE_KEY:-}" ]; then
        echo "🔑 [INFO] Normalizando multiline da ASC Private Key..."
        # Converter \n literais para quebras reais de linha se existirem
        echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
    fi

    # Validar se o arquivo .p8 é válido
    if [ -f "AuthKey.p8" ]; then
        if grep -q "BEGIN PRIVATE KEY" AuthKey.p8 && grep -q "END PRIVATE KEY" AuthKey.p8; then
            echo "✅ [SUCCESS] ASC Private Key validada e normalizada."
            export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
            
            # Exportar para o GITHUB_ENV para persistir entre steps se necessário
            if [ -n "${GITHUB_ENV:-}" ]; then
                echo "EXPO_ASC_PRIVATE_KEY<<EOF" >> $GITHUB_ENV
                cat AuthKey.p8 >> $GITHUB_ENV
                echo "EOF" >> $GITHUB_ENV
            fi
        else
            echo "❌ [ERRO] AuthKey.p8 gerado é inválido (faltam headers BEGIN/END)."
            exit 1
        fi
    else
        echo "❌ [ERRO] Falha ao gerar arquivo AuthKey.p8."
        exit 1
    fi
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
if ! command -v jq &> /dev/null; then
    echo "⚠️ [WARNING] jq não encontrado. Instalando..."
    sudo apt-get update && sudo apt-get install -y jq || true
fi

BUNDLE_ID=$(npx expo config --json | jq -r '.ios.bundleIdentifier // empty')
if [ "$BUNDLE_ID" != "com.acucaradas.encomendas" ]; then
    echo "❌ [ERRO] bundleIdentifier incorreto: $BUNDLE_ID (esperado: com.acucaradas.encomendas)"
    exit 1
fi

## ETAPA 2 — LIMPEZA PROFUNDA E CONFLITOS (ANTI-CONFLITO)
echo "🧹 [INFO] Limpando ambiente de build (DEEP CLEAN)..."
rm -rf ios
rm -rf node_modules/.cache
rm -rf .expo
rm -rf dist

# Limpar variáveis que causam conflito com ASC API Key
echo "🧹 [INFO] Removendo variáveis de credenciais manuais para forçar ASC API Key..."
unset IOS_DIST_CERT_BASE64
unset IOS_PROV_PROFILE_BASE64
unset IOS_CERT_PASSWORD
unset EXPO_APP_STORE_CONNECT_API_KEY

if [ "$AUTH_METHOD" = "ASC_API_KEY" ]; then
    unset EXPO_APPLE_ID EXPO_APPLE_PASSWORD EXPO_APPLE_APP_SPECIFIC_PASSWORD
fi
echo "🛡️ Ambiente limpo e pronto."

## ETAPA 3 — EXECUÇÃO DO BUILD LOCAL (GITHUB RUNNER)
START_TIME=$(date +%s)

# 3.0 Validação de ENV (Fail Fast)
echo "🧪 [VALIDATE] Validando variáveis de runtime..."
node scripts/validate-env.js

# 3.1 Carregar variáveis de ambiente do Perfil (EAS Local exige injeção manual)
echo "🌍 [ENV] Injetando variáveis do Perfil: ${PROFILE:-production_v13}..."

# Exportar TODAS as variáveis EXPO_PUBLIC_ disponíveis no ambiente
# Isso garante que o bundle JS as inclua no binário local.
for var in $(env | grep ^EXPO_PUBLIC_ | cut -d= -f1); do
    export "$var"
    echo "✅ Exportado: $var"
done

# 3.2 Pré-geração Nativa (Garante injeção do GoogleService-Info.plist)
echo "🏗️ [PREBUILD] Gerando diretório nativo iOS limpo..."
npx expo prebuild --platform ios --no-install --non-interactive

# 3.3 Validar se o prebuild injetou o arquivo no local correto do Xcode
if [ ! -f "ios/Açucaradas Encomendas/GoogleService-Info.plist" ] && [ ! -f "ios/AcucaradasEncomendas/GoogleService-Info.plist" ]; then
    echo "⚠️ [WARNING] GoogleService-Info.plist não encontrado no diretório nativo. Copiando manualmente..."
    # Tentar encontrar o diretório correto (com ou sem espaços)
    TARGET_DIR=$(find ios -maxdepth 1 -type d -not -path 'ios' -not -name 'Pods' -not -name '*.xcodeproj' -not -name '*.xcworkspace' | head -n 1)
    cp GoogleService-Info.plist "$TARGET_DIR/"
fi

run_eas_build() {
  local attempt=$1
  local build_profile=${PROFILE:-"production_v13"}
  echo "🏗️ [BUILD] Tentativa $attempt de build iOS (Perfil: $build_profile)..."
  
  # Executa EAS Build
  set +e
  EXPO_DEBUG=1 eas build --platform ios --profile "$build_profile" --non-interactive
  local exit_code=$?
  set -e
  
  if [ $exit_code -eq 0 ]; then
      echo "📦 [SUCCESS] Build concluído com sucesso!"
      return 0
  else
      echo "⚠️ [WARNING] Falha no build na tentativa $attempt."
      return 1
  fi
}

# ETAPA 4 — AUTO-HEAL (RETRY)
MAX_RETRIES=2
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_RETRIES ]; do
    if run_eas_build $ATTEMPT; then
        SUCCESS=true
        break
    fi
    
    echo "🔄 [AUTO-HEAL] Detectada falha no build. Tentando auto-correção..."
    
    # Se falhou, tenta limpar cache da expo e credenciais antes da última tentativa
    if [ $ATTEMPT -lt $MAX_RETRIES ]; then
      echo "🧹 [FIX] Limpando cache do EAS e tentando novamente..."
      rm -rf .expo
      eas credentials:sync -p ios --non-interactive || true
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    [ $ATTEMPT -le $MAX_RETRIES ] && echo "⏳ Aguardando 15s para próxima tentativa..." && sleep 15
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

## ETAPA 5 — OUTPUT FINAL
echo "------------------------------------------------------------"
echo "📊 RESUMO FINAL:"
if [ "$SUCCESS" = true ]; then
    echo "STATUS: SUCCESS"
    echo "TIPO: EAS CLOUD BUILD"
    echo "TEMPO: ${DURATION}s"
    exit 0
else
    echo "STATUS: FAILURE"
    echo "MOTIVO: Falha no build EAS Cloud após $MAX_RETRIES tentativas."
    echo "DICA: Verifique se as credenciais ASC API Key no GitHub Secrets estão corretas."
    exit 1
fi
