# Script para corrigir imagens SVG com extensão PNG
# Açucaradas Encomendas

Write-Host "Verificando imagens SVG com extensao PNG incorreta..." -ForegroundColor Cyan
Write-Host ""

# Diretórios para verificar
$diretorios = @(
    "./assets",
    "./src/assets",
    "./app/assets"
)

$totalCorrigido = 0

foreach ($dir in $diretorios) {
    if (Test-Path $dir) {
        Write-Host "Verificando diretorio: $dir" -ForegroundColor Yellow
        
        # Encontrar arquivos PNG
        $arquivosPng = Get-ChildItem -Path $dir -Filter "*.png" -Recurse
        
        foreach ($arquivo in $arquivosPng) {
            # Ler os primeiros bytes do arquivo para verificar se é SVG
            $conteudo = Get-Content -Path $arquivo.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            
            # Verificar se o conteúdo parece ser SVG (começa com <?xml ou <svg)
            if ($conteudo -match '<?xml' -or $conteudo -match '<svg') {
                $novoNome = $arquivo.FullName -replace "\.png$", ".svg"
                
                Write-Host "Arquivo SVG com extensao PNG detectado: $($arquivo.FullName)" -ForegroundColor Yellow
                Write-Host "Renomeando para: $novoNome" -ForegroundColor Green
                
                # Renomear o arquivo
                Rename-Item -Path $arquivo.FullName -NewName $novoNome -Force
                $totalCorrigido++
            }
        }
    }
}

Write-Host ""
if ($totalCorrigido -gt 0) {
    Write-Host "Correcao concluida! $totalCorrigido arquivos corrigidos." -ForegroundColor Green
} else {
    Write-Host "Nenhum arquivo SVG com extensao PNG encontrado." -ForegroundColor Green
}
Write-Host ""