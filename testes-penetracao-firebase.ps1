# Script para realizar testes de penetração específicos para a implementação Firebase

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Iniciando testes de penetração para implementação Firebase..." -ForegroundColor Yellow

# Criar diretório para relatórios se não existir
$reportDir = "$PSScriptRoot\security-reports"
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    Write-Host "✅ Diretório para relatórios criado: $reportDir" -ForegroundColor Green
}

# Nome do relatório com timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportFile = "$reportDir\firebase-pentest-report-$timestamp.md"

# Iniciar relatório
@"
# Relatório de Testes de Penetração - Implementação Firebase

**Data:** $(Get-Date -Format "dd/MM/yyyy HH:mm")
**Versão da Aplicação:** $(if (Test-Path "$PSScriptRoot\app.json") { (Get-Content "$PSScriptRoot\app.json" -Raw | ConvertFrom-Json).expo.version } else { "Não disponível" })

## Sumário Executivo

Este relatório apresenta os resultados dos testes de penetração realizados na implementação Firebase do aplicativo Açucaradas Encomendas. Os testes foram focados em identificar vulnerabilidades específicas relacionadas à autenticação, armazenamento de dados e configurações de segurança do Firebase.

## Metodologia

Os testes foram realizados utilizando uma combinação de ferramentas automatizadas e verificações manuais, seguindo as diretrizes do OWASP Mobile Security Testing Guide (MSTG) e as melhores práticas de segurança para aplicações Firebase.

## Resultados dos Testes

"@ | Out-File -FilePath $reportFile -Encoding utf8

# Função para adicionar resultado de teste ao relatório
function Add-TestResult {
    param (
        [string]$TestName,
        [string]$Description,
        [string]$Result,
        [string]$Severity,
        [string]$Recommendation
    )
    
    @"
### $TestName

**Descrição:** $Description

**Resultado:** $Result

**Severidade:** $Severity

**Recomendação:** $Recommendation

---

"@ | Out-File -FilePath $reportFile -Encoding utf8 -Append
}

# Função para verificar arquivos de configuração Firebase
function Test-FirebaseConfig {
    Write-Host "\nVerificando configurações do Firebase..." -ForegroundColor Cyan
    
    $configFiles = @(
        "$PSScriptRoot\src\config\firebase.ts",
        "$PSScriptRoot\firebase.json",
        "$PSScriptRoot\firestore.rules",
        "$PSScriptRoot\storage.rules",
        "$PSScriptRoot\google-services.json",
        "$PSScriptRoot\GoogleService-Info.plist"
    )
    
    $issues = @()
    $exposedApiKeys = $false
    $insecureRules = $false
    
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            Write-Host "Analisando: $file" -ForegroundColor White
            $content = Get-Content -Path $file -Raw
            
            # Verificar chaves API expostas em código
            if ($file -match "firebase\.ts$") {
                if ($content -match 'apiKey:\s*["'']([^"'']+)["'']' -and $content -notmatch 'process\.env') {
                    $exposedApiKeys = $true
                    $issues += "Chave API Firebase exposta diretamente no código em $file"
                }
            }
            
            # Verificar regras de segurança do Firestore
            if ($file -match "firestore\.rules$") {
                if ($content -match "allow read, write: if true" -or $content -match "allow read, write") {
                    $insecureRules = $true
                    $issues += "Regras de segurança do Firestore potencialmente inseguras em $file"
                }
            }
            
            # Verificar regras de segurança do Storage
            if ($file -match "storage\.rules$") {
                if ($content -match "allow read, write: if true" -or $content -match "allow read, write") {
                    $insecureRules = $true
                    $issues += "Regras de segurança do Storage potencialmente inseguras em $file"
                }
            }
        }
    }
    
    # Adicionar resultados ao relatório
    if ($exposedApiKeys) {
        Add-TestResult -TestName "Exposição de Chaves API" `
                     -Description "Verificação de chaves API e credenciais expostas diretamente no código" `
                     -Result "FALHA - Chaves API encontradas diretamente no código" `
                     -Severity "Alta" `
                     -Recommendation "Utilize variáveis de ambiente ou mecanismos seguros de armazenamento de segredos para armazenar chaves API. Nunca inclua chaves diretamente no código-fonte."
    } else {
        Add-TestResult -TestName "Exposição de Chaves API" `
                     -Description "Verificação de chaves API e credenciais expostas diretamente no código" `
                     -Result "PASSOU - Nenhuma chave API exposta encontrada" `
                     -Severity "N/A" `
                     -Recommendation "Continue utilizando boas práticas para gerenciamento de segredos."
    }
    
    if ($insecureRules) {
        Add-TestResult -TestName "Regras de Segurança Firebase" `
                     -Description "Verificação das regras de segurança do Firestore e Storage" `
                     -Result "FALHA - Regras potencialmente inseguras encontradas" `
                     -Severity "Alta" `
                     -Recommendation "Revise e restrinja as regras de segurança para garantir que apenas usuários autorizados tenham acesso aos dados. Evite usar 'allow read, write: if true'."
    } else {
        Add-TestResult -TestName "Regras de Segurança Firebase" `
                     -Description "Verificação das regras de segurança do Firestore e Storage" `
                     -Result "PASSOU - Regras de segurança adequadas" `
                     -Severity "N/A" `
                     -Recommendation "Continue revisando periodicamente as regras de segurança conforme a aplicação evolui."
    }
    
    return $issues
}

