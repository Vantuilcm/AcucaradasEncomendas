#!/usr/bin/env bash
# HOTFIX: UTF-8 s/ BOM - 2026-04-25
# DEBUG TRIGGER: 1196-v1
# 🍎 iOSBuildGuardianAI_V2_LOCAL
# MISSÃO: Garantir build iOS LOCAL 100% independente, com Build Number dinâmico.
# V9: Usar credentials.json para evitar prompts interativos de extensões.

# Usar -x para debug total e -e para parar em erros
set -xeo pipefail

echo "🛡️ [iOS-BUILD-GUARDIAN] Iniciando Missão de Build Local V2.2 (v9)..."
echo "------------------------------------------------------------"

# Resolve EAS profile before any expo config/prebuild/build/submit.
# Workflow may set EAS_PROFILE or EAS_BUILD_PROFILE; default safely to preview.
EAS_PROFILE="${EAS_PROFILE:-${EAS_BUILD_PROFILE:-preview}}"
export EAS_PROFILE
export EAS_BUILD_PROFILE="$EAS_PROFILE"
echo "[GUARDIAN] EAS_PROFILE=${EAS_PROFILE}"
echo "[GUARDIAN] EAS_BUILD_PROFILE=${EAS_BUILD_PROFILE}"

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

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ [FATAL] Credenciais ASC API Key incompletas ou faltam variáveis obrigatórias: ${MISSING_VARS[*]}"
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

# Tentar sync. Não bloquear a pipeline neste ambiente
echo "ℹ️ EAS credentials:sync não disponível nesta versão; seguindo com credenciais configuradas."

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

if [ ! -f "version-state.json" ]; then
    echo "❌ [FATAL] version-state.json ausente. Fonte de verdade obrigatória."
    exit 1
fi

EXPECTED_BN=$(jq -r '.buildNumber' version-state.json 2>/dev/null || true)
if [ -z "${EXPECTED_BN}" ] || [ "${EXPECTED_BN}" == "null" ]; then
    echo "❌ [FATAL] version-state.json inválido ou sem buildNumber."
    exit 1
fi

echo "🔍 Build Number esperado: ${EXPECTED_BN}"

BN_CHECK=$(node - <<'NODE'
const fs = require('fs');
try {
  const buffer = fs.readFileSync('public_config.json');
  let content;
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    content = buffer.toString('utf16le');
  } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    const be = buffer.slice(2);
    const le = Buffer.alloc(be.length);
    for (let i = 0; i + 1 < be.length; i += 2) {
      le[i] = be[i + 1];
      le[i + 1] = be[i];
    }
    content = le.toString('utf16le');
  } else {
    content = buffer.toString('utf8');
  }

  // Normalize and strip any BOM before parsing
  content = content.replace(/^\uFEFF/, '').trim();
  const jsonStart = content.indexOf('{');
  if (jsonStart === -1) throw new Error('JSON não encontrado');
  content = content.substring(jsonStart);

  const config = JSON.parse(content);
  if (!config.ios || !config.ios.buildNumber) {
    throw new Error('Campo ios.buildNumber não encontrado');
  }
  console.log(config.ios.buildNumber);
} catch (e) {
  console.error('Erro ao processar public_config.json:', e.message);
  process.exit(1);
}
NODE
)

if [ "$BN_CHECK" != "$EXPECTED_BN" ]; then
    echo "❌ [FATAL] Build Number Incorreto! Esperado: ${EXPECTED_BN}, Encontrado: $BN_CHECK"
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

    echo "🧹 Limpando cache CocoaPods..."
    rm -rf ~/Library/Caches/CocoaPods
    rm -rf Pods
    rm -rf Podfile.lock
    pod cache clean --all || true

    echo "🔄 Atualizando CocoaPods Specs..."
    pod repo update >> pod_install.log 2>&1 || true

    if ! grep -q "^source 'https://cdn.cocoapods.org/'" Podfile 2>/dev/null; then
        echo "🔧 Adicionando fontes fallback no Podfile..."
        cat <<'EOF' > Podfile.tmp
