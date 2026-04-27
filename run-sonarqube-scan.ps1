# Script para executar análise SonarQube

# Verifica se o SonarScanner está instalado globalmente
$sonarScannerInstalled = Get-Command sonar-scanner -ErrorAction SilentlyContinue

if (-not $sonarScannerInstalled) {
    Write-Host "SonarScanner não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g sonarqube-scanner
}

# Instala dependências de segurança se não existirem
Write-Host "Verificando dependências de segurança..." -ForegroundColor Cyan
npm install --save-dev eslint-plugin-security @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-native eslint-plugin-react-hooks

# Executa ESLint com regras de segurança
Write-Host "Executando ESLint com regras de segurança..." -ForegroundColor Cyan
npx eslint --ext .js,.jsx,.ts,.tsx ./src/ -o ./eslint-report.json -f json

# Executa análise de segurança com OWASP Dependency Check
Write-Host "Executando OWASP Dependency Check..." -ForegroundColor Cyan
npm install --save-dev @owasp/dependency-check
npx owasp-dependency-check --project "Acucaradas Encomendas" --out ./security-reports --scan ./

# Gera relatório de segurança para SonarQube
Write-Host "Gerando relatório de segurança para SonarQube..." -ForegroundColor Cyan
$securityReport = @{
    "vulnerabilities" = @()
}

# Adiciona vulnerabilidades do ESLint (se existirem)
if (Test-Path ./eslint-report.json) {
    $eslintReport = Get-Content ./eslint-report.json | ConvertFrom-Json
    foreach ($issue in $eslintReport) {
        if ($issue.ruleId -like "security/*") {
            $vulnerability = @{
                "category" = "Security Hotspot"
                "message" = $issue.message
                "file" = $issue.filePath
                "line" = $issue.line
                "severity" = "HIGH"
                "source" = "ESLint"
            }
            $securityReport.vulnerabilities += $vulnerability
        }
    }
}

# Salva o relatório de segurança
$securityReport | ConvertTo-Json -Depth 10 | Out-File -FilePath ./security-scan.json -Encoding utf8

# Executa o SonarScanner
Write-Host "Executando análise SonarQube..." -ForegroundColor Green
sonar-scanner

Write-Host "Análise de segurança concluída. Verifique os resultados no SonarQube." -ForegroundColor Green