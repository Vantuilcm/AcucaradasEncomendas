#!/bin/bash
set -e # Fail fast

echo "🚀 Iniciando RellBuild Prebuild Checks... (Build triggered after secret update)"
# Removido ls -la excessivo para limpar logs CI

echo "1️⃣ Validando Variáveis de Ambiente..."
if [ -n "$EXPO_TOKEN" ]; then echo "✅ EXPO_TOKEN está presente."; else echo "❌ EXPO_TOKEN ausente."; fi
if [ -n "$GOOGLE_SERVICES_JSON" ]; then echo "✅ GOOGLE_SERVICES_JSON está presente."; fi
if [ -n "$GOOGLE_SERVICES_JSON_BASE64" ]; then echo "✅ GOOGLE_SERVICES_JSON_BASE64 está presente."; fi
if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then echo "✅ GOOGLE_SERVICE_INFO_PLIST está presente."; fi
if [ -n "$GOOGLE_SERVICE_INFO_PLIST_BASE64" ]; then echo "✅ GOOGLE_SERVICE_INFO_PLIST_BASE64 está presente."; fi

if [ -z "$EXPO_TOKEN" ]; then
  echo "❌ Erro Crítico: EXPO_TOKEN ausente. O build não pode continuar sem o token da Expo."
  exit 1
fi

echo "2️⃣ Validando Arquivos do Firebase..."
# Listar arquivos existentes apenas se existirem
[ -f "google-services.json" ] && echo "✅ google-services.json encontrado localmente."
[ -f "GoogleService-Info.plist" ] && echo "✅ GoogleService-Info.plist encontrado localmente."

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
  echo "❌ ERRO CRÍTICO: google-services.json não encontrado!"
  echo "DICA: Certifique-se de que a secret GOOGLE_SERVICES_JSON (ou GOOGLE_SERVICES_JSON_BASE64) está configurada no GitHub Actions."
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
# Tentar rodar expo config. Se falhar, mostrar o erro.
npx expo config --json --verbose || { echo "❌ Erro crítico na configuração do Expo!"; npx expo config --json; exit 1; }
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
