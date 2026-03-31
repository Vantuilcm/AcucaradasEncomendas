#!/usr/bin/env bash
set -euo pipefail

# 🏗️ scripts/ci/version-bump.sh - Auto-Incremento de Versão & Build Number
# Garante buildNumber único e rastreabilidade para o Git.

APP_JSON="app.json"
PLATFORM=${PLATFORM:-"ios"}

echo "[INFO] [VERSION BUMP] Iniciando incremento de build para: $PLATFORM"

# Extrair Versão e Build Number (usando grep/sed para evitar dependência de jq)
CURRENT_VERSION=$(grep -m 1 '"version":' "$APP_JSON" | cut -d'"' -f4 || echo "1.0.0")

if [ "$PLATFORM" == "ios" ]; then
    CURRENT_BUILD=$(grep -m 1 '"buildNumber":' "$APP_JSON" | cut -d'"' -f4 || echo "1")
    if [[ -z "$CURRENT_BUILD" || ! "$CURRENT_BUILD" =~ ^[0-9]+$ ]]; then
        CURRENT_BUILD=1
    fi
    NEW_BUILD=$((CURRENT_BUILD + 1))
    
    # Atualizar no app.json (substituição simples)
    # Primeiro removemos o antigo para garantir que não haja duplicatas ou erros de substituição
    sed -i "s/\"buildNumber\": \"$CURRENT_BUILD\"/\"buildNumber\": \"$NEW_BUILD\"/g" "$APP_JSON"
    echo "[INFO] iOS Build Number incrementado: $CURRENT_BUILD -> $NEW_BUILD"
    
    # Exportar para GitHub Actions
    echo "BUILD_NUMBER=$NEW_BUILD" >> $GITHUB_ENV
    echo "VERSION=$CURRENT_VERSION" >> $GITHUB_ENV
else
    # Lógica para Android (versionCode)
    CURRENT_CODE=$(grep -m 1 '"versionCode":' "$APP_JSON" | cut -d' ' -f4 | tr -d ',' || echo "1")
    if [[ -z "$CURRENT_CODE" || ! "$CURRENT_CODE" =~ ^[0-9]+$ ]]; then
        CURRENT_CODE=1
    fi
    NEW_CODE=$((CURRENT_CODE + 1))
    
    sed -i "s/\"versionCode\": $CURRENT_CODE/\"versionCode\": $NEW_CODE/g" "$APP_JSON"
    echo "[INFO] Android Version Code incrementado: $CURRENT_CODE -> $NEW_CODE"
    
    echo "BUILD_NUMBER=$NEW_CODE" >> $GITHUB_ENV
    echo "VERSION=$CURRENT_VERSION" >> $GITHUB_ENV
fi

echo "[INFO] [VERSION BUMP] Sucesso: $CURRENT_VERSION-build-$NEW_BUILD"
