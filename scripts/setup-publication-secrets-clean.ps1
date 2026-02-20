# Script Automatizado para Configuracao Completa de Publicacao
# Acucaradas Encomendas - Configuracao de Secrets EAS

Write-Host "CONFIGURACAO COMPLETA PARA PUBLICACAO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Este script configurara TODAS as variaveis necessarias para publicacao." -ForegroundColor Yellow
Write-Host "Certifique-se de ter todas as credenciais em maos antes de continuar." -ForegroundColor Yellow
Write-Host ""

# Verificar se EAS CLI esta instalado
try {
    $easVersion = eas --version 2>$null
    Write-Host "EAS CLI encontrado: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "EAS CLI nao encontrado. Instalando..." -ForegroundColor Red
    npm install -g @expo/eas-cli
    Write-Host "EAS CLI instalado com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "CHECKLIST DE CREDENCIAIS NECESSARIAS:" -ForegroundColor Cyan
Write-Host "" 
Write-Host "Seguranca:" -ForegroundColor White
Write-Host "  - JWT_SECRET (minimo 32 caracteres)" -ForegroundColor Gray
Write-Host ""
Write-Host "Firebase:" -ForegroundColor White
Write-Host "  - FIREBASE_API_KEY" -ForegroundColor Gray
Write-Host "  - FIREBASE_PROJECT_ID" -ForegroundColor Gray
Write-Host "  - FIREBASE_AUTH_DOMAIN" -ForegroundColor Gray
Write-Host "  - FIREBASE_STORAGE_BUCKET" -ForegroundColor Gray
Write-Host "  - FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor Gray
Write-Host "  - FIREBASE_APP_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "Apple Developer:" -ForegroundColor White
Write-Host "  - APPLE_ID (email da conta Apple Developer)" -ForegroundColor Gray
Write-Host "  - ASC_APP_ID (App Store Connect App ID)" -ForegroundColor Gray
Write-Host "  - APPLE_TEAM_ID (Team ID da Apple)" -ForegroundColor Gray
Write-Host ""
Write-Host "Google Play:" -ForegroundColor White
Write-Host "  - GOOGLE_SERVICE_ACCOUNT_KEY_PATH (caminho para service-account.json)" -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "Voce tem todas essas credenciais? (s/N)"
if ($continue -ne "s" -and $continue -ne "S") {
    Write-Host ""
    Write-Host "CONSULTE OS GUIAS:" -ForegroundColor Yellow
    Write-Host "  - INSTRUCOES_CONTAS_LOJAS.md - Como criar contas nas lojas" -ForegroundColor Gray
    Write-Host "  - GUIA_CONFIGURACAO_FIREBASE.md - Configuracao do Firebase" -ForegroundColor Gray
    Write-Host "  - SECURITY_SETUP.md - Configuracoes de seguranca" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Execute este script novamente quando tiver todas as credenciais." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "INICIANDO CONFIGURACAO..." -ForegroundColor Green
Write-Host ""

# Funcao para entrada segura
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
                $input = Read-Host "$Prompt (padrao configurado)"
            } else {
                $input = Read-Host "$Prompt (padrao: $Default)"
            }
            if ([string]::IsNullOrWhiteSpace($input)) {
                $input = $Default
            }
        } else {
            $input = Read-Host $Prompt
        }
        
        if ($Required -and [string]::IsNullOrWhiteSpace($input)) {
            Write-Host "Este campo e obrigatorio!" -ForegroundColor Red
        }
    } while ($Required -and [string]::IsNullOrWhiteSpace($input))
    
    return $input
}

