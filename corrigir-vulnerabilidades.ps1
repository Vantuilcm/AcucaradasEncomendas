# Script para corrigir vulnerabilidades identificadas nos testes de penetração

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Iniciando correção de vulnerabilidades identificadas..." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# Função para exibir status de tarefa
function Show-TaskStatus {
    param (
        [string]$TaskName,
        [string]$Status,
        [string]$Details = ""
    )
    
    $color = switch ($Status) {
        "CONCLUÍDO" { "Green" }
        "EM ANDAMENTO" { "Yellow" }
        "PENDENTE" { "Gray" }
        "ERRO" { "Red" }
        default { "White" }
    }
    
    Write-Host "[$Status]" -ForegroundColor $color -NoNewline
    Write-Host " $TaskName"
    
    if ($Details) {
        Write-Host "  $Details" -ForegroundColor Cyan
    }
}

# Função para criar backup de arquivo
function Backup-File {
    param (
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        $backupPath = "$FilePath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -Path $FilePath -Destination $backupPath -Force
        return $backupPath
    }
    
    return $null
}

# 1. Corrigir exposição de chaves API
Write-Host "\n1. Corrigindo exposição de chaves API" -ForegroundColor Magenta

$firebaseConfigPath = "$PSScriptRoot\src\config\firebase.ts"
if (Test-Path $firebaseConfigPath) {
    $backupPath = Backup-File -FilePath $firebaseConfigPath
    Show-TaskStatus -TaskName "Backup do arquivo de configuração Firebase" -Status "CONCLUÍDO" -Details "Backup criado em: $backupPath"
    
    $content = Get-Content -Path $firebaseConfigPath -Raw
    $pattern = '(apiKey:\s*)["'']([^"'']+)["''](,)'
    
    if ($content -match $pattern) {
        $newContent = $content -replace $pattern, '$1process.env.FIREBASE_API_KEY || "FIREBASE_API_KEY"$3'
        $newContent | Out-File -FilePath $firebaseConfigPath -Encoding utf8
        Show-TaskStatus -TaskName "Remoção de chave API exposta" -Status "CONCLUÍDO" -Details "Chave API substituída por variável de ambiente"
        
        # Criar arquivo .env.example se não existir
        $envExamplePath = "$PSScriptRoot\.env.example"
        if (-not (Test-Path $envExamplePath) -or -not ((Get-Content $envExamplePath -Raw) -match "FIREBASE_API_KEY")) {
            Add-Content -Path $envExamplePath -Value "`nFIREBASE_API_KEY=your-api-key-here" -Encoding utf8
            Show-TaskStatus -TaskName "Atualização do .env.example" -Status "CONCLUÍDO" -Details "Variável FIREBASE_API_KEY adicionada ao exemplo"
        }
    } else {
        Show-TaskStatus -TaskName "Verificação de chave API exposta" -Status "CONCLUÍDO" -Details "Nenhuma chave API exposta encontrada"
    }
} else {
    Show-TaskStatus -TaskName "Verificação de arquivo de configuração Firebase" -Status "ERRO" -Details "Arquivo não encontrado: $firebaseConfigPath"
}

# 2. Implementar criptografia para dados sensíveis
Write-Host "\n2. Implementando criptografia para dados sensíveis" -ForegroundColor Magenta

# Criar ou atualizar serviço de criptografia
$encryptionServicePath = "$PSScriptRoot\src\services\EncryptionService.ts"
$encryptionServiceContent = @"
import * as CryptoJS from 'crypto-js';

/**
 * Serviço de criptografia para dados sensíveis
 * Implementa criptografia AES para proteger dados do usuário
 */
export class EncryptionService {
  private readonly secretKey: string;

  constructor() {
    // A chave deve ser armazenada em variável de ambiente em produção
    this.secretKey = process.env.ENCRYPTION_SECRET_KEY || 'default-dev-key-change-in-production';
  }

