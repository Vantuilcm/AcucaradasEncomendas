# Script para gerar build interno via EAS
Write-Host "=== Gerando build interno para Açucaradas Encomendas ==="
Write-Host "Iniciando processo..."

# Verificar se o EAS CLI está instalado
$easVersion = npx eas-cli --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Instalando EAS CLI..."
    npm install -g eas-cli
}

# Fazer login no EAS (se necessário)
Write-Host "Verificando login no EAS..."
$loggedIn = npx eas whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Por favor, faça login na sua conta Expo:"
    npx eas login
}

# Iniciar build interno
Write-Host "Iniciando build interno para Android..."
Write-Host "Este processo irá gerar um APK para teste interno."
Write-Host "O build será executado nos servidores do Expo e você receberá um link para download."

# Executar build com perfil preview (que gera APK)
npx eas build --platform android --profile preview --non-interactive

Write-Host "Processo de build iniciado!"
Write-Host "Você pode acompanhar o progresso em: https://expo.dev"
Write-Host "Quando o build for concluído, você receberá um link para download do APK."