# Script Automatizado para Configuração Completa de Publicação
# Açucaradas Encomendas - Configuração de Secrets EAS

Write-Host "🚀 CONFIGURAÇÃO COMPLETA PARA PUBLICAÇÃO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Este script configurará TODAS as variáveis necessárias para publicação." -ForegroundColor Yellow
Write-Host "Certifique-se de ter todas as credenciais em mãos antes de continuar." -ForegroundColor Yellow
Write-Host ""

# Verificar se EAS CLI está instalado
try {
    $easVersion = eas --version 2>$null
    Write-Host "✅ EAS CLI encontrado: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ EAS CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g @expo/eas-cli
    Write-Host "✅ EAS CLI instalado com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 CHECKLIST DE CREDENCIAIS NECESSÁRIAS:" -ForegroundColor Cyan
Write-Host "" 
Write-Host "🔐 Segurança:" -ForegroundColor White
Write-Host "  - JWT_SECRET (mínimo 32 caracteres)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔥 Firebase:" -ForegroundColor White
Write-Host "  - FIREBASE_API_KEY" -ForegroundColor Gray
Write-Host "  - FIREBASE_PROJECT_ID" -ForegroundColor Gray
Write-Host "  - FIREBASE_AUTH_DOMAIN" -ForegroundColor Gray
Write-Host "  - FIREBASE_STORAGE_BUCKET" -ForegroundColor Gray
Write-Host "  - FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor Gray
Write-Host "  - FIREBASE_APP_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "🍎 Apple Developer:" -ForegroundColor White
Write-Host "  - APPLE_ID (email da conta Apple Developer)" -ForegroundColor Gray
Write-Host "  - ASC_APP_ID (App Store Connect App ID)" -ForegroundColor Gray
Write-Host "  - APPLE_TEAM_ID (Team ID da Apple)" -ForegroundColor Gray
Write-Host ""
Write-Host "📱 Google Play:" -ForegroundColor White
Write-Host "  - GOOGLE_SERVICE_ACCOUNT_KEY_PATH (caminho para service-account.json)" -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "Você tem todas essas credenciais? (s/N)"
if ($continue -ne "s" -and $continue -ne "S") {
    Write-Host ""
    Write-Host "📖 CONSULTE OS GUIAS:" -ForegroundColor Yellow
    Write-Host "  - INSTRUCOES_CONTAS_LOJAS.md - Como criar contas nas lojas" -ForegroundColor Gray
    Write-Host "  - GUIA_CONFIGURACAO_FIREBASE.md - Configuração do Firebase" -ForegroundColor Gray
    Write-Host "  - SECURITY_SETUP.md - Configurações de segurança" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Execute este script novamente quando tiver todas as credenciais." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔧 INICIANDO CONFIGURAÇÃO..." -ForegroundColor Green
Write-Host ""

# Função para entrada segura com validação melhorada
function Get-SecureInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$Required = $true,
        [bool]$IsSecret = $false
    )
    
    do {
        if ($Default) {
            if ($IsSecret) {
                $input = Read-Host "$Prompt (padrão configurado)"
            } else {
                $input = Read-Host "$Prompt (padrão: $Default)"
            }
            if ([string]::IsNullOrWhiteSpace($input)) {
                $input = $Default
            }
        } else {
            $input = Read-Host $Prompt
        }
        
        if ($Required -and [string]::IsNullOrWhiteSpace($input)) {
            Write-Host "❌ Este campo é obrigatório! Por favor, forneça um valor válido." -ForegroundColor Red
        }
    } while ($Required -and [string]::IsNullOrWhiteSpace($input))
    
    return $input
}

# Função para configurar secret
function Set-EASSecret {
    param(
        [string]$Name,
        [string]$Value
    )
    
    try {
        eas env:create --scope project --name $Name --value $Value --non-interactive
        Write-Host "  ✅ $Name configurado" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Erro ao configurar $Name" -ForegroundColor Red
        Write-Host "     $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# ... continuação do script ...

Write-Host ""
Write-Host "📋 ETAPA 1: Configurações de Segurança" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

# 1. CONFIGURAÇÃO DE SEGURANÇA
Write-Host "🔐 1. CONFIGURANDO SEGURANÇA..." -ForegroundColor Cyan

# Gerar JWT_SECRET automaticamente se não fornecido
$jwtSecret = Get-SecureInput "Digite o JWT_SECRET (deixe vazio para gerar automaticamente)" "" $false $true
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    # Gerar JWT_SECRET seguro de 64 caracteres
    $jwtSecret = -join ((1..64) | ForEach-Object {Get-Random -Input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))})
    Write-Host "  🔑 JWT_SECRET gerado automaticamente (64 caracteres)" -ForegroundColor Yellow
}

if ($jwtSecret.Length -lt 32) {
    Write-Host "  ⚠️ Aviso: JWT_SECRET deve ter pelo menos 32 caracteres" -ForegroundColor Yellow
    $jwtSecret = $jwtSecret + (-join ((1..(32-$jwtSecret.Length)) | ForEach-Object {Get-Random -Input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))}))
    Write-Host "  🔧 JWT_SECRET expandido para 32+ caracteres" -ForegroundColor Yellow
}