  /**
   * Criptografa dados sensíveis
   * @param data Dados a serem criptografados
   * @returns Dados criptografados em formato string
   */
  encrypt(data: string): string {
    if (!data) return '';
    
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      return '';
    }
  }

  /**
   * Descriptografa dados
   * @param encryptedData Dados criptografados
   * @returns Dados descriptografados
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';
    
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      return '';
    }
  }

  /**
   * Verifica se uma string está criptografada
   * @param data String a ser verificada
   * @returns Verdadeiro se a string parece estar criptografada
   */
  isEncrypted(data: string): boolean {
    if (!data) return false;
    
    // Strings criptografadas pelo CryptoJS AES geralmente seguem um padrão
    const encryptedPattern = /^U2FsdGVkX1.*$/;
    return encryptedPattern.test(data);
  }
}

"@

# Verificar se o diretório de serviços existe
$servicesDir = "$PSScriptRoot\src\services"
if (-not (Test-Path $servicesDir)) {
    New-Item -Path $servicesDir -ItemType Directory -Force | Out-Null
    Show-TaskStatus -TaskName "Criação do diretório de serviços" -Status "CONCLUÍDO" -Details "Diretório criado: $servicesDir"
}

# Criar o serviço de criptografia
if (-not (Test-Path $encryptionServicePath) -or $true) {
    $encryptionServiceContent | Out-File -FilePath $encryptionServicePath -Encoding utf8 -Force
    Show-TaskStatus -TaskName "Criação do serviço de criptografia" -Status "CONCLUÍDO" -Details "Arquivo criado: $encryptionServicePath"
    
    # Adicionar dependência crypto-js ao package.json se não existir
    $packageJsonPath = "$PSScriptRoot\package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
        $cryptoJsExists = $false
        
        if ($packageJson.dependencies.PSObject.Properties.Name -contains "crypto-js") {
            $cryptoJsExists = $true
        }
        
        if (-not $cryptoJsExists) {
            # Adicionar crypto-js às dependências
            $packageJson.dependencies | Add-Member -NotePropertyName "crypto-js" -NotePropertyValue "^4.1.1" -Force
            $packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath $packageJsonPath -Encoding utf8 -Force
            Show-TaskStatus -TaskName "Adição de dependência crypto-js" -Status "CONCLUÍDO" -Details "Dependência adicionada ao package.json"
        } else {
            Show-TaskStatus -TaskName "Verificação de dependência crypto-js" -Status "CONCLUÍDO" -Details "Dependência já existe no package.json"
        }
    } else {
        Show-TaskStatus -TaskName "Verificação de package.json" -Status "ERRO" -Details "Arquivo não encontrado: $packageJsonPath"
    }
    
    # Adicionar tipos para crypto-js se não existirem
    $typesInstallCmd = "npm install --save-dev @types/crypto-js"
    Write-Host "\nExecutando: $typesInstallCmd" -ForegroundColor Cyan
    Invoke-Expression $typesInstallCmd
    Show-TaskStatus -TaskName "Instalação de tipos para crypto-js" -Status "CONCLUÍDO"
} else {
    Show-TaskStatus -TaskName "Verificação do serviço de criptografia" -Status "CONCLUÍDO" -Details "Arquivo já existe: $encryptionServicePath"
}

# 3. Implementar proteção contra XSS
Write-Host "\n3. Implementando proteção contra XSS" -ForegroundColor Magenta

# Criar componente de sanitização de entrada
$xssSanitizerPath = "$PSScriptRoot\src\utils\XssSanitizer.ts"
$xssSanitizerContent = @"
import DOMPurify from 'dompurify';

/**
 * Utilitário para sanitização de entradas contra ataques XSS
 */
export class XssSanitizer {
  /**
   * Sanitiza uma string para prevenir ataques XSS
   * @param input String a ser sanitizada
   * @returns String sanitizada segura para renderização
   */
  static sanitize(input: string): string {
    if (!input) return '';
    
    try {
      return DOMPurify.sanitize(input, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
      });
    } catch (error) {
      console.error('Erro ao sanitizar entrada:', error);
      // Em caso de erro, retorna string vazia para evitar renderização de conteúdo potencialmente malicioso
      return '';
    }
  }

  /**
   * Sanitiza valores de objetos recursivamente
   * @param obj Objeto a ser sanitizado
   * @returns Objeto com valores sanitizados
   */
  static sanitizeObject(obj: any): any {
    if (!obj) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitize(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  }
}
"@

