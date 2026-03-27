#!/bin/bash
set -ex # Fail fast and verbose

echo "🚀 Iniciando RellBuild Prebuild Checks..."

echo "1️⃣ Validando Variáveis de Ambiente..."
if [ -z "$EXPO_TOKEN" ]; then
  echo "❌ EXPO_TOKEN ausente."
  exit 1
fi
echo "✅ EXPO_TOKEN validado."

echo "2️⃣ Validando Arquivos do Firebase..."
# Listar arquivos existentes para debug
ls -la google-services.json GoogleService-Info.plist 2>/dev/null || echo "⚠️ Arquivos do Firebase não encontrados no diretório root."

# Função para validar arquivo gerado
validate_file() {
  if [ ! -s "$1" ]; then
    echo "❌ Erro: Arquivo $1 está vazio ou não foi gerado corretamente!"
    exit 1
  fi
  echo "✅ Arquivo $1 validado com sucesso (Tamanho: $(wc -c < "$1") bytes)."
}

# Injeção de google-services.json (Android)
if [ -f "google-services.json" ] && [ -s "google-services.json" ]; then
  echo "✅ google-services.json já existe e não está vazio."
elif [ -n "$GOOGLE_SERVICES_JSON_BASE64" ]; then
  echo "⚠️ Injetando google-services.json via base64..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -D > google-services.json
  else
    echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 --decode > google-services.json
  fi
  validate_file "google-services.json"
elif [ -n "$GOOGLE_SERVICES_JSON" ]; then
  echo "⚠️ Injetando google-services.json via raw JSON..."
  printf "%s" "$GOOGLE_SERVICES_JSON" > google-services.json
  validate_file "google-services.json"
else
  echo "❌ google-services.json não encontrado (nem arquivo, nem ENV var)!"
  exit 1
fi

# Injeção de GoogleService-Info.plist (iOS)
if [ -f "GoogleService-Info.plist" ] && [ -s "GoogleService-Info.plist" ]; then
  echo "✅ GoogleService-Info.plist já existe e não está vazio."
elif [ -n "$GOOGLE_SERVICE_INFO_PLIST_BASE64" ]; then
  echo "⚠️ Injetando GoogleService-Info.plist via base64..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "$GOOGLE_SERVICE_INFO_PLIST_BASE64" | base64 -D > GoogleService-Info.plist
  else
    echo "$GOOGLE_SERVICE_INFO_PLIST_BASE64" | base64 --decode > GoogleService-Info.plist
  fi
  validate_file "GoogleService-Info.plist"
elif [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
  echo "⚠️ Injetando GoogleService-Info.plist via raw content..."
  printf "%s" "$GOOGLE_SERVICE_INFO_PLIST" > GoogleService-Info.plist
  validate_file "GoogleService-Info.plist"
else
  echo "❌ GoogleService-Info.plist não encontrado (nem arquivo, nem ENV var)!"
  exit 1
fi

echo "3️⃣ Validando Configuração do Expo..."
# Tentar rodar expo config --json. Se falhar, mostrar o erro.
npx expo config --json || { echo "❌ Erro crítico na configuração do Expo!"; exit 1; }
echo "✅ Configuração do Expo válida."

echo "4️⃣ Validando Dependências Críticas..."
if [ ! -f "package.json" ]; then
  echo "❌ package.json não encontrado!"
  exit 1
fi

# Usar node para validar se as dependências estão no package.json
node -e "
const pkg = require('./package.json');
const deps = {...pkg.dependencies, ...pkg.devDependencies};
const critical = ['onesignal-expo-plugin', '@stripe/stripe-react-native', 'expo'];
critical.forEach(d => {
  if (!deps[d]) {
    console.error('❌ ' + d + ' não encontrado em package.json.');
    process.exit(1);
  }
});
console.log('✅ Dependências críticas validadas.');
"

echo "5️⃣ Teste de Sanity (Imports e Init)..."
# Verificar existência de arquivos vitais
if [ -f "src/App.tsx" ] || [ -f "App.js" ] || [ -f "App.tsx" ]; then
  echo "✅ Ponto de entrada do app encontrado."
else
  echo "❌ Ponto de entrada do app não encontrado (App.js/App.tsx/src/App.tsx)!"
  exit 1
fi

echo "✅ Todos os checks pré-build passaram com sucesso!"
