# Script de Varredura de Segurança Completa
# Acucaradas Encomendas
# Versão 1.0

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configurações
$appRoot = $PSScriptRoot | Split-Path -Parent
$reportDir = Join-Path -Path $appRoot -ChildPath "relatorios-seguranca"
$reportFile = Join-Path -Path $reportDir -ChildPath "varredura-completa-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$summaryFile = Join-Path -Path $reportDir -ChildPath "resumo-varredura-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"

# Criar diretório de relatórios se não existir
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

# Função para exibir cabeçalho
function Show-Header {
    param (
        [string]$Title
    )
    
    $separator = "=" * 80
    Write-Host ""
    Write-Host $separator -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host $separator -ForegroundColor Cyan
}

# Função para exibir resultado de verificação
function Show-Result {
    param (
        [string]$Check,
        [string]$Result,
        [string]$Details = ""
    )
    
    $color = switch ($Result) {
        "APROVADO" { "Green" }
        "ATENÇÃO" { "Yellow" }
        "FALHA" { "Red" }
        default { "White" }
    }
    
    Write-Host "[$Result]" -ForegroundColor $color -NoNewline
    Write-Host " $Check"
    
    if ($Details) {
        Write-Host "  $Details" -ForegroundColor Gray
    }
    
    return @{
        "check" = $Check
        "result" = $Result
        "details" = $Details
    }
}

# Iniciar varredura
Show-Header "VARREDURA DE SEGURANÇA COMPLETA - ACUCARADAS ENCOMENDAS"
Write-Host "Iniciando varredura completa de segurança..." -ForegroundColor Yellow
Write-Host "Data e hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

$resultados = @()

# 1. Verificar Headers de Segurança
Show-Header "1. VERIFICAÇÃO DE HEADERS DE SEGURANÇA"

$securityHeadersFile = Join-Path -Path $appRoot -ChildPath "src\utils\security-headers.js"
if (Test-Path $securityHeadersFile) {
    $content = Get-Content -Path $securityHeadersFile -Raw
    
    # Verificar Content-Security-Policy
    if ($content -match "Content-Security-Policy") {
        $cspConfig = $content -match "CSP_CONFIG"
        if ($cspConfig -and $content -match "'unsafe-inline'") {
            $resultados += Show-Result -Check "Content-Security-Policy" -Result "ATENÇÃO" -Details "CSP implementado, mas permite 'unsafe-inline' que pode comprometer a segurança contra XSS."
        } else {
            $resultados += Show-Result -Check "Content-Security-Policy" -Result "APROVADO" -Details "CSP implementado corretamente."
        }
    } else {
        $resultados += Show-Result -Check "Content-Security-Policy" -Result "FALHA" -Details "CSP não encontrado no arquivo de headers de segurança."
    }
    
    # Verificar X-XSS-Protection
    if ($content -match "X-XSS-Protection") {
        $resultados += Show-Result -Check "X-XSS-Protection" -Result "APROVADO" -Details "Header X-XSS-Protection implementado."
    } else {
        $resultados += Show-Result -Check "X-XSS-Protection" -Result "FALHA" -Details "Header X-XSS-Protection não encontrado."
    }
    
    # Verificar X-Frame-Options
    if ($content -match "X-Frame-Options") {
        if ($content -match "X-Frame-Options.*DENY") {
            $resultados += Show-Result -Check "X-Frame-Options" -Result "APROVADO" -Details "Header X-Frame-Options configurado com DENY (máxima proteção)."
        } else {
            $resultados += Show-Result -Check "X-Frame-Options" -Result "ATENÇÃO" -Details "Header X-Frame-Options presente, mas não configurado com DENY."
        }
    } else {
        $resultados += Show-Result -Check "X-Frame-Options" -Result "FALHA" -Details "Header X-Frame-Options não encontrado."
    }
    
    # Verificar Strict-Transport-Security (HSTS)
    if ($content -match "Strict-Transport-Security") {
        $resultados += Show-Result -Check "Strict-Transport-Security" -Result "APROVADO" -Details "HSTS implementado para forçar HTTPS."
    } else {
        $resultados += Show-Result -Check "Strict-Transport-Security" -Result "FALHA" -Details "HSTS não encontrado."
    }
} else {
    $resultados += Show-Result -Check "Headers de Segurança" -Result "FALHA" -Details "Arquivo de headers de segurança não encontrado: $securityHeadersFile"
}

