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
ls -la google-services.json GoogleService-Info.plist || echo "⚠️ Alguns arquivos do Firebase podem estar ausentes no root."

if [ -f "google-services.json" ]; then
  echo "✅ google-services.json encontrado."
else
  echo "❌ google-services.json não encontrado!"
  exit 1
fi

if [ -f "GoogleService-Info.plist" ]; then
  echo "✅ GoogleService-Info.plist encontrado."
else
  echo "❌ GoogleService-Info.plist não encontrado!"
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