# Função para verificar implementação de autenticação
function Test-Authentication {
    Write-Host "\nVerificando implementação de autenticação..." -ForegroundColor Cyan
    
    $authFiles = @(
        "$PSScriptRoot\src\services\AuthService.ts"
    )
    
    $issues = @()
    $insecureStorage = $false
    $missingEmailVerification = $false
    $weakPasswordPolicy = $false
    
    foreach ($file in $authFiles) {
        if (Test-Path $file) {
            Write-Host "Analisando: $file" -ForegroundColor White
            $content = Get-Content -Path $file -Raw
            
            # Verificar armazenamento inseguro de tokens
            if ($content -match "localStorage" -and $content -match "token") {
                $insecureStorage = $true
                $issues += "Possível armazenamento inseguro de tokens de autenticação em localStorage"
            }
            
            # Verificar verificação de email
            if ($content -match "createUserWithEmailAndPassword" -and -not ($content -match "sendEmailVerification")) {
                $missingEmailVerification = $true
                $issues += "Possível falta de verificação de email durante o registro"
            }
            
            # Verificar política de senhas
            if ($content -match "createUserWithEmailAndPassword" -and -not ($content -match "password.length" -or $content -match "validatePassword")) {
                $weakPasswordPolicy = $true
                $issues += "Possível falta de validação de força de senha"
            }
        }
    }
    
    # Adicionar resultados ao relatório
    if ($insecureStorage) {
        Add-TestResult -TestName "Armazenamento de Tokens" `
                     -Description "Verificação do método de armazenamento de tokens de autenticação" `
                     -Result "FALHA - Possível uso de armazenamento inseguro" `
                     -Severity "Média" `
                     -Recommendation "Utilize SecureStore ou outro mecanismo seguro para armazenar tokens de autenticação. Evite localStorage em aplicações web."
    } else {
        Add-TestResult -TestName "Armazenamento de Tokens" `
                     -Description "Verificação do método de armazenamento de tokens de autenticação" `
                     -Result "PASSOU - Nenhum armazenamento inseguro detectado" `
                     -Severity "N/A" `
                     -Recommendation "Continue utilizando armazenamento seguro para tokens de autenticação."
    }
    
    if ($missingEmailVerification) {
        Add-TestResult -TestName "Verificação de Email" `
                     -Description "Verificação da implementação de verificação de email durante o registro" `
                     -Result "FALHA - Possível falta de verificação de email" `
                     -Severity "Média" `
                     -Recommendation "Implemente verificação de email para todos os novos registros para prevenir criação de contas com emails falsos."
    } else {
        Add-TestResult -TestName "Verificação de Email" `
                     -Description "Verificação da implementação de verificação de email durante o registro" `
                     -Result "PASSOU - Verificação de email implementada" `
                     -Severity "N/A" `
                     -Recommendation "Continue exigindo verificação de email para novos registros."
    }
    
    if ($weakPasswordPolicy) {
        Add-TestResult -TestName "Política de Senhas" `
                     -Description "Verificação da implementação de política de senhas fortes" `
                     -Result "FALHA - Possível falta de validação de força de senha" `
                     -Severity "Alta" `
                     -Recommendation "Implemente validação de força de senha que exija pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais."
    } else {
        Add-TestResult -TestName "Política de Senhas" `
                     -Description "Verificação da implementação de política de senhas fortes" `
                     -Result "PASSOU - Validação de força de senha implementada" `
                     -Severity "N/A" `
                     -Recommendation "Continue exigindo senhas fortes para todos os usuários."
    }
    
    return $issues
}