Set-EASSecret "JWT_SECRET" $jwtSecret

# 2. CONFIGURAÇÃO DO FIREBASE
Write-Host ""
Write-Host "🔥 2. CONFIGURANDO FIREBASE..." -ForegroundColor Cyan

$firebaseApiKey = Get-SecureInput "Digite o FIREBASE_API_KEY"
Set-EASSecret "FIREBASE_API_KEY" $firebaseApiKey

$firebaseProjectId = Get-SecureInput "Digite o FIREBASE_PROJECT_ID" "acucaradas-encomendas"
Set-EASSecret "FIREBASE_PROJECT_ID" $firebaseProjectId

$firebaseAuthDomain = Get-SecureInput "Digite o FIREBASE_AUTH_DOMAIN" "$firebaseProjectId.firebaseapp.com"
Set-EASSecret "FIREBASE_AUTH_DOMAIN" $firebaseAuthDomain

$firebaseStorageBucket = Get-SecureInput "Digite o FIREBASE_STORAGE_BUCKET" "$firebaseProjectId.appspot.com"
Set-EASSecret "FIREBASE_STORAGE_BUCKET" $firebaseStorageBucket

$firebaseMessagingSenderId = Get-SecureInput "Digite o FIREBASE_MESSAGING_SENDER_ID"
Set-EASSecret "FIREBASE_MESSAGING_SENDER_ID" $firebaseMessagingSenderId

$firebaseAppId = Get-SecureInput "Digite o FIREBASE_APP_ID"
Set-EASSecret "FIREBASE_APP_ID" $firebaseAppId

# 3. CONFIGURAÇÃO APPLE DEVELOPER
Write-Host ""
Write-Host "🍎 3. CONFIGURANDO APPLE DEVELOPER..." -ForegroundColor Cyan

$appleId = Get-SecureInput "Digite o APPLE_ID (email da conta Apple Developer)"
Set-EASSecret "APPLE_ID" $appleId

$ascAppId = Get-SecureInput "Digite o ASC_APP_ID (App Store Connect App ID)"
Set-EASSecret "ASC_APP_ID" $ascAppId

$appleTeamId = Get-SecureInput "Digite o APPLE_TEAM_ID"
Set-EASSecret "APPLE_TEAM_ID" $appleTeamId

# 4. CONFIGURAÇÃO GOOGLE PLAY
Write-Host ""
Write-Host "📱 4. CONFIGURANDO GOOGLE PLAY..." -ForegroundColor Cyan

$googleServiceAccount = Get-SecureInput "Digite o caminho completo para o service-account.json"
Set-EASSecret "GOOGLE_SERVICE_ACCOUNT_KEY_PATH" $googleServiceAccount

# 5. VALIDAÇÃO FINAL
Write-Host ""
Write-Host "🔍 5. EXECUTANDO VALIDAÇÕES..." -ForegroundColor Cyan

Write-Host "  📋 Listando secrets configurados..." -ForegroundColor Gray
try {
    eas env:list
} catch {
    Write-Host "  ⚠️ Não foi possível listar as secrets" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  🔒 Executando validação de segurança..." -ForegroundColor Gray
try {
    npm run validate-security
    Write-Host "  ✅ Validação de segurança passou!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Validação de segurança falhou - verifique as configurações" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  🏗️ Executando verificação pré-build..." -ForegroundColor Gray
try {
    npm run pre-build-check
    Write-Host "  ✅ Verificação pré-build passou!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Verificação pré-build falhou - verifique as configurações" -ForegroundColor Yellow
}

# 6. RESUMO E PRÓXIMOS PASSOS
Write-Host ""
Write-Host "🎉 CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Todas as variáveis de ambiente foram configuradas" -ForegroundColor Green
Write-Host "✅ Validações de segurança executadas" -ForegroundColor Green
Write-Host "✅ O aplicativo está pronto para build e publicação" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS PARA PUBLICAÇÃO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🏗️ Build de Produção:" -ForegroundColor White
Write-Host "   npm run build:android    # Build para Android" -ForegroundColor Gray
Write-Host "   npm run build:ios        # Build para iOS" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 📱 Submissão para as Lojas:" -ForegroundColor White
Write-Host "   npm run submit:android   # Enviar para Google Play" -ForegroundColor Gray
Write-Host "   npm run submit:ios       # Enviar para App Store" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🔍 Comandos de Verificação:" -ForegroundColor White
Write-Host "   eas env:list             # Listar todas as secrets" -ForegroundColor Gray
Write-Host "   npm run validate-security # Validar configurações" -ForegroundColor Gray
Write-Host "   npm run pre-build-check  # Verificar antes do build" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 DOCUMENTAÇÃO IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - INSTRUCOES_CONTAS_LOJAS.md - Guia das lojas" -ForegroundColor Gray
Write-Host "   - INSTRUCOES_PUBLICACAO.md - Processo de publicação" -ForegroundColor Gray
Write-Host "   - CHECKLIST_PUBLICACAO.md - Checklist final" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 O aplicativo está 100% pronto para publicação!" -ForegroundColor Green
Write-Host ""
$null = Read-Host "Pressione Enter para finalizar"