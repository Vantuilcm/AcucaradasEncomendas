#!/usr/bin/env bash
# DEBUG TRIGGER: 1190-v9
# 🍎 iOSBuildGuardianAI_V2_LOCAL
# MISSÃO: Garantir build iOS LOCAL 100% independente, com Build Number 1190.
# V9: Usar credentials.json para evitar prompts interativos de extensões.

# Usar -x para debug total e -e para parar em erros
set -xeo pipefail

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Missão de Build Local V2.2 (v9)..."
echo "------------------------------------------------------------"

# 🧩 ETAPA 1 — VALIDAÇÃO DE AMBIENTE
echo "🔍 [ETAPA 1] Validando ambiente e variáveis..."
pwd
xcodebuild -version
node -v
npm -v
pod --version
eas --version

MISSING_VARS=()
[ -z "${EXPO_TOKEN:-}" ] && MISSING_VARS+=("EXPO_TOKEN")
[ -z "${EXPO_ASC_KEY_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_KEY_ID")
[ -z "${EXPO_ASC_ISSUER_ID:-}" ] && MISSING_VARS+=("EXPO_ASC_ISSUER_ID")
[ -z "${EXPO_ASC_PRIVATE_KEY:-}" ] && MISSING_VARS+=("EXPO_ASC_PRIVATE_KEY")
[ -z "${APPLE_ID:-}" ] && MISSING_VARS+=("APPLE_ID")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [FATAL] Faltam variáveis obrigatórias: ${MISSING_VARS[*]}"
    exit 1
fi

