#!/bin/bash

# Script para executar builds de teste do Açucaradas Encomendas
# Este script executa builds de teste para Android e iOS

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir mensagens de progresso
print_status() {
  echo -e "${BLUE}==> ${NC}$1"
}

# Função para exibir mensagens de sucesso
print_success() {
  echo -e "${GREEN}✓ ${NC}$1"
}

# Função para exibir mensagens de erro
print_error() {
  echo -e "${RED}✗ ${NC}$1"
}

# Função para exibir avisos
print_warning() {
  echo -e "${YELLOW}! ${NC}$1"
}

# Verificar instalação do Git
check_git() {
  print_status "Verificando instalação do Git..."
  
  if ! command -v git &> /dev/null; then
    print_error "Git não está instalado. Por favor, instale o Git seguindo as instruções em GUIA_INSTALACAO_GIT.md"
    exit 1
  else
    git_version=$(git --version)
    print_success "Git instalado: $git_version"
  fi
}

# Verificar instalação do Node.js
check_node() {
  print_status "Verificando Node.js e npm..."
  
  if ! command -v node &> /dev/null; then
    print_error "Node.js não está instalado. Por favor, instale o Node.js versão 18 ou superior."
    exit 1
  else
    node_version=$(node --version)
    npm_version=$(npm --version)
    print_success "Node.js instalado: $node_version"
    print_success "npm instalado: $npm_version"
  fi
}

# Verificar EAS CLI
check_eas() {
  print_status "Verificando EAS CLI..."
  
  if ! command -v eas &> /dev/null; then
    print_warning "EAS CLI não está instalado. Instalando globalmente..."
    npm install -g eas-cli
    
    if [ $? -ne 0 ]; then
      print_error "Falha ao instalar EAS CLI. Por favor, execute 'npm install -g eas-cli' manualmente."
      exit 1
    fi
  else
    eas_version=$(eas --version)
    print_success "EAS CLI instalado: $eas_version"
  fi
}

# Verificar login no EAS
check_eas_login() {
  print_status "Verificando login no EAS..."
  
  eas whoami &> /dev/null
  
  if [ $? -ne 0 ]; then
    print_warning "Não logado no EAS. Por favor, faça login:"
    eas login
    
    if [ $? -ne 0 ]; then
      print_error "Falha ao fazer login no EAS. Por favor, tente novamente mais tarde."
      exit 1
    fi
  else
    eas_user=$(eas whoami)
    print_success "Logado no EAS como: $eas_user"
  fi
}

# Limpar registros de console
clean_logs() {
  print_status "Limpando console.logs para build de teste..."
  npm run clean-logs
}

# Executar build de teste para Android
build_android_test() {
  print_status "Iniciando build de teste para Android..."
  eas build --platform android --profile test-android --non-interactive
  
  if [ $? -eq 0 ]; then
    print_success "Build de teste para Android concluído com sucesso!"
  else
    print_error "Falha no build de teste para Android. Verifique os erros acima."
  fi
}

# Executar build de teste para iOS
build_ios_test() {
  print_status "Iniciando build de teste para iOS..."
  eas build --platform ios --profile test-ios --non-interactive
  
  if [ $? -eq 0 ]; then
    print_success "Build de teste para iOS concluído com sucesso!"
  else
    print_error "Falha no build de teste para iOS. Verifique os erros acima."
  fi
}

# Função principal
main() {
  echo "=========================================================="
  echo "   Açucaradas Encomendas - Execução de Builds de Teste"
  echo "=========================================================="
  
  # Verificações iniciais
  check_git
  check_node
  check_eas
  check_eas_login
  
  # Perguntar ao usuário qual build executar
  echo ""
  echo "Qual build de teste você deseja executar?"
  echo "1) Android"
  echo "2) iOS"
  echo "3) Ambos"
  echo "4) Cancelar"
  
  read -p "Escolha uma opção (1-4): " choice
  
  case $choice in
    1)
      clean_logs
      build_android_test
      ;;
    2)
      clean_logs
      build_ios_test
      ;;
    3)
      clean_logs
      build_android_test
      build_ios_test
      ;;
    4)
      print_warning "Operação cancelada pelo usuário."
      exit 0
      ;;
    *)
      print_error "Opção inválida. Por favor, escolha 1, 2, 3 ou 4."
      exit 1
      ;;
  esac
  
  echo ""
  echo "=========================================================="
  print_status "Para ver os builds em andamento, visite:"
  echo "https://expo.dev/accounts/acucaradaencomendas/projects/acucaradas-encomendas/builds"
  echo "=========================================================="
}

# Executar função principal
main 