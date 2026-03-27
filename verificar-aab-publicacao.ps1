# Script para verificar o formato e integridade do arquivo AAB para publicacao na Google Play Store
# Acucaradas Encomendas

# Configuracoes iniciais
$ErrorActionPreference = "Continue"
$projectRoot = $PSScriptRoot
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Funcao para registrar mensagens de log
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$ForegroundColor = "White"
    )
    
    Write-Host $Message -ForegroundColor $ForegroundColor
}

Write-Host ""
Write-Host "===== VERIFICACAO DO AAB PARA PUBLICACAO ====="
Write-Host "Iniciado em: $timestamp"
Write-Host "Diretorio do projeto: $projectRoot"
Write-Host "------------------------------------------"
Write-Host ""

# Procurar por arquivos AAB no diretorio do projeto
try {
    Write-Log "Buscando arquivos AAB no diretorio do projeto..." -ForegroundColor Cyan
    $aabFiles = Get-ChildItem -Path $projectRoot -Include "*.aab" -Recurse -ErrorAction SilentlyContinue
    
    if ($null -eq $aabFiles) { $aabFiles = @() }
    
    Write-Log "Encontrados $($aabFiles.Count) arquivos AAB." -ForegroundColor Cyan
} catch {
    Write-Log "ERRO ao buscar arquivos: $_" -ForegroundColor Red
    $aabFiles = @()
}

# Verificar se encontrou algum arquivo AAB
if ($aabFiles.Count -eq 0) {
    Write-Log "ERRO: Nenhum arquivo AAB encontrado no diretorio do projeto." -ForegroundColor Red
    Write-Log "Verifique se o processo de build foi concluido com sucesso." -ForegroundColor Yellow
    exit 1
}

# Analisar cada arquivo AAB encontrado
foreach ($aabFile in $aabFiles) {
    Write-Host ""
    Write-Log "Analisando arquivo: $($aabFile.Name)" -ForegroundColor Green
    
    # Obter informacoes do arquivo
    $fileSizeMB = [math]::Round($aabFile.Length / 1MB, 2)
    $relativePath = $aabFile.FullName.Replace($projectRoot, ".")
    
    Write-Log "Informacoes do arquivo:" -ForegroundColor White
    Write-Host "  Nome: $($aabFile.Name)"
    Write-Host "  Tamanho: $fileSizeMB MB"
    Write-Host "  Data de criacao: $($aabFile.CreationTime)"
    Write-Host "  Ultima modificacao: $($aabFile.LastWriteTime)"
    Write-Host "  Caminho: $relativePath"
    Write-Host ""
    
    # Verificar se o tamanho do arquivo e razoavel
    if ($fileSizeMB -lt 1) {
        Write-Log "AVISO: O arquivo AAB parece muito pequeno ($fileSizeMB MB)." -ForegroundColor Yellow
        Write-Log "Isso pode indicar que o arquivo esta corrompido ou incompleto." -ForegroundColor Yellow
    } elseif ($fileSizeMB -gt 150) {
        Write-Log "AVISO: O arquivo AAB e muito grande ($fileSizeMB MB)." -ForegroundColor Yellow
        Write-Log "O Google Play Store tem um limite de 150MB para arquivos AAB." -ForegroundColor Yellow
        Write-Log "Considere otimizar o tamanho do aplicativo." -ForegroundColor Yellow
    } else {
        Write-Log "O tamanho do arquivo AAB esta dentro dos limites aceitaveis." -ForegroundColor Green
    }
    
    # Verificar se o arquivo e um arquivo ZIP valido (AAB e um arquivo ZIP)
    Write-Log "Verificando integridade do arquivo AAB..." -ForegroundColor Yellow
    try {
        # Testar se o arquivo pode ser lido como um arquivo ZIP
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($aabFile.FullName)
        $zip.Dispose()
        
        Write-Log "O arquivo AAB e um arquivo ZIP valido." -ForegroundColor Green
    } catch {
        Write-Log "ERRO: O arquivo AAB nao e um arquivo ZIP valido." -ForegroundColor Red
        Write-Log "O arquivo pode estar corrompido. Tente gerar o AAB novamente." -ForegroundColor Red
        continue
    }
    
    # Verificar se o arquivo esta assinado (isso e uma verificacao basica)
    Write-Log "Verificando se o arquivo AAB esta assinado..." -ForegroundColor Yellow
    
    # Listar os arquivos dentro do AAB para verificar a presenca de arquivos de assinatura
    $tempDir = Join-Path $env:TEMP "aab-check-temp"
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    try {
        # Extrair o conteudo do AAB para o diretorio temporario
        Expand-Archive -Path $aabFile.FullName -DestinationPath $tempDir -Force
        
        # Verificar a presenca de arquivos de assinatura
        $hasSignature = Test-Path (Join-Path $tempDir "META-INF\MANIFEST.MF")
        
        if ($hasSignature) {
            Write-Log "O arquivo AAB parece estar assinado." -ForegroundColor Green
        } else {
            Write-Log "AVISO: O arquivo AAB pode nao estar assinado." -ForegroundColor Yellow
            Write-Log "Voce precisara assinar o AAB antes de envia-lo para a Google Play Store." -ForegroundColor Yellow
        }
    } catch {
        Write-Log "Erro ao verificar a assinatura: $_" -ForegroundColor Red
    } finally {
        # Limpar o diretorio temporario
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
    }
}