# 🧩 EXTRA — SETUP FIREBASE FILES
echo "🔥 [EXTRA] Configurando arquivos Firebase..."
if [ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
    if [[ "${GOOGLE_SERVICE_INFO_PLIST}" == *"<?xml"* ]]; then
        echo "${GOOGLE_SERVICE_INFO_PLIST}" > GoogleService-Info.plist
    else
        echo "Decodificando GOOGLE_SERVICE_INFO_PLIST como Base64..."
        echo "${GOOGLE_SERVICE_INFO_PLIST}" | base64 --decode > GoogleService-Info.plist
    fi
    echo "✅ GoogleService-Info.plist criado."
fi

if [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
    echo "${GOOGLE_SERVICES_JSON_BASE64}" | base64 --decode > google-services.json
    echo "✅ google-services.json criado."
fi

# 🧩 ETAPA 2 — NORMALIZAÇÃO DA PRIVATE KEY
echo "🔑 [ETAPA 2] Normalizando ASC Private Key..."
if [[ "${EXPO_ASC_PRIVATE_KEY}" == *"BEGIN PRIVATE KEY"* ]]; then
    # Se for string com \n literal, converte para quebra de linha real
    echo "${EXPO_ASC_PRIVATE_KEY}" | sed 's/\\n/\n/g' > AuthKey.p8
else
    # Se for base64
    echo "${EXPO_ASC_PRIVATE_KEY}" | base64 --decode > AuthKey.p8
fi

# 🧩 ETAPA 3 — VALIDAÇÃO DA KEY
echo "⚖️ [ETAPA 3] Validando integridade da chave..."
if ! grep -q "BEGIN PRIVATE KEY" AuthKey.p8; then
    echo "❌ [FATAL] Chave privada inválida!"
    exit 1
fi
echo "✅ Chave validada."

# 🧩 ETAPA 4 — LIMPEZA DE CONFLITOS
echo "🧹 [ETAPA 4] Limpando conflitos de credenciais..."
unset IOS_DIST_CERT_BASE64
unset IOS_PROV_PROFILE_BASE64
unset IOS_CERT_PASSWORD
unset EXPO_APP_STORE_CONNECT_API_KEY

# 🧩 ETAPA 5 — CRIAÇÃO DO credentials.json
echo "📝 [ETAPA 5] Criando credentials.json para modo não-interativo..."

# Obter Team ID e App ID do eas.json se possível
TEAM_ID="7L9P9U9Z9R"
ASC_APP_ID="6756029389"

cat > credentials.json <<EOF
{
  "ios": {
    "appleId": "${APPLE_ID}",
    "ascApiKey": {
      "keyId": "${EXPO_ASC_KEY_ID}",
      "issuerId": "${EXPO_ASC_ISSUER_ID}",
      "keyP8Path": "AuthKey.p8"
    }
  }
}
EOF

echo "✅ credentials.json criado."

# Sincronização explícita (opcional, mas bom para debug)
echo "🔄 Sincronizando credenciais..."
export EXPO_ASC_PRIVATE_KEY_PATH="$(pwd)/AuthKey.p8"
export EXPO_ASC_KEY_ID="${EXPO_ASC_KEY_ID}"
export EXPO_ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID}"

# Tentar sync. Se falhar, o build --credentials-file pode resolver
eas credentials:sync -p ios --non-interactive || echo "⚠️ Sync falhou, prosseguindo com credentials-file..."

# 🧩 ETAPA 6 — PRÉ-BUILD NATIVO
echo "🏗️ [ETAPA 6] Executando Expo Prebuild..."

# FIX ASSETS - Missão de Resgate de Arquivos Faltantes
echo "🎨 [FIX] Garantindo que os assets existem para o prebuild..."
mkdir -p assets
if [ -f assets/app-icon.png ]; then
    cp assets/app-icon.png assets/icon.png
    cp assets/app-icon.png assets/adaptive-icon.png
    cp assets/app-icon.png assets/favicon.png
elif [ -f assets/app-icon-1024.png ]; then
    cp assets/app-icon-1024.png assets/icon.png
    cp assets/app-icon-1024.png assets/adaptive-icon.png
    cp assets/app-icon-1024.png assets/favicon.png
fi

# Garantir que splash.png existe
[ -f assets/splash.png ] || {
    echo "⚠️ splash.png não encontrado, tentando usar icon como fallback..."
    [ -f assets/icon.png ] && cp assets/icon.png assets/splash.png
}

# Limpar arquivos temporários antes
rm -f public_config.json

# Tentar obter o config em formato JSON
echo "📝 Gerando public_config.json..."
npx expo config --type public --json > public_config.json 2>config_error.log || {
    echo "⚠️ Falha ao gerar config JSON, tentando sem flag --json como fallback..."
    npx expo config --type public > public_config.json 2>>config_error.log
}

# Verificar se o arquivo foi criado e tem conteúdo
if [ ! -s public_config.json ]; then
    echo "❌ [FATAL] public_config.json está vazio!"
    echo "--- LOG DE ERRO ---"
    cat config_error.log || echo "Sem log de erro disponível."
    echo "-------------------"
    exit 1
fi

BN_CHECK=$(node -e "
try {
  const fs = require('fs');
  const content = fs.readFileSync('public_config.json', 'utf8');
  const jsonStart = content.indexOf('{');
  if (jsonStart === -1) throw new Error('JSON não encontrado');
  const config = JSON.parse(content.substring(jsonStart));
  console.log(config.ios.buildNumber);
} catch (e) {
  console.error('Erro ao processar JSON:', e.message);
  process.exit(1);
}
")

if [ "$BN_CHECK" != "1190" ]; then
    echo "❌ [FATAL] Build Number Incorreto! Esperado: 1190, Encontrado: $BN_CHECK"
    exit 1
fi

echo "✅ Build Number validado no config: $BN_CHECK"

# EXPO PREBUILD
echo "🔨 Executando npx expo prebuild..."
# Usar CI=1 para evitar o warning do --non-interactive
CI=1 npx expo prebuild --platform ios --no-install || {
    echo "❌ [FATAL] expo prebuild falhou!"
    ls -la
    exit 1
}

echo "📂 Conteúdo após prebuild:"
ls -la
if [ -d "ios" ]; then
    ls -la ios
fi

echo "📦 Instalando Pods..."
if [ -d "ios" ]; then
    cd ios
    # Pod install pode falhar se não houver repo local atualizado
    echo "Running pod install..."
    pod install > pod_install.log 2>&1 || {
        echo "⚠️ Pod install falhou, tentando repo update..."
        pod repo update >> pod_install.log 2>&1
        pod install >> pod_install.log 2>&1 || {
            echo "❌ [FATAL] Pod install falhou definitivamente!"
            cat pod_install.log
            exit 1
        }
    }
    cd ..
else
    echo "❌ [FATAL] Pasta 'ios' não foi criada pelo prebuild!"
    exit 1
fi

# 🧩 ETAPA 7 — BUILD IOS LOCAL
echo "🚀 [ETAPA 7] Iniciando Build iOS LOCAL (1190)..."
export EXPO_DEBUG=1
mkdir -p build-logs

# Usar EXPO_DEBUG=1 para mais detalhes e --credentials-file para evitar prompts
if ! eas build --platform ios --local --non-interactive --profile production_v13 --credentials-file credentials.json > build-logs/local-build.log 2>&1; then
    echo "❌ [ETAPA 8] Build falhou. Analisando logs..."
    echo "--- ÚLTIMAS 100 LINHAS DO LOG DE BUILD ---"
    tail -n 100 build-logs/local-build.log || cat build-logs/local-build.log
    echo "------------------------------------------"
    if grep -q "xcodebuild failed" build-logs/local-build.log; then
        echo "🔄 Tentando correção automática e retry..."
        rm -rf ios/build
        eas build --platform ios --local --non-interactive --profile production_v13 --credentials-file credentials.json
    else
        exit 1
    fi
fi

# 🧩 ETAPA 9 — VALIDAÇÃO FINAL
echo "✅ [ETAPA 9] Validando IPA gerada..."
LATEST_IPA=$(ls -t build-*.ipa 2>/dev/null | head -n 1 || ls -t *.ipa 2>/dev/null | head -n 1 || echo "")

if [ -z "$LATEST_IPA" ]; then
    echo "❌ [FATAL] IPA não encontrada!"
    ls -la
    exit 1
fi

echo "💎 IPA Encontrada: $LATEST_IPA"

# Extrair Info.plist para conferir build number real
unzip -p "$LATEST_IPA" "Payload/*.app/Info.plist" > extracted_info.plist
ACTUAL_BN=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" extracted_info.plist)

if [ "$ACTUAL_BN" != "1190" ]; then
    echo "❌ [FATAL] IPA gerada com Build Number errado: $ACTUAL_BN (Esperado: 1190)"
    exit 1
fi

echo "✅ IPA Validada com Sucesso (Build 1190)!"
ls -lh *.ipa || echo "Nenhum IPA no root"

# 🧩 ETAPA 10 — SUBMISSÃO EXPLICITA
echo "📤 [ETAPA 10] Enviando para TestFlight..."
eas submit -p ios --path "$LATEST_IPA" --profile production_v13 --non-interactive