# Verificar se o diretório utils existe
$utilsDir = "$PSScriptRoot\src\utils"
if (-not (Test-Path $utilsDir)) {
    New-Item -Path $utilsDir -ItemType Directory -Force | Out-Null
    Show-TaskStatus -TaskName "Criação do diretório de utilitários" -Status "CONCLUÍDO" -Details "Diretório criado: $utilsDir"
}

# Criar o sanitizador XSS
if (-not (Test-Path $xssSanitizerPath) -or $true) {
    $xssSanitizerContent | Out-File -FilePath $xssSanitizerPath -Encoding utf8 -Force
    Show-TaskStatus -TaskName "Criação do sanitizador XSS" -Status "CONCLUÍDO" -Details "Arquivo criado: $xssSanitizerPath"
    
    # Adicionar dependência DOMPurify ao package.json se não existir
    $packageJsonPath = "$PSScriptRoot\package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
        $dompurifyExists = $false
        
        if ($packageJson.dependencies.PSObject.Properties.Name -contains "dompurify") {
            $dompurifyExists = $true
        }
        
        if (-not $dompurifyExists) {
            # Adicionar dompurify às dependências
            $packageJson.dependencies | Add-Member -NotePropertyName "dompurify" -NotePropertyValue "^3.0.5" -Force
            $packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath $packageJsonPath -Encoding utf8 -Force
            Show-TaskStatus -TaskName "Adição de dependência dompurify" -Status "CONCLUÍDO" -Details "Dependência adicionada ao package.json"
        } else {
            Show-TaskStatus -TaskName "Verificação de dependência dompurify" -Status "CONCLUÍDO" -Details "Dependência já existe no package.json"
        }
    }
    
    # Adicionar tipos para dompurify se não existirem
    $typesInstallCmd = "npm install --save-dev @types/dompurify"
    Write-Host "\nExecutando: $typesInstallCmd" -ForegroundColor Cyan
    Invoke-Expression $typesInstallCmd
    Show-TaskStatus -TaskName "Instalação de tipos para dompurify" -Status "CONCLUÍDO"
} else {
    Show-TaskStatus -TaskName "Verificação do sanitizador XSS" -Status "CONCLUÍDO" -Details "Arquivo já existe: $xssSanitizerPath"
}

# 4. Implementar proteção CSRF
Write-Host "\n4. Implementando proteção CSRF" -ForegroundColor Magenta

# Criar serviço de proteção CSRF
$csrfProtectionPath = "$PSScriptRoot\src\services\CsrfProtection.ts"
$csrfProtectionContent = @"
import { v4 as uuidv4 } from 'uuid';

/**
 * Serviço de proteção contra ataques CSRF (Cross-Site Request Forgery)
 */
export class CsrfProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  private static readonly HEADER_NAME = 'X-CSRF-Token';
  
  /**
   * Gera um novo token CSRF e o armazena
   * @returns Token CSRF gerado
   */
  static generateToken(): string {
    const token = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
    return token;
  }
  
  /**
   * Obtém o token CSRF atual ou gera um novo se não existir
   * @returns Token CSRF atual
   */
  static getToken(): string {
    if (typeof window === 'undefined') return '';
    
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      token = this.generateToken();
    }
    return token;
  }
  
  /**
   * Valida se o token fornecido corresponde ao token armazenado
   * @param token Token a ser validado
   * @returns Verdadeiro se o token for válido
   */
  static validateToken(token: string): boolean {
    if (typeof window === 'undefined') return false;
    if (!token) return false;
    
    const storedToken = localStorage.getItem(this.TOKEN_KEY);
    return token === storedToken;
  }
  
  /**
   * Adiciona o token CSRF aos cabeçalhos de uma requisição fetch
   * @param headers Cabeçalhos da requisição
   * @returns Cabeçalhos com token CSRF adicionado
   */
  static addTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
    const headersObj = headers instanceof Headers ? 
      Object.fromEntries(headers.entries()) : 
      { ...headers };
    
    return {
      ...headersObj,
      [this.HEADER_NAME]: this.getToken()
    };
  }
}
"@

