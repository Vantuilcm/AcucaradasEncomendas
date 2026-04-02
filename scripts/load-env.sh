#!/usr/bin/env bash

# 🛡️ scripts/load-env.sh - O Sincronizador de Variáveis EXPO_PUBLIC_*
# Missão: Mapear e exportar automaticamente todas as variáveis necessárias para o runtime do Expo no CI.

echo "🔍 [LOAD-ENV] Iniciando mapeamento automático de variáveis..."

# Lista de variáveis EXPO_PUBLIC_* extraídas do src/config/env.ts
EXPO_PUBLIC_VARS=(
  "EXPO_PUBLIC_API_URL"
  "EXPO_PUBLIC_PROJECT_ID"
  "EXPO_PUBLIC_APP_NAME"
  "EXPO_PUBLIC_FIREBASE_API_KEY"
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "EXPO_PUBLIC_FIREBASE_APP_ID"
  "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
  "EXPO_PUBLIC_FIREBASE_DATABASE_URL"
  "EXPO_PUBLIC_ONESIGNAL_APP_ID"
  "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "EXPO_PUBLIC_MONITORING_REMOTE_ENABLED"
)

# Outras variáveis críticas do EAS/Apple
CRITICAL_VARS=(
  "EXPO_TOKEN"
  "EXPO_ASC_KEY_ID"
  "EXPO_ASC_ISSUER_ID"
  "EXPO_ASC_PRIVATE_KEY"
  "EXPO_ASC_PRIVATE_KEY_BASE64"
  "EXPO_APPLE_TEAM_ID"
)

ALL_VARS=("${EXPO_PUBLIC_VARS[@]}" "${CRITICAL_VARS[@]}")

COUNT=0
MISSING=0

for VAR_NAME in "${ALL_VARS[@]}"; do
    # Verifica se a variável existe no ambiente (GitHub Secrets injetados como ENV)
    if [ -n "${!VAR_NAME:-}" ]; then
        # Se estivermos no GitHub Actions, garantir que ela esteja no GITHUB_ENV para passos subsequentes
        if [ -n "${GITHUB_ENV:-}" ]; then
            # Tratar multiline para chaves privadas
            if [[ "$VAR_NAME" == *"PRIVATE_KEY"* ]]; then
                echo "$VAR_NAME<<EOF" >> "$GITHUB_ENV"
                echo "${!VAR_NAME}" >> "$GITHUB_ENV"
                echo "EOF" >> "$GITHUB_ENV"
            else
                echo "$VAR_NAME=${!VAR_NAME}" >> "$GITHUB_ENV"
            fi
        fi
        COUNT=$((COUNT + 1))
    else
        # Apenas loga como aviso, o validate-env.js fará o fail fast definitivo
        echo "⚠️ [WARN] Variável $VAR_NAME não encontrada no ambiente."
        MISSING=$((MISSING + 1))
    fi
done

echo "✅ [LOAD-ENV] Mapeamento concluído: $COUNT variáveis carregadas, $MISSING ausentes."
echo "------------------------------------------------------------"
