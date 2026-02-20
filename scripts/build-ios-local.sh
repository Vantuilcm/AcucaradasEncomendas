#!/bin/bash
# ------------------------------------------------------------------------------
# AÇUCARADAS ENCOMENDAS - iOS LOCAL BUILD & UPLOAD (EAS CREDITS SAVER)
# ------------------------------------------------------------------------------
# Este script gera o build do iOS usando o hardware local (Mac ou CI) e 
# faz o upload para o EAS, consumindo apenas a cota de "Uploaded Builds" (0/25).
# ------------------------------------------------------------------------------

set -e

PRINT_CYAN='\033[0;36m'
PRINT_GREEN='\033[0;32m'
PRINT_RED='\033[0;31m'
NC='\033[0m'

echo -e "${PRINT_CYAN}--- 🍎 INICIANDO BUILD LOCAL & UPLOAD iOS ---${NC}"

# 1. Preparação
echo -e "${PRINT_CYAN}🛠️  Preparando ambiente...${NC}"
npm run prepare:ios

# 2. Build IPA Local
# Usamos o --local para buildar no hardware atual (Mac) e não na nuvem do EAS.
# Isso economiza os créditos de build pago.
echo -e "${PRINT_CYAN}🏗️  Gerando IPA localmente (isso pode levar alguns minutos)...${NC}"
eas build --platform ios --profile production --local --non-interactive --output=./build-ios.ipa

# 3. Upload para o EAS (Consome a cota de 0/25 "Uploaded Builds")
echo -e "${PRINT_CYAN}🚀 Fazendo upload do build para o EAS/TestFlight...${NC}"
eas submit --platform ios --path=./build-ios.ipa --non-interactive

echo -e "${PRINT_GREEN}✅ PROCESSO CONCLUÍDO COM SUCESSO!${NC}"
echo -e "O build já está sendo processado pela Apple e aparecerá no TestFlight em breve."