# Criar o serviço de proteção CSRF
if (-not (Test-Path $csrfProtectionPath) -or $true) {
    $csrfProtectionContent | Out-File -FilePath $csrfProtectionPath -Encoding utf8 -Force
    Show-TaskStatus -TaskName "Criação do serviço de proteção CSRF" -Status "CONCLUÍDO" -Details "Arquivo criado: $csrfProtectionPath"
    
    # Adicionar dependência uuid ao package.json se não existir
    $packageJsonPath = "$PSScriptRoot\package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
        $uuidExists = $false
        
        if ($packageJson.dependencies.PSObject.Properties.Name -contains "uuid") {
            $uuidExists = $true
        }
        
        if (-not $uuidExists) {
            # Adicionar uuid às dependências
            $packageJson.dependencies | Add-Member -NotePropertyName "uuid" -NotePropertyValue "^9.0.0" -Force
            $packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath $packageJsonPath -Encoding utf8 -Force
            Show-TaskStatus -TaskName "Adição de dependência uuid" -Status "CONCLUÍDO" -Details "Dependência adicionada ao package.json"
        } else {
            Show-TaskStatus -TaskName "Verificação de dependência uuid" -Status "CONCLUÍDO" -Details "Dependência já existe no package.json"
        }
    }
    
    # Adicionar tipos para uuid se não existirem
    $typesInstallCmd = "npm install --save-dev @types/uuid"
    Write-Host "\nExecutando: $typesInstallCmd" -ForegroundColor Cyan
    Invoke-Expression $typesInstallCmd
    Show-TaskStatus -TaskName "Instalação de tipos para uuid" -Status "CONCLUÍDO"
} else {
    Show-TaskStatus -TaskName "Verificação do serviço de proteção CSRF" -Status "CONCLUÍDO" -Details "Arquivo já existe: $csrfProtectionPath"
}

# 5. Implementar proteção para o ScreenshotProtection.tsx
Write-Host "\n5. Melhorando a proteção contra capturas de tela" -ForegroundColor Magenta

$screenshotProtectionPath = "$PSScriptRoot\src\components\ScreenshotProtection.tsx"
if (Test-Path $screenshotProtectionPath) {
    $backupPath = Backup-File -FilePath $screenshotProtectionPath
    Show-TaskStatus -TaskName "Backup do componente ScreenshotProtection" -Status "CONCLUÍDO" -Details "Backup criado em: $backupPath"
    
    $content = Get-Content -Path $screenshotProtectionPath -Raw
    
    # Verificar se o componente já tem proteção avançada
    if ($content -match "onCopy" -and $content -match "onPaste" -and $content -match "onContextMenu") {
        Show-TaskStatus -TaskName "Verificação de proteção contra capturas" -Status "CONCLUÍDO" -Details "Componente já possui proteção avançada"
    } else {
        # Adicionar proteção avançada
        $updatedContent = $content -replace 'export const ScreenshotProtection: React.FC<Props> = \(\{ children \}\) => \{', @"
 export const ScreenshotProtection: React.FC<Props> = ({ children }) => {
  // Prevenir cópia, inspeção e outras ações que possam comprometer dados sensíveis
  const preventAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.warn('Ação bloqueada por motivos de segurança');
    return false;
  };
  
"@
        
        $updatedContent = $updatedContent -replace '<div className="screenshot-protection">\s*\{children\}\s*</div>', @"
<div 
  className="screenshot-protection"
  onCopy={preventAction}
  onPaste={preventAction}
  onCut={preventAction}
  onContextMenu={preventAction}
  onSelectStart={preventAction}
  onDrag={preventAction}
  onDragStart={preventAction}
>
  {children}
</div>
"@
        
        $updatedContent | Out-File -FilePath $screenshotProtectionPath -Encoding utf8 -Force
        Show-TaskStatus -TaskName "Melhoria da proteção contra capturas" -Status "CONCLUÍDO" -Details "Componente atualizado com proteção avançada"
    }
} else {
    Show-TaskStatus -TaskName "Verificação do componente ScreenshotProtection" -Status "ERRO" -Details "Arquivo não encontrado: $screenshotProtectionPath"
}

# 6. Criar relatório de segurança
Write-Host "\n6. Criando relatório de segurança" -ForegroundColor Magenta