# 2. Verificar Proteção CSRF
Show-Header "2. VERIFICAÇÃO DE PROTEÇÃO CSRF"

$csrfFile = Join-Path -Path $appRoot -ChildPath "src\services\CsrfProtection.ts"
if (Test-Path $csrfFile) {
    $content = Get-Content -Path $csrfFile -Raw
    
    # Verificar geração de token
    if ($content -match "generateToken") {
        $resultados += Show-Result -Check "Geração de Token CSRF" -Result "APROVADO" -Details "Método de geração de token CSRF implementado."
    } else {
        $resultados += Show-Result -Check "Geração de Token CSRF" -Result "FALHA" -Details "Método de geração de token CSRF não encontrado."
    }
    
    # Verificar validação de token
    if ($content -match "validateToken") {
        $resultados += Show-Result -Check "Validação de Token CSRF" -Result "APROVADO" -Details "Método de validação de token CSRF implementado."
    } else {
        $resultados += Show-Result -Check "Validação de Token CSRF" -Result "FALHA" -Details "Método de validação de token CSRF não encontrado."
    }
    
    # Verificar armazenamento seguro
    if ($content -match "localStorage") {
        $resultados += Show-Result -Check "Armazenamento de Token CSRF" -Result "ATENÇÃO" -Details "Token CSRF armazenado em localStorage, que é vulnerável a XSS. Considere usar cookies HttpOnly."
    } else if ($content -match "cookie") {
        $resultados += Show-Result -Check "Armazenamento de Token CSRF" -Result "APROVADO" -Details "Token CSRF armazenado em cookies."
    } else {
        $resultados += Show-Result -Check "Armazenamento de Token CSRF" -Result "FALHA" -Details "Método de armazenamento de token CSRF não identificado."
    }
} else {
    $resultados += Show-Result -Check "Proteção CSRF" -Result "FALHA" -Details "Arquivo de proteção CSRF não encontrado: $csrfFile"
}

# 3. Verificar Sanitização de Inputs
Show-Header "3. VERIFICAÇÃO DE SANITIZAÇÃO DE INPUTS"

# Procurar por arquivos que possam conter sanitização
$sanitizationFiles = Get-ChildItem -Path $appRoot -Recurse -Include "*sanitize*.js", "*sanitize*.ts", "*validation*.js", "*validation*.ts", "*security*.js", "*security*.ts" -File

if ($sanitizationFiles.Count -gt 0) {
    $sanitizationFound = $false
    $xssSanitizationFound = $false
    $sqlSanitizationFound = $false
    
    foreach ($file in $sanitizationFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        if ($content -match "sanitize") {
            $sanitizationFound = $true
            
            if ($content -match "sanitizeHTML|sanitizeHtml|xss|XSS") {
                $xssSanitizationFound = $true
            }
            
            if ($content -match "sanitizeSQL|sanitizeSql|sql|SQL") {
                $sqlSanitizationFound = $true
            }
        }
    }
    
    if ($sanitizationFound) {
        $resultados += Show-Result -Check "Sanitização Geral" -Result "APROVADO" -Details "Métodos de sanitização encontrados."
    } else {
        $resultados += Show-Result -Check "Sanitização Geral" -Result "FALHA" -Details "Nenhum método de sanitização encontrado nos arquivos verificados."
    }
    
    if ($xssSanitizationFound) {
        $resultados += Show-Result -Check "Sanitização XSS" -Result "APROVADO" -Details "Sanitização contra XSS encontrada."
    } else {
        $resultados += Show-Result -Check "Sanitização XSS" -Result "FALHA" -Details "Sanitização contra XSS não encontrada."
    }
    
    if ($sqlSanitizationFound) {
        $resultados += Show-Result -Check "Sanitização SQL" -Result "APROVADO" -Details "Sanitização contra SQL Injection encontrada."
    } else {
        $resultados += Show-Result -Check "Sanitização SQL" -Result "FALHA" -Details "Sanitização contra SQL Injection não encontrada."
    }
} else {
    $resultados += Show-Result -Check "Sanitização de Inputs" -Result "FALHA" -Details "Nenhum arquivo de sanitização encontrado."
}

