# Script para restaurar dependências faltantes (Round 2)
Write-Host "Iniciando restauração de dependências (Round 2)..."

# Lista de dependências para instalar
$deps = @(
    "bcryptjs",
    "expo-device",
    "@ide/backoff",
    "@firebase/analytics"
)

foreach ($dep in $deps) {
    Write-Host "Instalando $dep..."
    npm install $dep --legacy-peer-deps
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$dep instalado com sucesso." -ForegroundColor Green
    } else {
        Write-Host "Falha ao instalar $dep." -ForegroundColor Red
    }
}

Write-Host "Restauração concluída."
