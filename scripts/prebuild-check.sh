#!/bin/bash

# 🚀 scripts/prebuild-check.sh - Validador Enterprise de Ambiente
set -e

echo "🔍 Iniciando Validação de Ambiente iOS (Enterprise)..."

# 1. Validar Variáveis Obrigatórias
vars=("EXPO_TOKEN" "EXPO_ASC_KEY_ID" "EXPO_ASC_ISSUER_ID" "EXPO_ASC_PRIVATE_KEY" "EXPO_APPLE_TEAM_ID")

for var in "${vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ ERRO CRÍTICO: Variável $var não encontrada!"
    exit 1
  fi
done

echo "✅ Variáveis de ambiente verificadas."

# 2. Validar Formato da Private Key
if [[ "$EXPO_ASC_PRIVATE_KEY" != *"BEGIN PRIVATE KEY"* ]] || [[ "$EXPO_ASC_PRIVATE_KEY" != *"END PRIVATE KEY"* ]]; then
  echo "❌ ERRO CRÍTICO: Formato da EXPO_ASC_PRIVATE_KEY inválido!"
  echo "👉 A chave deve conter os cabeçalhos BEGIN/END PRIVATE KEY."
  exit 1
fi

echo "✅ Formato da Private Key validado."

# 3. Preparar arquivo AuthKey.p8 (Multiline Safe)
echo "$EXPO_ASC_PRIVATE_KEY" | sed 's/\\n/\n/g' > AuthKey.p8
if [ ! -s AuthKey.p8 ]; then
  echo "❌ ERRO: Falha ao gerar AuthKey.p8."
  exit 1
fi

echo "✅ AuthKey.p8 gerado com sucesso."

# 4. Bloquear fallbacks de credenciais locais
unset IOS_DIST_CERT_BASE64 IOS_PROV_PROFILE_BASE64 IOS_CERT_PASSWORD
unset EXPO_APPLE_ID EXPO_APPLE_PASSWORD EXPO_APPLE_APP_SPECIFIC_PASSWORD

echo "🛡️ Hardening concluído: Fallbacks bloqueados."
echo "🚀 Tudo pronto para o build."
