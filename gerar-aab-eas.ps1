# Script para gerar arquivo AAB usando EAS Build (recomendado para projetos Expo)

Write-Host "=== Geracao de AAB para Google Play Store via EAS Build ===" -ForegroundColor Cyan
Write-Host "Iniciando processo de geracao do arquivo AAB para o aplicativo Acucaradas Encomendas..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o EAS CLI esta instalado
try {
    $easVersion = npx eas --version
    Write-Host "EAS CLI versao $easVersion encontrado." -ForegroundColor Green
} catch {
    Write-Host "EAS CLI nao encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g eas-cli
}

# Verificar se o usuario esta logado no EAS
Write-Host "Verificando login no EAS..." -ForegroundColor Yellow
$easWhoami = npx eas whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "Voce precisa fazer login no EAS para continuar." -ForegroundColor Yellow
    Write-Host "Executando: npx eas login" -ForegroundColor Yellow
    npx eas login
    
    # Verificar novamente se o login foi bem-sucedido
    $easWhoami = npx eas whoami
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha ao fazer login no EAS. Por favor, tente manualmente com 'npx eas login'." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Logado como: $easWhoami" -ForegroundColor Green

# Verificar se o projeto esta configurado no EAS
Write-Host "Verificando configuracao do projeto no EAS..." -ForegroundColor Yellow
try {
    # Tentar inicializar o projeto no EAS (isso nao vai sobrescrever se ja estiver configurado)
    npx eas project:init --non-interactive
    Write-Host "Projeto configurado no EAS." -ForegroundColor Green
} catch {
    Write-Host "Aviso: Houve um problema ao configurar o projeto no EAS. Tentando continuar..." -ForegroundColor Yellow
}

# Verificar se ha alteracoes nao commitadas
Write-Host "Verificando se ha alteracoes nao commitadas..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "AVISO: Existem alteracoes nao commitadas no repositorio." -ForegroundColor Yellow
    Write-Host "O EAS Build requer um repositorio limpo para funcionar corretamente." -ForegroundColor Yellow
    
    $commitChanges = Read-Host "Deseja fazer commit das alteracoes atuais? (S/N)"
    if ($commitChanges -eq "S" -or $commitChanges -eq "s") {
        git add .
        git commit -m "Preparacao para build via EAS"
        Write-Host "Alteracoes commitadas com sucesso." -ForegroundColor Green
    } else {
        Write-Host "Continuando sem commit. O build pode falhar se houver alteracoes importantes." -ForegroundColor Yellow
    }
}

# Iniciar o build do AAB via EAS
Write-Host ""
Write-Host "Iniciando build do AAB via EAS..." -ForegroundColor Cyan
Write-Host "Executando: npx eas build -p android --profile production" -ForegroundColor Yellow

try {
    npx eas build -p android --profile production
    
    Write-Host ""
    Write-Host "Build iniciado com sucesso!" -ForegroundColor Green
    Write-Host "O processo de build sera executado nos servidores da Expo." -ForegroundColor Green
    Write-Host "Voce pode acompanhar o progresso no console do EAS: https://expo.dev/accounts/[seu-usuario]/projects/[seu-projeto]/builds" -ForegroundColor Green
    Write-Host "Quando o build for concluido, voce podera baixar o arquivo AAB diretamente do console do EAS." -ForegroundColor Green
} catch {
    Write-Host "Erro ao iniciar o build via EAS: $_" -ForegroundColor Red
    Write-Host "Verifique se o arquivo eas.json esta configurado corretamente." -ForegroundColor Yellow
    Write-Host "Consulte a documentacao: https://docs.expo.dev/build/setup/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Processo de geracao de AAB via EAS iniciado ===" -ForegroundColor Cyan
Write-Host ""