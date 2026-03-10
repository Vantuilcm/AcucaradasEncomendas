# Script para submeter o IPA para o TestFlight
# Uso: .\submeter_testflight.ps1 [CaminhoParaOIPA]

param (
    [string]$IpaPath = "Acucaradas.ipa"
)

Write-Host "--- Iniciando processo de submissao para TestFlight ---" -ForegroundColor Cyan

# Tentar encontrar o arquivo IPA (mesmo se estiver dentro de uma pasta extraida)
$ActualFile = $null

if (Test-Path $IpaPath) {
    $Item = Get-Item $IpaPath
    if ($Item.PSIsContainer) {
        # Se for um diretorio, procurar o .ipa dentro dele
        $ActualFile = Get-ChildItem -Path $IpaPath -Filter "*.ipa" -File | Select-Object -First 1
    } else {
        $ActualFile = $Item
    }
}

if (-not $ActualFile) {
    Write-Host "Arquivo .ipa nao encontrado na pasta atual ou dentro da pasta Acucaradas.ipa." -ForegroundColor Yellow
    Write-Host "Por favor, baixe o Acucaradas-iOS-IPA do GitHub Actions e extraia o arquivo para esta pasta." -ForegroundColor Yellow
    
    $downloadedPath = Read-Host "Ou digite o caminho completo para o arquivo .ipa baixado"
    if (-not (Test-Path $downloadedPath)) {
        Write-Host "Arquivo nao encontrado: $downloadedPath" -ForegroundColor Red
        exit 1
    }
    $ActualFile = Get-Item $downloadedPath
}

$FullPath = $ActualFile.FullName
Write-Host "IPA encontrado em: $FullPath" -ForegroundColor Green
Write-Host "Enviando para a Apple (TestFlight)..." -ForegroundColor Cyan
Write-Host "Voce precisara fazer login com seu Apple ID e Senha de App (App Specific Password) se solicitado." -ForegroundColor Gray

# Executar comando de submissao
npx eas submit -p ios --profile production --path "$FullPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Submissao concluida com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Falha na submissao. Verifique os erros acima." -ForegroundColor Red
    Write-Host "Dica: Verifique se a Senha de App (App Specific Password) esta correta." -ForegroundColor Gray
}