Write-Host ""
Write-Log "CHECKLIST PARA PUBLICACAO NA GOOGLE PLAY:" -ForegroundColor Cyan
Write-Host ""
Write-Log "1. Preparacao do AAB:" -ForegroundColor White
Write-Host "   [  ] AAB gerado e validado"
Write-Host "   [  ] AAB assinado com chave de producao"
Write-Host "   [  ] Versao do app incrementada corretamente"
Write-Host ""
Write-Log "2. Conta de Desenvolvedor:" -ForegroundColor White
Write-Host "   [  ] Conta Google Play Console ativa"
Write-Host "   [  ] Taxa anual de desenvolvedor paga"
Write-Host "   [  ] Informacoes fiscais e de pagamento atualizadas"
Write-Host ""
Write-Log "3. Metadados do Aplicativo:" -ForegroundColor White
Write-Host "   [  ] Nome do aplicativo definido"
Write-Host "   [  ] Descricao completa e otimizada (SEO/ASO)"
Write-Host "   [  ] Descricao curta criada"
Write-Host "   [  ] Categoria do app selecionada"
Write-Host "   [  ] Tags/palavras-chave definidas"
Write-Host ""
Write-Log "4. Recursos Graficos:" -ForegroundColor White
Write-Host "   [  ] Icone de alta resolucao (512x512px)"
Write-Host "   [  ] Imagem de destaque (1024x500px)"
Write-Host "   [  ] Screenshots para diferentes dispositivos"
Write-Host "   [  ] Video promocional (opcional)"
Write-Host ""
Write-Log "5. Politicas e Conformidade:" -ForegroundColor White
Write-Host "   [  ] Politica de privacidade criada e URL fornecida"
Write-Host "   [  ] Formulario de classificacao de conteudo preenchido"
Write-Host "   [  ] Declaracao de seguranca de dados preenchida"
Write-Host "   [  ] Permissoes do app justificadas"
Write-Host ""
Write-Log "6. Testes e Lancamento:" -ForegroundColor White
Write-Host "   [  ] Teste interno configurado"
Write-Host "   [  ] Teste fechado (alfa/beta) configurado"
Write-Host "   [  ] Notas de lancamento criadas"
Write-Host "   [  ] Estrategia de lancamento definida (completo ou gradual)"
Write-Host ""
Write-Log "===== VERIFICACAO CONCLUIDA ====="
Write-Host ""
Write-Log "Proximos passos:" -ForegroundColor Yellow
Write-Log "1. Complete o checklist acima" -ForegroundColor Yellow
Write-Log "2. Faca upload do AAB para o Google Play Console" -ForegroundColor Yellow
Write-Log "3. Configure os testes antes do lancamento em producao" -ForegroundColor Yellow
Write-Log "4. Monitore o processo de revisao do app" -ForegroundColor Yellow
Write-Host ""