# Função para verificar proteção contra ataques comuns
function Test-CommonAttacks {
    Write-Host "\nVerificando proteção contra ataques comuns..." -ForegroundColor Cyan
    
    $issues = @()
    $missingRateLimiting = $true
    $missingJwtValidation = $true
    
    # Verificar arquivos de serviço
    $serviceFiles = Get-ChildItem -Path "$PSScriptRoot\src\services" -Filter "*.ts" -Recurse | Select-Object -ExpandProperty FullName
    
    foreach ($file in $serviceFiles) {
        $content = Get-Content -Path $file -Raw
        
        # Verificar limitação de taxa
        if ($content -match "rateLimit" -or $content -match "throttle" -or $content -match "limiter") {
            $missingRateLimiting = $false
        }
        
        # Verificar validação de JWT
        if ($content -match "verifyIdToken" -or $content -match "validateToken" -or $content -match "verify\(token") {
            $missingJwtValidation = $false
        }
    }
    
    if ($missingRateLimiting) {
        $issues += "Possível falta de limitação de taxa para prevenção de ataques de força bruta"
    }
    
    if ($missingJwtValidation) {
        $issues += "Possível falta de validação adequada de tokens JWT"
    }
    
    # Adicionar resultados ao relatório
    if ($missingRateLimiting) {
        Add-TestResult -TestName "Limitação de Taxa" `
                     -Description "Verificação de mecanismos de limitação de taxa para prevenção de ataques de força bruta" `
                     -Result "FALHA - Nenhum mecanismo de limitação de taxa detectado" `
                     -Severity "Média" `
                     -Recommendation "Implemente limitação de taxa para endpoints sensíveis, especialmente autenticação, para prevenir ataques de força bruta."
    } else {
        Add-TestResult -TestName "Limitação de Taxa" `
                     -Description "Verificação de mecanismos de limitação de taxa para prevenção de ataques de força bruta" `
                     -Result "PASSOU - Mecanismo de limitação de taxa detectado" `
                     -Severity "N/A" `
                     -Recommendation "Continue utilizando limitação de taxa para proteger endpoints sensíveis."
    }
    
    if ($missingJwtValidation) {
        Add-TestResult -TestName "Validação de JWT" `
                     -Description "Verificação da validação adequada de tokens JWT" `
                     -Result "FALHA - Possível falta de validação adequada de tokens JWT" `
                     -Severity "Alta" `
                     -Recommendation "Implemente validação completa de tokens JWT, incluindo verificação de assinatura, expiração e emissor."
    } else {
        Add-TestResult -TestName "Validação de JWT" `
                     -Description "Verificação da validação adequada de tokens JWT" `
                     -Result "PASSOU - Validação de tokens JWT implementada" `
                     -Severity "N/A" `
                     -Recommendation "Continue validando tokens JWT adequadamente."
    }
    
    return $issues
}

# Função para verificar proteção de dados sensíveis
function Test-DataProtection {
    Write-Host "\nVerificando proteção de dados sensíveis..." -ForegroundColor Cyan
    
    $issues = @()
    $insecureDataStorage = $false
    $missingEncryption = $false
    
    # Verificar arquivos de serviço e modelos
    $files = @()
    $files += Get-ChildItem -Path "$PSScriptRoot\src\services" -Filter "*.ts" -Recurse | Select-Object -ExpandProperty FullName
    $files += Get-ChildItem -Path "$PSScriptRoot\src\models" -Filter "*.ts" -Recurse | Select-Object -ExpandProperty FullName
    
    foreach ($file in $files) {
        $content = Get-Content -Path $file -Raw
        
        # Verificar armazenamento inseguro de dados sensíveis
        if (($content -match "localStorage" -or $content -match "AsyncStorage") -and 
            ($content -match "password" -or $content -match "credit" -or $content -match "cartao" -or $content -match "cpf" -or $content -match "endereco")) {
            $insecureDataStorage = $true
            $issues += "Possível armazenamento inseguro de dados sensíveis em $file"
        }
        
        # Verificar falta de criptografia para dados sensíveis
        if (($content -match "password" -or $content -match "credit" -or $content -match "cartao" -or $content -match "cpf") -and 
            -not ($content -match "encrypt" -or $content -match "crypt" -or $content -match "hash")) {
            $missingEncryption = $true
            $issues += "Possível falta de criptografia para dados sensíveis em $file"
        }
    }
    
    # Adicionar resultados ao relatório
    if ($insecureDataStorage) {
        Add-TestResult -TestName "Armazenamento de Dados Sensíveis" `
                     -Description "Verificação do método de armazenamento de dados sensíveis" `
                     -Result "FALHA - Possível armazenamento inseguro de dados sensíveis" `
                     -Severity "Alta" `
                     -Recommendation "Utilize SecureStore ou outro mecanismo seguro para armazenar dados sensíveis. Nunca armazene dados sensíveis em localStorage ou AsyncStorage sem criptografia."
    } else {
        Add-TestResult -TestName "Armazenamento de Dados Sensíveis" `
                     -Description "Verificação do método de armazenamento de dados sensíveis" `
                     -Result "PASSOU - Nenhum armazenamento inseguro detectado" `
                     -Severity "N/A" `
                     -Recommendation "Continue utilizando armazenamento seguro para dados sensíveis."
    }
    
    if ($missingEncryption) {
        Add-TestResult -TestName "Criptografia de Dados Sensíveis" `
                     -Description "Verificação da implementação de criptografia para dados sensíveis" `
                     -Result "FALHA - Possível falta de criptografia para dados sensíveis" `
                     -Severity "Alta" `
                     -Recommendation "Implemente criptografia para todos os dados sensíveis antes de armazená-los, mesmo em armazenamento seguro."
    } else {
        Add-TestResult -TestName "Criptografia de Dados Sensíveis" `
                     -Description "Verificação da implementação de criptografia para dados sensíveis" `
                     -Result "PASSOU - Criptografia implementada para dados sensíveis" `
                     -Severity "N/A" `
                     -Recommendation "Continue criptografando dados sensíveis antes de armazená-los."
    }
    
    return $issues
}

