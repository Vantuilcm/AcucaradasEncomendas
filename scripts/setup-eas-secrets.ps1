# 🔐 Script de Configuração de EAS Secrets para Produção
# Compatível com PowerShell no Windows

Write-Host "🔐 Configurando EAS Secrets para Produção" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE: Este script irá configurar as variáveis de ambiente seguras." -ForegroundColor Yellow
Write-Host "Certifique-se de ter as chaves corretas antes de continuar." -ForegroundColor Yellow
Write-Host ""
Read-Host "Pressione Enter para continuar"

# Função para validar entrada
function Get-SecureInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$Required = $true
    )
    
    do {
        if ($Default) {
            $input = Read-Host "$Prompt (padrão: $Default)"
            if ([string]::IsNullOrWhiteSpace($input)) {
                $input = $Default
            }
        } else {
            $input = Read-Host $Prompt
        }
        
        if ($Required -and [string]::IsNullOrWhiteSpace($input)) {
            Write-Host "❌ Este campo é obrigatório!" -ForegroundColor Red
        }
    } while ($Required -and [string]::IsNullOrWhiteSpace($input))
    
    return $input
}

# Verificar se EAS CLI está instalado
try {
    eas --version | Out-Null
} catch {
    Write-Host "❌ EAS CLI não encontrado. Instale com: npm install -g @expo/eas-cli" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Configurando JWT Secret..." -ForegroundColor Cyan
$jwtSecret = Get-SecureInput "Digite o JWT_SECRET (mínimo 32 caracteres)"
if ($jwtSecret.Length -lt 32) {
    Write-Host "⚠️ Aviso: JWT_SECRET deve ter pelo menos 32 caracteres para segurança" -ForegroundColor Yellow
}
eas secret:create --scope project --name JWT_SECRET --value $jwtSecret

Write-Host ""
Write-Host "🔥 Configurando Firebase..." -ForegroundColor Cyan
$firebaseApiKey = Get-SecureInput "Digite o FIREBASE_API_KEY"
eas secret:create --scope project --name FIREBASE_API_KEY --value $firebaseApiKey

$firebaseProjectId = Get-SecureInput "Digite o FIREBASE_PROJECT_ID" "acucaradas-encomendas-prod"
eas secret:create --scope project --name FIREBASE_PROJECT_ID --value $firebaseProjectId

$firebaseAuthDomain = Get-SecureInput "Digite o FIREBASE_AUTH_DOMAIN" "$firebaseProjectId.firebaseapp.com"
eas secret:create --scope project --name FIREBASE_AUTH_DOMAIN --value $firebaseAuthDomain

$firebaseStorageBucket = Get-SecureInput "Digite o FIREBASE_STORAGE_BUCKET" "$firebaseProjectId.appspot.com"
eas secret:create --scope project --name FIREBASE_STORAGE_BUCKET --value $firebaseStorageBucket

Write-Host ""
Write-Host "🍎 Configurando Apple Developer..." -ForegroundColor Cyan
$appleId = Get-SecureInput "Digite o APPLE_ID (email)"
eas secret:create --scope project --name APPLE_ID --value $appleId

$ascAppId = Get-SecureInput "Digite o ASC_APP_ID"
eas secret:create --scope project --name ASC_APP_ID --value $ascAppId

$appleTeamId = Get-SecureInput "Digite o APPLE_TEAM_ID"
eas secret:create --scope project --name APPLE_TEAM_ID --value $appleTeamId

Write-Host ""
Write-Host "📱 Configurando Google Service Account..." -ForegroundColor Cyan
$googleServiceAccount = Get-SecureInput "Digite o caminho para o service account JSON"
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY_PATH --value $googleServiceAccount

Write-Host ""
Write-Host "✅ Configuração de EAS Secrets concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique se todas as secrets foram criadas: eas secret:list"
Write-Host "2. Execute a validação: npm run validate-security"
Write-Host "3. Teste o build: npm run build:android ou npm run build:ios"
Write-Host ""
Read-Host 'Pressione Enter para finalizar'