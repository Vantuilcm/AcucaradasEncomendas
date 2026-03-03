# Script para remover completamente as referências ao WordPress

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Iniciando remoção de diretórios e arquivos relacionados ao WordPress..." -ForegroundColor Yellow

# Função para remover diretório com segurança
function Remove-DirectorySafely {
    param (
        [string]$Path
    )
    
    if (Test-Path $Path) {
        Write-Host "Removendo diretório: $Path" -ForegroundColor Cyan
        try {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Host "✅ Diretório removido com sucesso: $Path" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erro ao remover diretório: $Path" -ForegroundColor Red
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Tentando método alternativo..." -ForegroundColor Yellow
            
            # Método alternativo usando robocopy para limpar o diretório
            $tempEmptyDir = "$env:TEMP\empty_dir"
            if (-not (Test-Path $tempEmptyDir)) {
                New-Item -ItemType Directory -Path $tempEmptyDir -Force | Out-Null
            }
            
            robocopy $tempEmptyDir $Path /MIR /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
            
            try {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
                Write-Host "✅ Diretório removido com sucesso (método alternativo): $Path" -ForegroundColor Green
            } catch {
                Write-Host "❌ Falha ao remover diretório mesmo com método alternativo: $Path" -ForegroundColor Red
                Write-Host "   Você precisará remover este diretório manualmente." -ForegroundColor Red
            }
            
            # Limpar diretório temporário
            if (Test-Path $tempEmptyDir) {
                Remove-Item -Path $tempEmptyDir -Force -Recurse -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "ℹ️ Diretório não encontrado: $Path" -ForegroundColor Blue
    }
}

# Diretórios a serem removidos
$diretoriosParaRemover = @(
    "$PSScriptRoot\site-wordpress",
    "$PSScriptRoot\Site wordpress novo"
)

# Remover diretórios
foreach ($dir in $diretoriosParaRemover) {
    Remove-DirectorySafely -Path $dir
}

# Arquivos relacionados ao WordPress a serem removidos
$arquivosParaRemover = @(
    "$PSScriptRoot\site_content.html",
    "$PSScriptRoot\CRIACAO_PAGINA_INICIAL_WORDPRESS.md",
    "$PSScriptRoot\INSTALACAO-WORDPRESS.md"
)

# Remover arquivos
foreach ($arquivo in $arquivosParaRemover) {
    if (Test-Path $arquivo) {
        Write-Host "Removendo arquivo: $arquivo" -ForegroundColor Cyan
        try {
            Remove-Item -Path $arquivo -Force -ErrorAction Stop
            Write-Host "✅ Arquivo removido com sucesso: $arquivo" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erro ao remover arquivo: $arquivo" -ForegroundColor Red
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "ℹ️ Arquivo não encontrado: $arquivo" -ForegroundColor Blue
    }
}

Write-Host "\nRemoção de referências ao WordPress concluída!" -ForegroundColor Green
Write-Host "\nPróximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique se há arquivos ou diretórios remanescentes relacionados ao WordPress" -ForegroundColor White
Write-Host "2. Execute a verificação de conflitos de dependências React" -ForegroundColor White
Write-Host "3. Realize testes de segurança específicos para a implementação Firebase" -ForegroundColor White
Write-Host "4. Atualize a documentação para refletir a nova arquitetura" -ForegroundColor White