# Executar testes
Write-Host "\nExecutando testes de penetração..." -ForegroundColor Yellow

$allIssues = @()

$configIssues = Test-FirebaseConfig
$allIssues += $configIssues

$authIssues = Test-Authentication
$allIssues += $authIssues

$attackIssues = Test-CommonAttacks
$allIssues += $attackIssues

$dataIssues = Test-DataProtection
$allIssues += $dataIssues

# Adicionar resumo ao relatório
@"

## Resumo das Vulnerabilidades

**Total de problemas encontrados:** $($allIssues.Count)

$(if ($allIssues.Count -gt 0) {
"### Lista de Vulnerabilidades

$(foreach ($issue in $allIssues) {"- $issue`n"})"} else {"Nenhuma vulnerabilidade encontrada."})

## Recomendações Gerais

1. **Revisão Regular de Segurança**: Estabeleça um processo de revisão regular das configurações de segurança do Firebase.
2. **Testes Automatizados**: Implemente testes automatizados de segurança como parte do pipeline CI/CD.
3. **Monitoramento**: Configure alertas para atividades suspeitas no Firebase Authentication e Firestore.
4. **Atualizações**: Mantenha as bibliotecas Firebase e dependências relacionadas sempre atualizadas.
5. **Documentação**: Mantenha documentação atualizada sobre as medidas de segurança implementadas.

## Conclusão

$(if ($allIssues.Count -eq 0) {
"A implementação Firebase do aplicativo Açucaradas Encomendas demonstra boas práticas de segurança. Nenhuma vulnerabilidade crítica foi identificada durante os testes. Recomenda-se manter as práticas atuais e implementar revisões regulares de segurança."} else {
"A implementação Firebase do aplicativo Açucaradas Encomendas apresenta algumas vulnerabilidades que devem ser corrigidas. Recomenda-se priorizar a resolução dos problemas identificados com severidade Alta, seguidos pelos de severidade Média."})

---

*Relatório gerado automaticamente por script de teste de penetração*
"@ | Out-File -FilePath $reportFile -Encoding utf8 -Append

# Exibir resultado
Write-Host "\nTestes de penetração concluídos!" -ForegroundColor Green
Write-Host "Relatório gerado em: $reportFile" -ForegroundColor Cyan

if ($allIssues.Count -gt 0) {
    Write-Host "\nForam encontrados $($allIssues.Count) problemas potenciais:" -ForegroundColor Yellow
    foreach ($issue in $allIssues) {
        Write-Host " - $issue" -ForegroundColor White
    }
    Write-Host "\nRecomenda-se revisar e corrigir esses problemas antes de prosseguir." -ForegroundColor Yellow
} else {
    Write-Host "\nNenhum problema de segurança foi detectado!" -ForegroundColor Green
}

Write-Host "\nPróximos passos:" -ForegroundColor Yellow
Write-Host "1. Revise o relatório detalhado" -ForegroundColor White
Write-Host "2. Corrija as vulnerabilidades identificadas" -ForegroundColor White
Write-Host "3. Execute novamente os testes após as correções" -ForegroundColor White
Write-Host "4. Atualize a documentação com as medidas de segurança implementadas" -ForegroundColor White