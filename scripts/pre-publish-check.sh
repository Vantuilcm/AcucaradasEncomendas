#!/bin/bash

# Script para realizar todas as verificações pré-publicação
# Este script executa as verificações necessárias antes da publicação do app

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
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

# Função para exibir títulos de seção
print_section() {
  echo -e "\n${MAGENTA}${BOLD}### $1 ###${NC}\n"
}

# Verificar Git
check_git() {
  print_section "VERIFICANDO INSTALAÇÃO DO GIT"
  
  npm run check:git
  
  if [ $? -ne 0 ]; then
    print_error "Verificação do Git falhou. Instale o Git antes de continuar."
    return 1
  else
    print_success "Git está configurado corretamente."
    return 0
  fi
}

# Verificar assets da loja
check_store_assets() {
  print_section "VERIFICANDO ASSETS GRÁFICOS PARA AS LOJAS"
  
  npm run check:store-assets
  
  if [ $? -ne 0 ]; then
    print_warning "Alguns assets gráficos estão pendentes. Veja o arquivo ASSETS_PENDENTES.md para detalhes."
    return 1
  else
    print_success "Todos os assets gráficos necessários estão prontos."
    return 0
  }
}

# Verificar integrações externas
check_integrations() {
  print_section "VERIFICANDO INTEGRAÇÕES EXTERNAS"
  
  npm run check:integrations
  
  if [ $? -eq 0 ]; then
    print_success "Todas as integrações externas estão configuradas corretamente para produção."
    return 0
  elif [ $? -eq 2 ]; then
    print_warning "Integrações configuradas, mas nem todas estão em ambiente de produção."
    return 1
  else
    print_error "Há problemas com as integrações externas. Consulte GUIA_CONFIGURACAO_PRODUCAO.md."
    return 1
  fi
}

# Verificar builds de teste
check_builds() {
  print_section "VERIFICANDO CONFIGURAÇÃO DE BUILDS"
  
  npm run eas:check
  
  if [ $? -ne 0 ]; then
    print_error "Há problemas com a configuração do EAS."
    return 1
  else
    print_success "Configuração do EAS está correta."
    
    print_status "Deseja executar builds de teste agora? (Isso pode levar algum tempo)"
    read -p "Executar builds de teste? (s/n): " choice
    
    if [[ $choice == "s" || $choice == "S" ]]; then
      npm run test:builds
    else
      print_status "Builds de teste ignorados. Execute manualmente com 'npm run test:builds' quando desejar."
    fi
    
    return 0
  fi
}

# Verificar site para documentação legal
check_website() {
  print_section "VERIFICANDO SITE PARA DOCUMENTAÇÃO LEGAL"
  
  # Verifica se os arquivos de política de privacidade e termos de uso existem
  if [ ! -f "politica_privacidade.md" ] || [ ! -f "termos_uso.md" ]; then
    print_error "Arquivos de documentação legal não encontrados."
    return 1
  fi
  
  print_status "Os arquivos de documentação legal existem localmente."
  print_status "É necessário um website para hospedá-los publicamente."
  
  read -p "O website para documentação legal já foi implementado? (s/n): " website_ready
  
  if [[ $website_ready == "s" || $website_ready == "S" ]]; then
    read -p "Digite a URL da política de privacidade: " privacy_url
    read -p "Digite a URL dos termos de uso: " terms_url
    
    if [[ -z "$privacy_url" || -z "$terms_url" ]]; then
      print_error "URLs não fornecidas. Implemente o website e hospede os documentos legais."
      return 1
    else
      print_success "Website com documentação legal implementado."
      print_status "Política de Privacidade: $privacy_url"
      print_status "Termos de Uso: $terms_url"
      return 0
    fi
  else
    print_warning "Website para documentação legal ainda não implementado."
    print_status "Consulte o arquivo INSTRUCOES_WEBSITE.md para instruções."
    return 1
  fi
}

# Verificar contas nas lojas
check_store_accounts() {
  print_section "VERIFICANDO CONTAS NAS LOJAS"
  
  print_status "Verificando contas nas lojas de aplicativos:"
  
  read -p "Conta no Google Play Console criada? (s/n): " google_play_account
  read -p "Conta no Apple Developer Program criada? (s/n): " apple_dev_account
  
  if [[ $google_play_account == "s" || $google_play_account == "S" ]] && 
     [[ $apple_dev_account == "s" || $apple_dev_account == "S" ]]; then
    print_success "Contas nas lojas de aplicativos criadas."
    return 0
  else
    print_warning "Pelo menos uma das contas nas lojas ainda não foi criada."
    print_status "Consulte o arquivo INSTRUCOES_CONTAS_LOJAS.md para instruções."
    return 1
  fi
}

