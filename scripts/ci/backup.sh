#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE BACKUP DIÁRIO - Açucaradas Encomendas
# Objetivo: Garantir rollback seguro do código antes de mudanças destrutivas.
# Execução: bash scripts/ci/backup.sh
# ==============================================================================

set -eo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/acucaradas_src_$TIMESTAMP.tar.gz"

echo "🛡️ [BLINDAGEM] Iniciando backup local..."
mkdir -p "$BACKUP_DIR"

# Cria um arquivo compactado (ignora dependências pesadas, lixo de build e git)
tar -czf "$BACKUP_FILE" \
  --exclude="./node_modules" \
  --exclude="./.git" \
  --exclude="./.expo" \
  --exclude="./ios" \
  --exclude="./android" \
  --exclude="./backups" \
  --exclude="./build-logs" \
  .

# Valida se o arquivo foi criado
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup concluído com sucesso: $BACKUP_FILE ($SIZE)"
    echo "ℹ️  Guarde este arquivo em nuvem segura ou storage externo."
else
    echo "❌ Erro ao criar o backup."
    exit 1
fi
