# Script para restaurar dependências faltantes (Round 3 - Consolidado)
Write-Host "Iniciando restauração de dependências (Round 3 - Consolidado)..."

# Lista de dependências para instalar (incluindo as do Round 2)
$deps = @(
    "bcryptjs",
    "expo-device",
    "@ide/backoff",
    "@firebase/analytics",
    "expo-screen-capture",
    "react-native-paper",
    "@types/react-native",
    "jest-expo"
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

Write-Host "Restauração (Round 3) concluída."