# 4. Verificar Configuração de Autenticação
Show-Header "4. VERIFICAÇÃO DE AUTENTICAÇÃO"

# Procurar por arquivos relacionados à autenticação
$authFiles = Get-ChildItem -Path $appRoot -Recurse -Include "*auth*.js", "*auth*.ts", "*login*.js", "*login*.ts" -File

if ($authFiles.Count -gt 0) {
    $passwordHashingFound = $false
    $passwordValidationFound = $false
    $mfaFound = $false
    
    foreach ($file in $authFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        if ($content -match "hash|bcrypt|scrypt|argon2|pbkdf2") {
            $passwordHashingFound = $true
        }
        
        if ($content -match "validatePassword|passwordValidation|passwordStrength") {
            $passwordValidationFound = $true
        }
        
        if ($content -match "2fa|mfa|twoFactor|twofactor|otp|totp") {
            $mfaFound = $true
        }
    }
    
    if ($passwordHashingFound) {
        $resultados += Show-Result -Check "Hashing de Senhas" -Result "APROVADO" -Details "Métodos de hashing de senhas encontrados."
    } else {
        $resultados += Show-Result -Check "Hashing de Senhas" -Result "FALHA" -Details "Nenhum método de hashing de senhas encontrado."
    }
    
    if ($passwordValidationFound) {
        $resultados += Show-Result -Check "Validação de Senhas" -Result "APROVADO" -Details "Validação de força de senhas encontrada."
    } else {
        $resultados += Show-Result -Check "Validação de Senhas" -Result "ATENÇÃO" -Details "Nenhuma validação de força de senhas encontrada."
    }
    
    if ($mfaFound) {
        $resultados += Show-Result -Check "Autenticação de Dois Fatores" -Result "APROVADO" -Details "Implementação de 2FA/MFA encontrada."
    } else {
        $resultados += Show-Result -Check "Autenticação de Dois Fatores" -Result "ATENÇÃO" -Details "Nenhuma implementação de 2FA/MFA encontrada."
    }
} else {
    $resultados += Show-Result -Check "Autenticação" -Result "FALHA" -Details "Nenhum arquivo de autenticação encontrado."
}

# 5. Verificar Configuração de CORS
Show-Header "5. VERIFICAÇÃO DE CONFIGURAÇÃO CORS"

# Procurar por arquivos que possam conter configuração CORS
$corsFiles = Get-ChildItem -Path $appRoot -Recurse -Include "*cors*.js", "*cors*.ts", "*server*.js", "*server*.ts" -File

if ($corsFiles.Count -gt 0) {
    $corsFound = $false
    $corsWildcardFound = $false
    
    foreach ($file in $corsFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        if ($content -match "cors") {
            $corsFound = $true
            
            if ($content -match "\*|origin:\s*true") {
                $corsWildcardFound = $true
            }
        }
    }
    
    if ($corsFound) {
        if ($corsWildcardFound) {
            $resultados += Show-Result -Check "Configuração CORS" -Result "FALHA" -Details "CORS configurado com wildcard (*) ou origin: true, o que é inseguro."
        } else {
            $resultados += Show-Result -Check "Configuração CORS" -Result "APROVADO" -Details "CORS configurado corretamente com origens específicas."
        }
    } else {
        $resultados += Show-Result -Check "Configuração CORS" -Result "ATENÇÃO" -Details "Nenhuma configuração CORS encontrada."
    }
} else {
    $resultados += Show-Result -Check "Configuração CORS" -Result "ATENÇÃO" -Details "Nenhum arquivo relacionado a CORS encontrado."
}

# 6. Verificar Dependências Vulneráveis
Show-Header "6. VERIFICAÇÃO DE DEPENDÊNCIAS VULNERÁVEIS"

