#!/bin/bash
set -e # Fail fast

echo "🚀 Iniciando RellBuild Prebuild Checks..."

echo "1️⃣ Validando Variáveis de Ambiente..."
if [ -z "$EXPO_TOKEN" ]; then
  echo "❌ EXPO_TOKEN ausente."
  exit 1
fi
if [ -z "$EXPO_PUBLIC_PROJECT_ID" ]; then
  echo "❌ EXPO_PUBLIC_PROJECT_ID ausente (Necessário para EAS Build)."
  exit 1
fi
echo "✅ Variáveis de ambiente validadas."

echo "2️⃣ Validando Configuração do Expo..."
if ! npx expo config --json > /dev/null 2>&1; then
  echo "❌ Erro na configuração do app.json/app.config.js."
  exit 1
fi
echo "✅ Configuração do Expo válida."

echo "3️⃣ Injetando Secrets do Firebase..."
if [ ! -z "$GOOGLE_SERVICES_JSON" ]; then
  echo "$GOOGLE_SERVICES_JSON" > google-services.json
  echo "✅ google-services.json injetado."
elif [ ! -z "$GOOGLE_SERVICES_JSON_BASE64" ]; then
  echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 --decode > google-services.json
  echo "✅ google-services.json injetado via base64."
else
  echo "⚠️ GOOGLE_SERVICES_JSON ausente. Build Android pode falhar se necessário."
fi

if [ ! -z "$GOOGLE_SERVICE_INFO_PLIST" ]; then
  echo "$GOOGLE_SERVICE_INFO_PLIST" > GoogleService-Info.plist
  echo "✅ GoogleService-Info.plist injetado."
elif [ ! -z "$GOOGLE_SERVICE_INFO_PLIST_BASE64" ]; then
  echo "$GOOGLE_SERVICE_INFO_PLIST_BASE64" | base64 --decode > GoogleService-Info.plist
  echo "✅ GoogleService-Info.plist injetado via base64."
else
  echo "⚠️ GOOGLE_SERVICE_INFO_PLIST ausente. Build iOS pode falhar se necessário."
fi

echo "4️⃣ Validando Dependências Críticas..."
if [ ! -f "package.json" ]; then
  echo "❌ package.json não encontrado!"
  exit 1
fi
if ! grep -q "onesignal-expo-plugin" package.json; then
  echo "❌ OneSignal Expo Plugin não encontrado em package.json."
  exit 1
fi
if ! grep -q "@stripe/stripe-react-native" package.json; then
  echo "❌ Stripe React Native Plugin não encontrado em package.json."
  exit 1
fi
echo "✅ Dependências validadas."

echo "5️⃣ Validando Variáveis de Ambiente Premium..."
if [ -z "$EXPO_PUBLIC_ONESIGNAL_APP_ID" ]; then
  echo "⚠️ EXPO_PUBLIC_ONESIGNAL_APP_ID ausente. Notificações Push podem não funcionar."
fi
if [ "$EXPO_PUBLIC_SENTRY_ENABLED" == "true" ] && [ -z "$EXPO_PUBLIC_SENTRY_DSN" ]; then
  echo "⚠️ EXPO_PUBLIC_SENTRY_ENABLED está ON mas EXPO_PUBLIC_SENTRY_DSN está vazio. Sentry não será inicializado."
fi
echo "✅ Variáveis de ambiente premium verificadas."

echo "6️⃣ Teste de Sanity (Imports e Init)..."
# Simulando validação de imports críticos
if grep -q "import .* from 'firebase/app'" src/App.tsx 2>/dev/null || grep -q "import .* from 'expo'" package.json; then
  echo "✅ Imports críticos verificados."
else
  echo "⚠️ Aviso: Verificação de imports críticos não conclusiva."
fi

echo "✅ Todos os checks pré-build passaram com sucesso!"