# Resumo das verificações
show_summary() {
  print_section "RESUMO DAS VERIFICAÇÕES PRÉ-PUBLICAÇÃO"
  
  echo -e "${BOLD}Resultados das verificações:${NC}"
  
  # Exibe o status de cada verificação
  echo -e "1. Git: ${git_status}"
  echo -e "2. Assets gráficos: ${assets_status}"
  echo -e "3. Integrações externas: ${integrations_status}"
  echo -e "4. Configuração de builds: ${builds_status}"
  echo -e "5. Website para documentação legal: ${website_status}"
  echo -e "6. Contas nas lojas: ${store_accounts_status}"
  
  # Conta quantos itens estão prontos
  ready_count=0
  total_count=6
  
  [[ "$git_status" == "${GREEN}PRONTO${NC}" ]] && ((ready_count++))
  [[ "$assets_status" == "${GREEN}PRONTO${NC}" ]] && ((ready_count++))
  [[ "$integrations_status" == "${GREEN}PRONTO${NC}" ]] && ((ready_count++))
  [[ "$builds_status" == "${GREEN}PRONTO${NC}" ]] && ((ready_count++))
  [[ "$website_status" == "${GREEN}PRONTO${NC}" ]] && ((ready_count++))
  [[ "$store_accounts_status" == "${GREEN}PRONTO${NC}" ]] && ((ready_count++))
  
  # Exibe o progresso geral
  progress_percent=$((ready_count * 100 / total_count))
  echo -e "\n${BOLD}Progresso geral: $progress_percent% ($ready_count/$total_count itens prontos)${NC}"
  
  # Fornece orientações finais
  if [ $ready_count -eq $total_count ]; then
    echo -e "\n${GREEN}${BOLD}O APLICATIVO ESTÁ PRONTO PARA SER PUBLICADO!${NC}"
    echo -e "Para iniciar o processo de publicação, execute:"
    echo -e "   ${BLUE}npm run build:android${NC} - Para gerar o build final para Android"
    echo -e "   ${BLUE}npm run build:ios${NC} - Para gerar o build final para iOS"
    echo -e "   ${BLUE}npm run submit:android${NC} - Para enviar o build para a Google Play Store"
    echo -e "   ${BLUE}npm run submit:ios${NC} - Para enviar o build para a App Store"
  else
    echo -e "\n${YELLOW}${BOLD}O APLICATIVO AINDA NÃO ESTÁ PRONTO PARA PUBLICAÇÃO.${NC}"
    echo -e "Por favor, complete os itens marcados como ${YELLOW}PENDENTE${NC} ou ${RED}FALTANDO${NC} acima."
    echo -e "Consulte a documentação relevante para cada item pendente."
  fi
}

# Função principal
main() {
  echo -e "${MAGENTA}${BOLD}===============================================${NC}"
  echo -e "${MAGENTA}${BOLD}  VERIFICAÇÃO PRÉ-PUBLICAÇÃO - AÇUCARADAS APP  ${NC}"
  echo -e "${MAGENTA}${BOLD}===============================================${NC}"
  
  # Executa todas as verificações e armazena os resultados
  if check_git; then
    git_status="${GREEN}PRONTO${NC}"
  else
    git_status="${RED}FALTANDO${NC}"
  fi
  
  if check_store_assets; then
    assets_status="${GREEN}PRONTO${NC}"
  else
    assets_status="${YELLOW}PENDENTE${NC}"
  fi
  
  if check_integrations; then
    integrations_status="${GREEN}PRONTO${NC}"
  else
    integrations_status="${YELLOW}PENDENTE${NC}"
  fi
  
  if check_builds; then
    builds_status="${GREEN}PRONTO${NC}"
  else
    builds_status="${YELLOW}PENDENTE${NC}"
  fi
  
  if check_website; then
    website_status="${GREEN}PRONTO${NC}"
  else
    website_status="${YELLOW}PENDENTE${NC}"
  fi
  
  if check_store_accounts; then
    store_accounts_status="${GREEN}PRONTO${NC}"
  else
    store_accounts_status="${YELLOW}PENDENTE${NC}"
  fi
  
  # Mostra o resumo final
  show_summary
}

# Executar função principal
main 