$packageJsonPath = Join-Path -Path $appRoot -ChildPath "package.json"
if (Test-Path $packageJsonPath) {
    try {
        # Verificar se npm está instalado
        $npmVersion = npm -v
        Write-Host "Executando auditoria de dependências com npm..." -ForegroundColor Yellow
        
        # Executar npm audit e capturar saída
        $auditOutput = npm audit --json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($auditOutput) {
            $vulnerabilities = $auditOutput.vulnerabilities
            
            if ($vulnerabilities) {
                $criticalCount = 0
                $highCount = 0
                $moderateCount = 0
                $lowCount = 0
                
                foreach ($vuln in $vulnerabilities.PSObject.Properties) {
                    $severity = $vuln.Value.severity
                    
                    switch ($severity) {
                        "critical" { $criticalCount++ }
                        "high" { $highCount++ }
                        "moderate" { $moderateCount++ }
                        "low" { $lowCount++ }
                    }
                }
                
                $totalVulnerabilities = $criticalCount + $highCount + $moderateCount + $lowCount
                
                if ($criticalCount -gt 0 -or $highCount -gt 0) {
                    $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "FALHA" -Details "Encontradas $totalVulnerabilities vulnerabilidades (Críticas: $criticalCount, Altas: $highCount, Moderadas: $moderateCount, Baixas: $lowCount)."
                } elseif ($moderateCount -gt 0) {
                    $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "ATENÇÃO" -Details "Encontradas $totalVulnerabilities vulnerabilidades (Moderadas: $moderateCount, Baixas: $lowCount)."
                } elseif ($lowCount -gt 0) {
                    $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "APROVADO" -Details "Encontradas apenas $lowCount vulnerabilidades de baixa severidade."
                } else {
                    $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "APROVADO" -Details "Nenhuma vulnerabilidade encontrada nas dependências."
                }
            } else {
                $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "APROVADO" -Details "Nenhuma vulnerabilidade encontrada nas dependências."
            }
        } else {
            $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "ATENÇÃO" -Details "Não foi possível analisar o resultado da auditoria de dependências."
        }
    } catch {
        $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "ATENÇÃO" -Details "Erro ao executar auditoria de dependências: $_"
    }
} else {
    $resultados += Show-Result -Check "Dependências Vulneráveis" -Result "ATENÇÃO" -Details "Arquivo package.json não encontrado: $packageJsonPath"
}

# 7. Verificar Configuração de Cookies
Show-Header "7. VERIFICAÇÃO DE CONFIGURAÇÃO DE COOKIES"

# Procurar por arquivos que possam conter configuração de cookies
$cookieFiles = Get-ChildItem -Path $appRoot -Recurse -Include "*cookie*.js", "*cookie*.ts", "*session*.js", "*session*.ts" -File

if ($cookieFiles.Count -gt 0) {
    $secureCookieFound = $false
    $httpOnlyCookieFound = $false
    $sameSiteCookieFound = $false
    
    foreach ($file in $cookieFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        if ($content -match "secure:\s*true|Secure") {
            $secureCookieFound = $true
        }
        
        if ($content -match "httpOnly:\s*true|HttpOnly") {
            $httpOnlyCookieFound = $true
        }
        
        if ($content -match "sameSite|SameSite") {
            $sameSiteCookieFound = $true
        }
    }
    
    if ($secureCookieFound) {
        $resultados += Show-Result -Check "Cookies Secure" -Result "APROVADO" -Details "Flag Secure encontrada na configuração de cookies."
    } else {
        $resultados += Show-Result -Check "Cookies Secure" -Result "FALHA" -Details "Flag Secure não encontrada na configuração de cookies."
    }
    
    if ($httpOnlyCookieFound) {
        $resultados += Show-Result -Check "Cookies HttpOnly" -Result "APROVADO" -Details "Flag HttpOnly encontrada na configuração de cookies."
    } else {
        $resultados += Show-Result -Check "Cookies HttpOnly" -Result "FALHA" -Details "Flag HttpOnly não encontrada na configuração de cookies."
    }
    
    if ($sameSiteCookieFound) {
        $resultados += Show-Result -Check "Cookies SameSite" -Result "APROVADO" -Details "Configuração SameSite encontrada para cookies."
    } else {
        $resultados += Show-Result -Check "Cookies SameSite" -Result "FALHA" -Details "Configuração SameSite não encontrada para cookies."
    }
} else {
    $resultados += Show-Result -Check "Configuração de Cookies" -Result "ATENÇÃO" -Details "Nenhum arquivo relacionado a cookies encontrado."
}

