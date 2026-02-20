# Script simplificado para verificar a limpeza dos arquivos HTML

# Definir cores para saída
$corSucesso = "Green"
$corErro = "Red"
$corInfo = "Cyan"

# Verificar arquivos HTML na raiz
Write-Host "\nVerificando arquivos HTML na raiz..." -ForegroundColor $corInfo

# Arquivos que devem ser removidos
$arquivosRemovidos = @(
    "demo.html",
    "test-web.html",
    "login.html",
    "perfil.html",
    "dashboard-seguranca.html"
)

$todosRemovidos = $true
foreach ($arquivo in $arquivosRemovidos) {
    if (Test-Path -Path $arquivo) {
        Write-Host "[ERRO] Arquivo ainda presente na raiz: $arquivo" -ForegroundColor $corErro
        $todosRemovidos = $false
    } else {
        Write-Host "[OK] Arquivo removido com sucesso: $arquivo" -ForegroundColor $corSucesso
    }
}

# Verificar diretório de assets web
Write-Host "\nVerificando diretório de assets web..." -ForegroundColor $corInfo
$diretorioWebAssets = "./assets/web"

if (Test-Path -Path $diretorioWebAssets -PathType Container) {
    Write-Host "[OK] Diretório de assets web encontrado" -ForegroundColor $corSucesso
    
    # Arquivos que devem ser movidos
    $arquivosMover = @(
        "index.html",
        "site_content.html",
        "web-app.html"
    )
    
    $todosMovidos = $true
    foreach ($arquivo in $arquivosMover) {
        $arquivoMovido = "$diretorioWebAssets/$arquivo"
        if (Test-Path -Path $arquivoMovido) {
            Write-Host "[OK] Arquivo movido com sucesso: $arquivo" -ForegroundColor $corSucesso
        } else {
            Write-Host "[ERRO] Arquivo não encontrado no destino: $arquivo" -ForegroundColor $corErro
            $todosMovidos = $false
        }
    }
} else {
    Write-Host "[ERRO] Diretório de assets web não encontrado" -ForegroundColor $corErro
    $todosMovidos = $false
}

# Verificar build.gradle
Write-Host "\nVerificando configuração de build..." -ForegroundColor $corInfo
$buildGradlePath = "./android/app/build.gradle"

if (Test-Path -Path $buildGradlePath) {
    $conteudo = Get-Content -Path $buildGradlePath -Raw
    if ($conteudo -match "exclude '\*.html'") {
        Write-Host "[OK] Regra de exclusão de arquivos HTML encontrada no build.gradle" -ForegroundColor $corSucesso
        $buildGradleOk = $true
    } else {
        Write-Host "[ERRO] Regra de exclusão de arquivos HTML não encontrada no build.gradle" -ForegroundColor $corErro
        $buildGradleOk = $false
    }
} else {
    Write-Host "[ERRO] Arquivo build.gradle não encontrado" -ForegroundColor $corErro
    $buildGradleOk = $false
}

# Resumo
Write-Host "\nResumo da verificação:" -ForegroundColor $corInfo
if ($todosRemovidos -and $todosMovidos -and $buildGradleOk) {
    Write-Host "[OK] Todos os testes passaram. A limpeza dos arquivos HTML foi realizada com sucesso." -ForegroundColor $corSucesso
} else {
    Write-Host "[ERRO] Alguns testes falharam. Verifique os problemas acima." -ForegroundColor $corErro
}