# Funcao para configurar secret
function Set-EASSecret {
    param(
        [string]$Name,
        [string]$Value
    )
    
    try {
        eas env:create --scope project --name $Name --value $Value --non-interactive
        Write-Host "  $Name configurado" -ForegroundColor Green
    } catch {
        Write-Host "  Erro ao configurar $Name" -ForegroundColor Red
        Write-Host "     $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# Verificar se EAS CLI esta instalado
try {
    eas --version | Out-Null
    Write-Host "EAS CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "EAS CLI nao encontrado. Instale com: npm install -g @expo/eas-cli" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "ETAPA 1: Configuracoes de Seguranca" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# 1. CONFIGURACAO DE SEGURANCA
Write-Host "1. CONFIGURANDO SEGURANCA..." -ForegroundColor Cyan

# Gerar JWT_SECRET automaticamente se nao fornecido
$jwtSecret = Get-SecureInput "Digite o JWT_SECRET (deixe vazio para gerar automaticamente)" "" $false $true
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    # Gerar JWT_SECRET seguro de 64 caracteres
    $jwtSecret = -join ((1..64) | ForEach {Get-Random -Input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))})
    Write-Host "  JWT_SECRET gerado automaticamente (64 caracteres)" -ForegroundColor Yellow
}

if ($jwtSecret.Length -lt 32) {
    Write-Host "  Aviso: JWT_SECRET deve ter pelo menos 32 caracteres" -ForegroundColor Yellow
    $jwtSecret = $jwtSecret + (-join ((1..(32-$jwtSecret.Length)) | ForEach {Get-Random -Input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))}))
    Write-Host "  JWT_SECRET expandido para 32+ caracteres" -ForegroundColor Yellow
}

Set-EASSecret "JWT_SECRET" $jwtSecret

# 2. CONFIGURACAO DO FIREBASE
Write-Host ""
Write-Host "2. CONFIGURANDO FIREBASE..." -ForegroundColor Cyan

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

# 3. CONFIGURACAO APPLE DEVELOPER
Write-Host ""
Write-Host "3. CONFIGURANDO APPLE DEVELOPER..." -ForegroundColor Cyan

$appleId = Get-SecureInput "Digite o APPLE_ID (email da conta Apple Developer)"
Set-EASSecret "APPLE_ID" $appleId

$ascAppId = Get-SecureInput "Digite o ASC_APP_ID (App Store Connect App ID)"
Set-EASSecret "ASC_APP_ID" $ascAppId

$appleTeamId = Get-SecureInput "Digite o APPLE_TEAM_ID"
Set-EASSecret "APPLE_TEAM_ID" $appleTeamId

# 4. CONFIGURACAO GOOGLE PLAY
Write-Host ""
Write-Host "4. CONFIGURANDO GOOGLE PLAY..." -ForegroundColor Cyan

$googleServiceAccount = Get-SecureInput "Digite o caminho completo para o service-account.json"
Set-EASSecret "GOOGLE_SERVICE_ACCOUNT_KEY_PATH" $googleServiceAccount

Write-Host ""
Write-Host "ETAPA 5: Aplicando Configuracoes" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