# 8. Verificar Proteção contra Ataques de Força Bruta
Show-Header "8. VERIFICAÇÃO DE PROTEÇÃO CONTRA FORÇA BRUTA"

# Procurar por arquivos que possam conter proteção contra força bruta
$bruteForceFiles = Get-ChildItem -Path $appRoot -Recurse -Include "*rate*.js", "*rate*.ts", "*limit*.js", "*limit*.ts", "*auth*.js", "*auth*.ts", "*login*.js", "*login*.ts" -File

if ($bruteForceFiles.Count -gt 0) {
    $rateLimitingFound = $false
    $accountLockoutFound = $false
    
    foreach ($file in $bruteForceFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        if ($content -match "rateLimit|rate-limit|rateLimiter|throttle") {
            $rateLimitingFound = $true
        }
        
        if ($content -match "lockout|maxAttempts|failedAttempts|accountLock") {
            $accountLockoutFound = $true
        }
    }
    
    if ($rateLimitingFound) {
        $resultados += Show-Result -Check "Rate Limiting" -Result "APROVADO" -Details "Implementação de rate limiting encontrada."
    } else {
        $resultados += Show-Result -Check "Rate Limiting" -Result "FALHA" -Details "Nenhuma implementação de rate limiting encontrada."
    }
    
    if ($accountLockoutFound) {
        $resultados += Show-Result -Check "Bloqueio de Conta" -Result "APROVADO" -Details "Mecanismo de bloqueio de conta após tentativas falhas encontrado."
    } else {
        $resultados += Show-Result -Check "Bloqueio de Conta" -Result "FALHA" -Details "Nenhum mecanismo de bloqueio de conta encontrado."
    }
} else {
    $resultados += Show-Result -Check "Proteção contra Força Bruta" -Result "FALHA" -Details "Nenhum arquivo relacionado a proteção contra força bruta encontrado."
}

# Gerar resumo
Show-Header "RESUMO DA VARREDURA DE SEGURANÇA"

$aprovados = ($resultados | Where-Object { $_["result"] -eq "APROVADO" }).Count
$atencao = ($resultados | Where-Object { $_["result"] -eq "ATENÇÃO" }).Count
$falhas = ($resultados | Where-Object { $_["result"] -eq "FALHA" }).Count
$total = $resultados.Count

$porcentagemAprovados = [math]::Round(($aprovados / $total) * 100, 2)

Write-Host "Total de verificações: $total" -ForegroundColor White
Write-Host "Aprovados: $aprovados ($porcentagemAprovados%)" -ForegroundColor Green
Write-Host "Atenção: $atencao" -ForegroundColor Yellow
Write-Host "Falhas: $falhas" -ForegroundColor Red

# Determinar status geral
$statusGeral = if ($falhas -eq 0 -and $atencao -eq 0) {
    "APROVADO"
} elseif ($falhas -eq 0 -and $atencao -gt 0) {
    "ATENÇÃO"
} else {
    "FALHA"
}

$corStatusGeral = switch ($statusGeral) {
    "APROVADO" { "Green" }
    "ATENÇÃO" { "Yellow" }
    "FALHA" { "Red" }
}

Write-Host ""
Write-Host "Status geral da varredura: [$statusGeral]" -ForegroundColor $corStatusGeral

# Salvar resultados em JSON
$resultadosJson = @{
    "data" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "status_geral" = $statusGeral
    "total_verificacoes" = $total
    "aprovados" = $aprovados
    "atencao" = $atencao
    "falhas" = $falhas
    "porcentagem_aprovados" = $porcentagemAprovados
    "resultados" = $resultados
} | ConvertTo-Json -Depth 5

