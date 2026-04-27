#!/bin/bash

# 🛡️ RellBuild Guard: Anomaly Detection Configurator
# Este script gera as políticas de alerta para o Google Cloud Monitoring
# focadas em detectar comportamentos anômalos (picos de tráfego, erros e abuso).

PROJECT_ID=$1
NOTIFICATION_EMAIL=$2

if [ -z "$PROJECT_ID" ] || [ -z "$NOTIFICATION_EMAIL" ]; then
    echo "Uso: ./setup-anomaly-detection.sh <project_id> <email_para_alertas>"
    exit 1
fi

echo "🚀 [RellBuild Guard] Iniciando configuração de detecção de anomalias para $PROJECT_ID..."

# 1. Criar Canal de Notificação (Email)
echo "---------------------------------------------------------"
echo "1. Criando canal de notificação por e-mail..."
cat <<EOF > email-channel.json
{
  "type": "email",
  "displayName": "RellBuild Alert Team",
  "description": "Canal para alertas de segurança e anomalias",
  "labels": {
    "email_address": "$NOTIFICATION_EMAIL"
  }
}
EOF

# gcloud alpha monitoring channels create --file=email-channel.json

echo "---------------------------------------------------------"
echo "2. Definindo política de alerta para Picos de Autenticação (Possível Brute Force):"
echo "Monitorando: firebase.googleapis.com/auth/request_count"
echo "Condição: > 100 requisições/min por IP/UID"

echo "---------------------------------------------------------"
echo "3. Definindo política de alerta para Erros 4xx no Firestore (Possível Scan/Exploit):"
echo "Monitorando: logging.googleapis.com/user/firestore_permission_denied"
echo "Condição: > 50 erros em 5 minutos"

echo "---------------------------------------------------------"
echo "4. Definindo política de alerta para Pico de Escritas no Firestore (Possível Spam/DDoS):"
echo "Monitorando: firestore.googleapis.com/document/write_count"
echo "Condição: Aumento súbito > 300% em relação à média de 24h"

echo "---------------------------------------------------------"
echo "🔍 Próximos passos (RellBuild Guard):"
echo "- Ativar Audit Logs no console do Google Cloud (IAM > Audit Logs)."
echo "- Configurar Log Sinks para o BigQuery caso deseje análise forense profunda."
echo "- Integrar com Firebase Cloud Functions para bloqueio automático de IPs suspeitos."

rm email-channel.json