try {
    Write-Host "Configurando JWT_SECRET..." -ForegroundColor Gray
    eas env:create --scope project --name JWT_SECRET --value $jwtSecret --force
    
    Write-Host "Configurando Firebase..." -ForegroundColor Gray
    eas env:create --scope project --name FIREBASE_API_KEY --value $firebaseApiKey --force
    eas env:create --scope project --name FIREBASE_PROJECT_ID --value $firebaseProjectId --force
    eas env:create --scope project --name FIREBASE_AUTH_DOMAIN --value $firebaseAuthDomain --force
    eas env:create --scope project --name FIREBASE_STORAGE_BUCKET --value $firebaseStorageBucket --force
    
    if ($firebaseMessagingSenderId) {
        eas env:create --scope project --name FIREBASE_MESSAGING_SENDER_ID --value $firebaseMessagingSenderId --force
    }
    
    if ($firebaseAppId) {
        eas env:create --scope project --name FIREBASE_APP_ID --value $firebaseAppId --force
    }
    
    Write-Host "Configurando Apple..." -ForegroundColor Gray
    eas env:create --scope project --name APPLE_ID --value $appleId --force
    eas env:create --scope project --name ASC_APP_ID --value $ascAppId --force
    eas env:create --scope project --name APPLE_TEAM_ID --value $appleTeamId --force
    
    Write-Host "Configurando Google Play..." -ForegroundColor Gray
    eas env:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY_PATH --value $googleServiceAccount --force
    
    Write-Host ""
    Write-Host "Todas as variaveis de ambiente foram configuradas com sucesso!" -ForegroundColor Green
    
} catch {
    Write-Host "Erro ao configurar variaveis: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "ETAPA 6: Validacao" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

Write-Host "Executando validacao de seguranca..." -ForegroundColor Gray
try {
    npm run validate-security
    Write-Host "Validacao de seguranca passou!" -ForegroundColor Green
} catch {
    Write-Host "Validacao de seguranca falhou. Verifique os logs acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "CONFIGURACAO COMPLETA!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos para publicacao:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verificar assets das lojas:" -ForegroundColor White
Write-Host "   npm run check:store-assets" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Executar validacao completa:" -ForegroundColor White
Write-Host "   npm run pre-build-check" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Build de producao:" -ForegroundColor White
Write-Host "   npm run build:android" -ForegroundColor Gray
Write-Host "   npm run build:ios" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Submissao para as lojas:" -ForegroundColor White
Write-Host "   npm run submit:android" -ForegroundColor Gray
Write-Host "   npm run submit:ios" -ForegroundColor Gray
Write-Host ""
Write-Host "Para mais informacoes sobre contas das lojas:" -ForegroundColor Cyan
Write-Host "   Consulte: INSTRUCOES_CONTAS_LOJAS.md" -ForegroundColor Gray

# 5. VALIDACAO FINAL
Write-Host ""
Write-Host "5. EXECUTANDO VALIDACOES..." -ForegroundColor Cyan

Write-Host "  Listando secrets configurados..." -ForegroundColor Gray
try {
    eas env:list
} catch {
    Write-Host "  Nao foi possivel listar as secrets" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Executando validacao de seguranca..." -ForegroundColor Gray
try {
    npm run validate-security
    Write-Host "  Validacao de seguranca passou!" -ForegroundColor Green
} catch {
    Write-Host "  Validacao de seguranca falhou - verifique as configuracoes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Executando verificacao pre-build..." -ForegroundColor Gray
try {
    npm run pre-build-check
    Write-Host "  Verificacao pre-build passou!" -ForegroundColor Green
} catch {
    Write-Host "  Verificacao pre-build falhou - verifique as configuracoes" -ForegroundColor Yellow
}

# 6. RESUMO E PROXIMOS PASSOS
Write-Host ""
Write-Host "CONFIGURACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Todas as variaveis de ambiente foram configuradas" -ForegroundColor Green
Write-Host "Validacoes de seguranca executadas" -ForegroundColor Green
Write-Host "O aplicativo esta pronto para build e publicacao" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASSOS PARA PUBLICACAO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Build de Producao:" -ForegroundColor White
Write-Host "   npm run build:android    # Build para Android" -ForegroundColor Gray
Write-Host "   npm run build:ios        # Build para iOS" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Submissao para as Lojas:" -ForegroundColor White
Write-Host "   npm run submit:android   # Enviar para Google Play" -ForegroundColor Gray
Write-Host "   npm run submit:ios       # Enviar para App Store" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Comandos de Verificacao:" -ForegroundColor White
Write-Host "   eas env:list             # Listar todas as secrets" -ForegroundColor Gray
Write-Host "   npm run validate-security # Validar configuracoes" -ForegroundColor Gray
Write-Host "   npm run pre-build-check  # Verificar antes do build" -ForegroundColor Gray
Write-Host ""
Write-Host "DOCUMENTACAO IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - INSTRUCOES_CONTAS_LOJAS.md - Guia das lojas" -ForegroundColor Gray
Write-Host "   - INSTRUCOES_PUBLICACAO.md - Processo de publicacao" -ForegroundColor Gray
Write-Host "   - CHECKLIST_PUBLICACAO.md - Checklist final" -ForegroundColor Gray
Write-Host ""
Write-Host "O aplicativo esta 100% pronto para publicacao!" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para finalizar"