source 'https://cdn.cocoapods.org/'
source 'https://github.com/CocoaPods/Specs.git'
EOF
        cat Podfile >> Podfile.tmp
        mv Podfile.tmp Podfile
        echo "✅ /ios/Podfile atualizado com fontes fallback."
    fi

    echo "📦 Instalando Pods com retry resiliente..."
    pod install --repo-update > pod_install.log 2>&1 || {
        echo "⚠️ Primeiro pod install falhou, tentando novamente após pod repo update..."
        pod repo update >> pod_install.log 2>&1 || true
        sleep 15
        pod install --repo-update >> pod_install.log 2>&1 || {
            echo "⚠️ Segundo pod install falhou, tentando última vez após aguardar..."
            sleep 30
            pod install --repo-update >> pod_install.log 2>&1 || {
                echo "❌ [FATAL] Pod install falhou definitivamente!"
                cat pod_install.log
                exit 1
            }
        }
    }
    cd ..
else
    echo "❌ [FATAL] Pasta 'ios' não foi criada pelo prebuild!"
    exit 1
fi

# 🧩 ETAPA 7 — BUILD IOS LOCAL
echo "🚀 [ETAPA 7] Iniciando Build iOS LOCAL (Build ${EXPECTED_BN})..."
export EXPO_DEBUG=1
mkdir -p build-logs

run_eas_build_with_retry() {
  local max_attempts=3
  local attempt=1

  echo "🔍 Testando DNS Expo..."
  nslookup api.expo.dev || true

  echo "🔍 Testando HTTPS Expo..."
  curl -I https://api.expo.dev || true

  until [ $attempt -gt $max_attempts ]; do
    echo "🚀 Tentativa $attempt/$max_attempts: eas build iOS local"

    if eas build --platform ios --local --non-interactive --profile "$EAS_PROFILE" > build-logs/local-build.log 2>&1; then
      echo "✅ EAS build concluído com sucesso"
      return 0
    fi

    echo "⚠️ EAS build falhou na tentativa $attempt"
    echo "--- ÚLTIMAS 50 LINHAS DO LOG DE BUILD ---"
    tail -n 50 build-logs/local-build.log || true
    echo "------------------------------------------"

    if [ $attempt -lt $max_attempts ]; then
      echo "⏳ Aguardando $((attempt * 30)) segundos antes de tentar novamente..."
      sleep $((attempt * 30))
    fi

    attempt=$((attempt + 1))
  done

  echo "❌ EAS build falhou após $max_attempts tentativas"
  return 1
}

if ! run_eas_build_with_retry; then
    echo "❌ [ETAPA 8] Build falhou permanentemente."
    exit 1
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

if [ "$ACTUAL_BN" != "$EXPECTED_BN" ]; then
        echo "❌ [FATAL] IPA gerada com Build Number errado: $ACTUAL_BN (Esperado: $EXPECTED_BN)"
        exit 1
    fi
    echo "✅ IPA Validada com Sucesso (Build $EXPECTED_BN)!"
ls -lh *.ipa || echo "Nenhum IPA no root"

# 🧩 ETAPA 10 — SUBMISSÃO EXPLICITA (skipped for preview / SKIP_SUBMIT)
if [ "${SKIP_SUBMIT:-false}" = "true" ] || [ "$EAS_PROFILE" = "preview" ]; then
  echo "[GUARDIAN] Skipping EAS submit for profile ${EAS_PROFILE} (SKIP_SUBMIT=${SKIP_SUBMIT:-false})"
else
  echo "📤 [ETAPA 10] Enviando para TestFlight..."
  eas submit -p ios --path "$LATEST_IPA" --profile "$EAS_PROFILE" --non-interactive
fi