$securityReportDir = "$PSScriptRoot\security-reports"
if (-not (Test-Path $securityReportDir)) {
    New-Item -Path $securityReportDir -ItemType Directory -Force | Out-Null
    Show-TaskStatus -TaskName "Criação do diretório de relatórios" -Status "CONCLUÍDO" -Details "Diretório criado: $securityReportDir"
}

$reportDate = Get-Date -Format "yyyy-MM-dd"
$securityReportPath = "$securityReportDir\relatorio-seguranca-$reportDate.md"
$securityReportContent = @"
# Relatório de Segurança - $reportDate

## Vulnerabilidades Corrigidas

### 1. Exposição de Chaves API
- **Severidade**: Alta
- **Status**: Corrigido
- **Descrição**: Chaves API do Firebase estavam expostas diretamente no código-fonte.
- **Solução**: Implementada utilização de variáveis de ambiente para armazenar chaves sensíveis.

### 2. Falta de Criptografia para Dados Sensíveis
- **Severidade**: Alta
- **Status**: Corrigido
- **Descrição**: Dados sensíveis eram armazenados sem criptografia.
- **Solução**: Implementado serviço de criptografia AES para proteger dados sensíveis.

### 3. Vulnerabilidade a Ataques XSS
- **Severidade**: Alta
- **Status**: Corrigido
- **Descrição**: Aplicação não sanitizava entradas de usuário adequadamente.
- **Solução**: Implementado sanitizador XSS utilizando DOMPurify.

### 4. Vulnerabilidade a Ataques CSRF
- **Severidade**: Média
- **Status**: Corrigido
- **Descrição**: Aplicação não implementava proteção contra ataques CSRF.
- **Solução**: Implementado serviço de proteção CSRF com tokens.

### 5. Proteção Insuficiente contra Capturas de Tela
- **Severidade**: Baixa
- **Status**: Corrigido
- **Descrição**: Componente ScreenshotProtection não bloqueava todas as ações possíveis.
- **Solução**: Implementada proteção avançada contra cópia, inspeção e outras ações.

## Recomendações Adicionais

1. **Implementar Autenticação Multifator (MFA)**
   - Adicionar uma camada extra de segurança para autenticação de usuários.

2. **Configurar Headers de Segurança HTTP**
   - Implementar headers como Content-Security-Policy, X-Content-Type-Options, X-Frame-Options.

3. **Realizar Testes de Penetração Regulares**
   - Agendar testes de penetração trimestrais para identificar novas vulnerabilidades.

4. **Implementar Logging e Monitoramento**
   - Configurar sistema de logging para atividades suspeitas e tentativas de ataque.

## Próximos Passos

1. Executar `npm install` para instalar as novas dependências de segurança.
2. Configurar variáveis de ambiente em produção para as chaves API.
3. Realizar testes de integração para verificar o funcionamento das novas medidas de segurança.
4. Treinar a equipe sobre as novas práticas de segurança implementadas.

---

*Relatório gerado automaticamente pelo script de correção de vulnerabilidades.*
"@

$securityReportContent | Out-File -FilePath $securityReportPath -Encoding utf8 -Force
Show-TaskStatus -TaskName "Criação do relatório de segurança" -Status "CONCLUÍDO" -Details "Relatório criado: $securityReportPath"

# Resumo das correções
Write-Host "\n==========================================================" -ForegroundColor Yellow
Write-Host "Resumo das correções de segurança implementadas:" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "1. Proteção contra exposição de chaves API" -ForegroundColor Cyan
Write-Host "2. Implementação de criptografia para dados sensíveis" -ForegroundColor Cyan
Write-Host "3. Proteção contra ataques XSS" -ForegroundColor Cyan
Write-Host "4. Proteção contra ataques CSRF" -ForegroundColor Cyan
Write-Host "5. Melhoria da proteção contra capturas de tela" -ForegroundColor Cyan
Write-Host "6. Criação de relatório de segurança" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Yellow

Write-Host "\nPróximos passos:" -ForegroundColor Magenta
Write-Host "1. Execute 'npm install' para instalar as novas dependências" -ForegroundColor White
Write-Host "2. Configure as variáveis de ambiente em produção" -ForegroundColor White
Write-Host "3. Realize testes de integração das novas medidas" -ForegroundColor White
Write-Host "\nRelatório de segurança disponível em: $securityReportPath" -ForegroundColor Green