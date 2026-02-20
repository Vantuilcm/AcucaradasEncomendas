# Script para limpar arquivos HTML desnecessários na raiz do projeto
# Este script implementa a estratégia de exclusão definida na análise

# Definir o diretório de backup para armazenar os arquivos antes de removê-los
$dataAtual = Get-Date -Format "yyyyMMdd-HHmmss"
$diretorioBackup = "./backups/html-backup-$dataAtual"

# Criar diretório de backup se não existir
if (-not (Test-Path -Path $diretorioBackup)) {
    New-Item -ItemType Directory -Path $diretorioBackup -Force | Out-Null
    Write-Host "Diretório de backup criado: $diretorioBackup" -ForegroundColor Green
}

# Arquivos HTML que podem ser removidos (conforme análise)
$arquivosParaRemover = @(
    "demo.html",
    "test-web.html",
    "login.html",
    "perfil.html",
    "dashboard-seguranca.html"
)

# Arquivos HTML que devem ser movidos para uma estrutura organizada
$arquivosParaMover = @(
    "index.html",
    "site_content.html",
    "web-app.html"
)

# Diretório de destino para arquivos organizados
$diretorioWebAssets = "./assets/web"

# Criar diretório de assets web se não existir
if (-not (Test-Path -Path $diretorioWebAssets)) {
    New-Item -ItemType Directory -Path $diretorioWebAssets -Force | Out-Null
    Write-Host "Diretório de assets web criado: $diretorioWebAssets" -ForegroundColor Green
}

# Função para fazer backup e remover arquivos
function Backup-E-Remover {
    param (
        [string]$arquivo
    )
    
    if (Test-Path -Path $arquivo) {
        # Fazer backup do arquivo
        Copy-Item -Path $arquivo -Destination $diretorioBackup -Force
        Write-Host "Backup realizado: $arquivo -> $diretorioBackup\$(Split-Path -Leaf $arquivo)" -ForegroundColor Cyan
        
        # Remover o arquivo original
        Remove-Item -Path $arquivo -Force
        Write-Host "Arquivo removido: $arquivo" -ForegroundColor Yellow
    } else {
        Write-Host "Arquivo não encontrado: $arquivo" -ForegroundColor Red
    }
}

# Função para fazer backup e mover arquivos
function Backup-E-Mover {
    param (
        [string]$arquivo,
        [string]$destino
    )
    
    if (Test-Path -Path $arquivo) {
        # Fazer backup do arquivo
        Copy-Item -Path $arquivo -Destination $diretorioBackup -Force
        Write-Host "Backup realizado: $arquivo -> $diretorioBackup\$(Split-Path -Leaf $arquivo)" -ForegroundColor Cyan
        
        # Mover o arquivo para o destino
        Move-Item -Path $arquivo -Destination $destino -Force
        Write-Host "Arquivo movido: $arquivo -> $destino\$(Split-Path -Leaf $arquivo)" -ForegroundColor Green
    } else {
        Write-Host "Arquivo não encontrado: $arquivo" -ForegroundColor Red
    }
}

# Processar arquivos para remover
Write-Host "\n=== Processando arquivos para remover ===" -ForegroundColor Magenta
foreach ($arquivo in $arquivosParaRemover) {
    Backup-E-Remover -arquivo $arquivo
}

# Processar arquivos para mover
Write-Host "\n=== Processando arquivos para mover ===" -ForegroundColor Magenta
foreach ($arquivo in $arquivosParaMover) {
    Backup-E-Mover -arquivo $arquivo -destino $diretorioWebAssets
}

# Atualizar o arquivo build.gradle para excluir arquivos HTML na raiz
Write-Host "\n=== Atualizando configuração de build para Android ===" -ForegroundColor Magenta
$buildGradlePath = "./android/app/build.gradle"

if (Test-Path -Path $buildGradlePath) {
    $buildGradleContent = Get-Content -Path $buildGradlePath -Raw
    
    # Verificar se já existe a seção packagingOptions
    if ($buildGradleContent -match "packagingOptions\s*\{") {
        # Adicionar regras de exclusão se a seção já existir
        $novoConteudo = $buildGradleContent -replace "(packagingOptions\s*\{)([^\}]*)(\})", "$1$2    exclude '*.html'\n    exclude 'Demo.html'\n$3"
    } else {
        # Adicionar nova seção packagingOptions se não existir
        $novoConteudo = $buildGradleContent -replace "(android\s*\{[^\}]*)\}", "$1    packagingOptions {\n        exclude '*.html'\n        exclude 'Demo.html'\n    }\n}"
    }
    
    # Fazer backup do arquivo build.gradle
    Copy-Item -Path $buildGradlePath -Destination "$diretorioBackup/build.gradle" -Force
    Write-Host "Backup realizado: $buildGradlePath -> $diretorioBackup/build.gradle" -ForegroundColor Cyan
    
    # Atualizar o arquivo build.gradle
    Set-Content -Path $buildGradlePath -Value $novoConteudo
    Write-Host "Arquivo build.gradle atualizado com regras de exclusão" -ForegroundColor Green
} else {
    Write-Host "Arquivo build.gradle não encontrado: $buildGradlePath" -ForegroundColor Red
}

# Resumo das operações
Write-Host "\n=== Resumo das Operações ===" -ForegroundColor Magenta
Write-Host "Arquivos removidos: $($arquivosParaRemover.Count)" -ForegroundColor Yellow
Write-Host "Arquivos movidos: $($arquivosParaMover.Count)" -ForegroundColor Green
Write-Host "Backup completo em: $diretorioBackup" -ForegroundColor Cyan
Write-Host "\nOperação concluída com sucesso!" -ForegroundColor Green