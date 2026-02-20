# Script para testar a funcionalidade do aplicativo após a limpeza dos arquivos HTML
# Este script executa testes de regressão para garantir que a remoção não afeta a funcionalidade

# Definir cores para saída
$corSucesso = "Green"
$corAviso = "Yellow"
$corErro = "Red"
$corInfo = "Cyan"
$corTitulo = "Magenta"

# Função para exibir cabeçalho de seção
function Exibir-Cabecalho {
    param (
        [string]$titulo
    )
    
    Write-Host "\n=== $titulo ===" -ForegroundColor $corTitulo
}

# Função para verificar se um arquivo existe
function Verificar-Arquivo {
    param (
        [string]$caminho,
        [string]$descricao
    )
    
    if (Test-Path -Path $caminho) {
        Write-Host "[OK] $descricao: Arquivo encontrado" -ForegroundColor $corSucesso
        return $true
    } else {
        Write-Host "[ERRO] $descricao: Arquivo não encontrado - $caminho" -ForegroundColor $corErro
        return $false
    }
}

# Função para verificar se um diretório existe
function Verificar-Diretorio {
    param (
        [string]$caminho,
        [string]$descricao
    )
    
    if (Test-Path -Path $caminho -PathType Container) {
        Write-Host "[OK] $descricao: Diretório encontrado" -ForegroundColor $corSucesso
        return $true
    } else {
        Write-Host "[ERRO] $descricao: Diretório não encontrado - $caminho" -ForegroundColor $corErro
        return $false
    }
}

# Função para verificar se um arquivo contém um padrão específico
function Verificar-Conteudo {
    param (
        [string]$caminho,
        [string]$padrao,
        [string]$descricao
    )
    
    if (Test-Path -Path $caminho) {
        $conteudo = Get-Content -Path $caminho -Raw
        if ($conteudo -match $padrao) {
            Write-Host "[OK] $descricao: Padrão encontrado" -ForegroundColor $corSucesso
            return $true
        } else {
            Write-Host "[ERRO] $descricao: Padrão não encontrado - $padrao" -ForegroundColor $corErro
            return $false
        }
    } else {
        Write-Host "[ERRO] $descricao: Arquivo não encontrado - $caminho" -ForegroundColor $corErro
        return $false
    }
}

# Iniciar testes
Exibir-Cabecalho "Iniciando Testes de Regressão"

# Verificar se os arquivos HTML foram removidos da raiz
Exibir-Cabecalho "Verificando Remoção de Arquivos HTML da Raiz"
$arquivosRemovidos = @(
    "demo.html",
    "test-web.html",
    "login.html",
    "perfil.html",
    "dashboard-seguranca.html"
)

$todosArquivosRemovidos = $true
foreach ($arquivo in $arquivosRemovidos) {
    if (Test-Path -Path $arquivo) {
        Write-Host "[ERRO] Arquivo ainda presente na raiz: $arquivo" -ForegroundColor $corErro
        $todosArquivosRemovidos = $false
    } else {
        Write-Host "[OK] Arquivo removido com sucesso: $arquivo" -ForegroundColor $corSucesso
    }
}

if ($todosArquivosRemovidos) {
    Write-Host "[OK] Todos os arquivos HTML desnecessários foram removidos da raiz" -ForegroundColor $corSucesso
} else {
    Write-Host "[ERRO] Alguns arquivos HTML ainda estão presentes na raiz" -ForegroundColor $corErro
}

# Verificar se os arquivos HTML foram movidos para o diretório correto
Exibir-Cabecalho "Verificando Movimentação de Arquivos HTML"
$arquivosMover = @(
    "index.html",
    "site_content.html",
    "web-app.html"
)
$diretorioWebAssets = "./assets/web"

$todosArquivosMovidos = $true
if (Verificar-Diretorio -caminho $diretorioWebAssets -descricao "Diretório de assets web") {
    foreach ($arquivo in $arquivosMover) {
        $arquivoOriginal = "./$arquivo"
        $arquivoMovido = "$diretorioWebAssets/$arquivo"
        
        if (Test-Path -Path $arquivoOriginal) {
            Write-Host "[ERRO] Arquivo ainda presente na raiz: $arquivo" -ForegroundColor $corErro
            $todosArquivosMovidos = $false
        } else {
            if (Test-Path -Path $arquivoMovido) {
                Write-Host "[OK] Arquivo movido com sucesso: $arquivo -> $diretorioWebAssets" -ForegroundColor $corSucesso
            } else {
                Write-Host "[ERRO] Arquivo não encontrado nem na raiz nem no destino: $arquivo" -ForegroundColor $corErro
                $todosArquivosMovidos = $false
            }
        }
    }
} else {
    $todosArquivosMovidos = $false
}

if ($todosArquivosMovidos) {
    Write-Host "[OK] Todos os arquivos HTML necessários foram movidos para o diretório correto" -ForegroundColor $corSucesso
} else {
    Write-Host "[ERRO] Alguns arquivos HTML não foram movidos corretamente" -ForegroundColor $corErro
}

# Verificar se o arquivo build.gradle foi atualizado corretamente
Exibir-Cabecalho "Verificando Configuração de Build"
$buildGradlePath = "./android/app/build.gradle"
$padraoExclusao = "exclude '\*.html'"

Verificar-Conteudo -caminho $buildGradlePath -padrao $padraoExclusao -descricao "Regra de exclusão de arquivos HTML no build.gradle"

# Verificar se o backup foi criado
Exibir-Cabecalho "Verificando Backup"
$diretoriosBackup = Get-ChildItem -Path "./backups" -Directory -Filter "html-backup-*" | Sort-Object -Property LastWriteTime -Descending

if ($diretoriosBackup.Count -gt 0) {
    $ultimoBackup = $diretoriosBackup[0].FullName
    Write-Host "[OK] Backup encontrado: $ultimoBackup" -ForegroundColor $corSucesso
    
    # Verificar se todos os arquivos foram incluídos no backup
    $todosArquivosBackup = $true
    $arquivosParaBackup = $arquivosRemovidos + $arquivosMover
    
    foreach ($arquivo in $arquivosParaBackup) {
        $arquivoBackup = "$ultimoBackup/$arquivo"
        if (-not (Test-Path -Path $arquivoBackup)) {
            Write-Host "[ERRO] Arquivo não encontrado no backup: $arquivo" -ForegroundColor $corErro
            $todosArquivosBackup = $false
        }
    }
    
    if ($todosArquivosBackup) {
        Write-Host "[OK] Todos os arquivos HTML foram incluídos no backup" -ForegroundColor $corSucesso
    } else {
        Write-Host "[ERRO] Alguns arquivos HTML não foram incluídos no backup" -ForegroundColor $corErro
    }
} else {
    Write-Host "[ERRO] Nenhum diretório de backup encontrado" -ForegroundColor $corErro
}

# Resumo dos testes
Exibir-Cabecalho "Resumo dos Testes de Regressão"

if ($todosArquivosRemovidos -and $todosArquivosMovidos) {
    Write-Host "[OK] Todos os testes passaram. A limpeza dos arquivos HTML não afetou a funcionalidade do aplicativo." -ForegroundColor $corSucesso
} else {
    Write-Host "[ERRO] Alguns testes falharam. Verifique os problemas acima." -ForegroundColor $corErro
}

Write-Host "\nTestes de regressão concluídos!" -ForegroundColor $corInfo