$resultadosJson | Out-File -FilePath $reportFile -Encoding utf8
Write-Host "Relatório JSON salvo em: $reportFile" -ForegroundColor Cyan

# Gerar relatório em Markdown
$markdownReport = @"
# Relatório de Varredura de Segurança - Acucaradas Encomendas

**Data:** $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")

## Resumo

- **Status Geral:** $statusGeral
- **Total de Verificações:** $total
- **Aprovados:** $aprovados ($porcentagemAprovados%)
- **Atenção:** $atencao
- **Falhas:** $falhas

## Resultados Detalhados

"@

# Agrupar resultados por categoria
$categorias = @(
    "HEADERS DE SEGURANÇA",
    "PROTEÇÃO CSRF",
    "SANITIZAÇÃO DE INPUTS",
    "AUTENTICAÇÃO",
    "CONFIGURAÇÃO CORS",
    "DEPENDÊNCIAS VULNERÁVEIS",
    "CONFIGURAÇÃO DE COOKIES",
    "PROTEÇÃO CONTRA FORÇA BRUTA"
)

foreach ($categoria in $categorias) {
    $markdownReport += "### $categoria`n`n"
    
    $resultadosCategoria = $resultados | Where-Object { $_["check"] -match $categoria -or ($_["check"] -match ($categoria -replace " DE | CONTRA ", " ") -replace "CONFIGURAÇÃO ", "" -replace "PROTEÇÃO ", "" -replace "VERIFICAÇÃO ", "" -replace "Ç", "C") }
    
    if ($resultadosCategoria.Count -eq 0) {
        $markdownReport += "Nenhuma verificação realizada nesta categoria.`n`n"
        continue
    }
    
    $markdownReport += "| Verificação | Resultado | Detalhes |`n"
    $markdownReport += "|------------|-----------|----------|`n"
    
    foreach ($resultado in $resultadosCategoria) {
        $emoji = switch ($resultado["result"]) {
            "APROVADO" { "✅" }
            "ATENÇÃO" { "⚠️" }
            "FALHA" { "❌" }
            default { "" }
        }
        
        $markdownReport += "| $($resultado["check"]) | $emoji $($resultado["result"]) | $($resultado["details"]) |`n"
    }
    
    $markdownReport += "`n"
}

# Adicionar recomendações
$markdownReport += @"
## Recomendações

"@

$falhasEncontradas = $resultados | Where-Object { $_["result"] -eq "FALHA" }
if ($falhasEncontradas.Count -gt 0) {
    $markdownReport += "### Correções Prioritárias

"
    
    foreach ($falha in $falhasEncontradas) {
        $markdownReport += "- **$($falha["check"])**: $($falha["details"])`n"
    }
    
    $markdownReport += "`n"
}

$atencaoEncontrada = $resultados | Where-Object { $_["result"] -eq "ATENÇÃO" }
if ($atencaoEncontrada.Count -gt 0) {
    $markdownReport += "### Melhorias Recomendadas

"
    
    foreach ($item in $atencaoEncontrada) {
        $markdownReport += "- **$($item["check"])**: $($item["details"])`n"
    }
    
    $markdownReport += "`n"
}

# Adicionar próximos passos
$markdownReport += @"
## Próximos Passos

1. Corrigir todas as falhas identificadas, priorizando as de maior risco
2. Implementar as melhorias recomendadas
3. Executar nova varredura após as correções para verificar a eficácia
4. Documentar todas as alterações realizadas
5. Implementar um processo de varredura de segurança periódica

---

*Relatório gerado automaticamente pelo script de varredura de segurança*
"@

$markdownReport | Out-File -FilePath $summaryFile -Encoding utf8
Write-Host "Relatório Markdown salvo em: $summaryFile" -ForegroundColor Cyan

# Finalizar
Write-Host ""
Write-Host "Varredura de segurança concluída!" -ForegroundColor Green
Write-Host "Verifique os relatórios para detalhes e recomendações." -ForegroundColor Yellow