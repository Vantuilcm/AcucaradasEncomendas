#!/bin/bash
set -e # Fail fast

echo "🚀 Iniciando RellBuild Prebuild Checks..."

echo "1️⃣ Validando Variáveis de Ambiente..."
if [ -z "$EXPO_TOKEN" ]; then
  echo "❌ EXPO_TOKEN ausente."
  exit 1
fi
echo "✅ EXPO_TOKEN validado."

echo "2️⃣ Validando Arquivos do Firebase..."
# Verificar se os arquivos foram criados no root (injetados pelo workflow)
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
if ! npx expo config --json > config.output.json 2>config.error.txt; then
  echo "❌ Erro na configuração do app.json/app.config.js."
  cat config.error.txt
  exit 1
fi
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
