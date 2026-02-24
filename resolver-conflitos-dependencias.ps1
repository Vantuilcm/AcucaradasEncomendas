# Script para verificar e resolver conflitos de dependências React

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Iniciando verificação e resolução de conflitos de dependências React..." -ForegroundColor Yellow

# Caminho para o arquivo package.json
$packageJsonPath = "$PSScriptRoot\package.json"

# Verificar se o arquivo package.json existe
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "❌ Arquivo package.json não encontrado!" -ForegroundColor Red
    exit 1
}

# Criar backup do package.json atual
$backupPath = "$PSScriptRoot\package.json.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path $packageJsonPath -Destination $backupPath -Force
Write-Host "✅ Backup do package.json criado em: $backupPath" -ForegroundColor Green

# Ler o conteúdo do package.json
$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

# Verificar versões atuais de React e React DOM
$reactVersion = $packageJson.dependencies.react
$reactDomVersion = $packageJson.dependencies.'react-dom'

Write-Host "\nVersões atuais:" -ForegroundColor Cyan
Write-Host "- React: $reactVersion" -ForegroundColor White
Write-Host "- React DOM: $reactDomVersion" -ForegroundColor White

# Verificar se há conflito (versões diferentes)
$conflito = $reactVersion -ne $reactDomVersion
if ($conflito) {
    Write-Host "\n⚠️ Conflito detectado: React e React DOM têm versões diferentes!" -ForegroundColor Yellow
    
    # Perguntar qual versão usar
    Write-Host "\nEscolha a versão para alinhar React e React DOM:" -ForegroundColor Cyan
    Write-Host "1. Usar React $reactVersion" -ForegroundColor White
    Write-Host "2. Usar React DOM $reactDomVersion" -ForegroundColor White
    Write-Host "3. Usar versão LTS recomendada (18.2.0)" -ForegroundColor White
    
    $escolha = Read-Host "Digite o número da opção (1-3)"
    
    switch ($escolha) {
        "1" {
            $versaoAlvo = $reactVersion
            Write-Host "Alinhando para versão $versaoAlvo" -ForegroundColor Green
        }
        "2" {
            $versaoAlvo = $reactDomVersion
            Write-Host "Alinhando para versão $versaoAlvo" -ForegroundColor Green
        }
        "3" {
            $versaoAlvo = "^18.2.0"
            Write-Host "Alinhando para versão LTS recomendada $versaoAlvo" -ForegroundColor Green
        }
        default {
            $versaoAlvo = "^18.2.0"
            Write-Host "Opção inválida. Usando versão LTS recomendada $versaoAlvo" -ForegroundColor Yellow
        }
    }
    
    # Atualizar as versões no objeto JSON
    $packageJson.dependencies.react = $versaoAlvo
    $packageJson.dependencies.'react-dom' = $versaoAlvo
    
    # Verificar e atualizar outras dependências relacionadas ao React
    $reactDependencies = @(
        'react-native',
        'react-native-web',
        '@types/react',
        '@types/react-dom',
        'react-test-renderer'
    )
    
    foreach ($dep in $reactDependencies) {
        if ($packageJson.dependencies.PSObject.Properties.Name -contains $dep) {
            Write-Host "Atualizando dependência relacionada: $dep" -ForegroundColor Cyan
            $packageJson.dependencies.$dep = $versaoAlvo
        }
        if ($packageJson.devDependencies.PSObject.Properties.Name -contains $dep) {
            Write-Host "Atualizando devDependência relacionada: $dep" -ForegroundColor Cyan
            $packageJson.devDependencies.$dep = $versaoAlvo
        }
    }
    
    # Salvar as alterações no package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath -Encoding UTF8
    
    Write-Host "\n✅ Versões atualizadas no package.json" -ForegroundColor Green
    
    # Sugerir limpeza de cache e reinstalação
    Write-Host "\nPara aplicar as alterações, execute os seguintes comandos:" -ForegroundColor Yellow
    Write-Host "npm cache clean --force" -ForegroundColor White
    Write-Host "rm -rf node_modules" -ForegroundColor White
    Write-Host "npm install" -ForegroundColor White
    
    # Oferecer execução automática dos comandos
    $executarComandos = Read-Host "Deseja executar esses comandos agora? (S/N)"
    if ($executarComandos -eq "S" -or $executarComandos -eq "s") {
        Write-Host "\nExecutando limpeza e reinstalação..." -ForegroundColor Cyan
        
        Write-Host "\nLimpando cache npm..." -ForegroundColor White
        npm cache clean --force
        
        Write-Host "\nRemovendo node_modules..." -ForegroundColor White
        Remove-Item -Path "$PSScriptRoot\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host "\nInstalando dependências..." -ForegroundColor White
        npm install
        
        # Verificar resultado da instalação
        if ($LASTEXITCODE -eq 0) {
            Write-Host "\n✅ Dependências instaladas com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "\n⚠️ Ocorreram problemas durante a instalação." -ForegroundColor Yellow
            Write-Host "Tentando com --legacy-peer-deps..." -ForegroundColor Cyan
            
            npm install --legacy-peer-deps
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "\n✅ Dependências instaladas com sucesso usando --legacy-peer-deps!" -ForegroundColor Green
            } else {
                Write-Host "\n❌ Falha na instalação mesmo com --legacy-peer-deps." -ForegroundColor Red
                Write-Host "Considere verificar a compatibilidade com o Node.js instalado." -ForegroundColor Yellow
                
                # Verificar versão do Node.js
                $nodeVersion = node -v
                Write-Host "Versão atual do Node.js: $nodeVersion" -ForegroundColor Cyan
                
                # Sugerir downgrade do Node.js se for muito recente
                if ($nodeVersion -match "v2[2-9]") {
                    Write-Host "\nA versão do Node.js é muito recente. Considere fazer downgrade para a versão LTS (v20.x)." -ForegroundColor Yellow
                    Write-Host "Você pode baixar a versão LTS em: https://nodejs.org/download/release/latest-v20.x/" -ForegroundColor White
                }
            }
        }
    } else {
        Write-Host "\nVocê optou por não executar os comandos automaticamente." -ForegroundColor Cyan
        Write-Host "Execute-os manualmente quando estiver pronto." -ForegroundColor White
    }
} else {
    Write-Host "\n✅ Não há conflito de versões entre React e React DOM." -ForegroundColor Green
    
    # Verificar se as versões são as recomendadas
    if ($reactVersion -ne "^18.2.0") {
        Write-Host "\n⚠️ As versões atuais não são as LTS recomendadas (18.2.0)." -ForegroundColor Yellow
        $atualizar = Read-Host "Deseja atualizar para a versão LTS recomendada? (S/N)"
        
        if ($atualizar -eq "S" -or $atualizar -eq "s") {
            # Atualizar para versão recomendada
            $packageJson.dependencies.react = "^18.2.0"
            $packageJson.dependencies.'react-dom' = "^18.2.0"
            
            # Salvar as alterações no package.json
            $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath -Encoding UTF8
            
            Write-Host "\n✅ Versões atualizadas para 18.2.0 no package.json" -ForegroundColor Green
            Write-Host "Execute 'npm install' para aplicar as alterações." -ForegroundColor White
        } else {
            Write-Host "\nMantendo as versões atuais." -ForegroundColor Cyan
        }
    } else {
        Write-Host "As versões atuais já são as LTS recomendadas." -ForegroundColor Green
    }
}

Write-Host "\nVerificação de conflitos de dependências concluída!" -ForegroundColor Green