# Documentação Técnica de Segurança

## Implementações de Segurança - Acucaradas Encomendas

Este documento técnico detalha as implementações de segurança realizadas no sistema de autenticação do site Acucaradas Encomendas, fornecendo informações para desenvolvedores sobre as correções e melhorias implementadas.

## Novas Implementações de Segurança

### Proteção Contra Vulnerabilidades em Dependências

#### 1. Verificação Regular de Dependências

Implementamos scripts automatizados para verificação de dependências vulneráveis:

```bash
# Executar verificação de dependências
pnpm run security:deps

# Executar auditoria de segurança completa
pnpm run security:audit

# Executar verificações básicas de segurança
pnpm run security:check

# Executar todas as verificações de segurança (incluindo linting e tipagem)
pnpm run security:all
```

O script `dependency-check.js` realiza as seguintes verificações:

- Identifica vulnerabilidades em dependências usando PNPM/NPM audit
- Gera relatórios detalhados em `./security-reports/`
- Falha o build se vulnerabilidades críticas ou altas forem encontradas
- Configura limites de tolerância para diferentes níveis de severidade

#### 2. Renovate para Atualizações Automáticas

Configuramos o Renovate para gerenciar atualizações automáticas de dependências:

- Arquivo de configuração: `renovate.json`
- Atualiza automaticamente dependências com patches de segurança
- Agrupa atualizações relacionadas (React, testing libraries, etc.)
- Prioriza alertas de vulnerabilidades de segurança
- Executa fora do horário comercial para minimizar interrupções

### Proteção da Aplicação Web/Mobile

#### 1. Headers de Segurança HTTP Aprimorados

Implementamos headers de segurança recomendados pelo OWASP Top 10:

- Content-Security-Policy (CSP) para prevenir XSS
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY para prevenir clickjacking
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security para forçar HTTPS
- Referrer-Policy para controlar informações de referência
- Permissions-Policy para controlar recursos do navegador

Implementação em `src/utils/security-headers.js` e integrada ao servidor HTTP em `server.js`.

#### 2. Proteção contra CSRF

Implementamos proteção contra Cross-Site Request Forgery (CSRF):

- Geração de tokens CSRF para formulários e requisições
- Validação de tokens em requisições não seguras (POST, PUT, DELETE)
- Proteção contra timing attacks usando comparação de tempo constante
- Cookies com flags HttpOnly, SameSite=Strict e Secure

Implementação em `src/utils/csrf-protection.js`.

#### 3. Sanitização de Inputs

Implementamos utilitários para sanitização de inputs do usuário:

- Sanitização HTML para prevenir XSS
- Sanitização SQL para prevenir SQL Injection
- Sanitização de URLs para prevenir Open Redirect
- Validação de e-mails, telefones e CPFs
- Sanitização recursiva de objetos

Implementação em `src/utils/input-sanitizer.js`.

#### 4. Segurança Mobile Específica

Implementamos utilitários para segurança em aplicações mobile:

- Verificação e solicitação de permissões
- Armazenamento seguro usando SecureStore
- Detecção de dispositivos rooteados/jailbroken
- Detecção de emuladores e depuração
- Prevenção de captura de tela para conteúdo sensível

Implementação em `src/utils/mobile-security.js`.

### Integração com CI/CD e Fluxo de Desenvolvimento

#### 1. Verificações de Pré-commit

Implementamos verificações de segurança no fluxo de pré-commit:

- Script de pré-commit em `scripts/pre-commit.js`
- Integração com Husky em `.husky/pre-commit`
- Verificação de dependências vulneráveis
- Linting e verificação de tipos
- Testes automatizados

#### 2. Scripts de Segurança

Adicionamos scripts de segurança ao `package.json`:

```json
{
  "scripts": {
    "security:audit": "node ./scripts/security-audit.js",
    "security:deps": "node ./scripts/dependency-check.js",
    "security:server": "node ./scripts/server-security-check.js",
    "security:mobile": "node ./scripts/mobile-security-check.js",
    "security:check": "pnpm run security:audit && pnpm run security:deps",
    "precommit": "node ./scripts/pre-commit.js"
  }
}
```

## 1. Sanitização e Validação de Entrada

### 1.1 Sanitização de Dados de Usuário

```php
// Sanitização do nome de usuário
$username = sanitize_user($_POST['username']);

// Sanitização do email
$email = sanitize_email($_POST['email']);

// A senha não é sanitizada para preservar caracteres especiais
// WordPress trata internamente a segurança da senha
$password = $_POST['password'];
```

### 1.2 Validação de Entrada

```php
// Validação básica de entrada
if (empty($_POST['username']) || empty($_POST['password'])) {
    $this->send_error('Usuário e senha são obrigatórios');
    return;
}
```

## 2. Headers de Segurança

### 2.1 Implementação de Headers

```php
public function add_security_headers() {
    // Proteção contra XSS
    header('X-XSS-Protection: 1; mode=block');
    
    // Proteção contra clickjacking
    header('X-Frame-Options: SAMEORIGIN');
    
    // Previne MIME sniffing
    header('X-Content-Type-Options: nosniff');
    
    // Content Security Policy básica
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'");
    
    // Controle de referrer
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // Registra aplicação dos headers
    $this->log_security_headers();
}
```

### 2.2 Aplicação dos Headers

Os headers são aplicados em todas as respostas AJAX:

```php
public function send_success($data = array()) {
    $this->add_security_headers();
    wp_send_json_success($data);
}

public function send_error($message) {
    $this->add_security_headers();
    wp_send_json_error(array('message' => $message));
}
```

## 3. Sistema de Logging

### 3.1 Inicialização do Sistema de Logs

```php
private function initialize_security_log() {
    $log_dir = ABSPATH . 'wp-content/security-logs';
    $log_file = $log_dir . '/auth.log';
    
    // Cria diretório de logs se não existir
    if (!file_exists($log_dir)) {
        mkdir($log_dir, 0755, true);
        
        // Cria arquivo .htaccess para proteger o diretório
        $htaccess = $log_dir . '/.htaccess';
        file_put_contents($htaccess, "Order deny,allow\nDeny from all");
    }
    
    // Inicializa arquivo de log se não existir
    if (!file_exists($log_file)) {
        file_put_contents($log_file, "[" . date("Y-m-d H:i:s") . "] Sistema de log de segurança inicializado\n");
    }
}
```

### 3.2 Logging de Tentativas de Login

```php
private function log_login_attempt($username, $success = false, $error_message = '') {
    $log_file = ABSPATH . 'wp-content/security-logs/auth.log';
    $ip = $_SERVER['REMOTE_ADDR'];
    $date = date("Y-m-d H:i:s");
    $status = $success ? "SUCESSO" : "FALHA";
    $details = $success ? "Login bem-sucedido" : "Motivo: $error_message";
    
    $log_entry = "[$date] LOGIN $status - IP: $ip, Usuário: $username, $details\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND);
    
    // Verifica tentativas de força bruta se o login falhou
    if (!$success) {
        $this->check_brute_force($ip, $username);
    }
}
```

### 3.3 Logging de Tentativas de Registro

```php
private function log_registration_attempt($username, $email, $success = false, $error_message = '') {
    $log_file = ABSPATH . 'wp-content/security-logs/auth.log';
    $ip = $_SERVER['REMOTE_ADDR'];
    $date = date("Y-m-d H:i:s");
    $status = $success ? "SUCESSO" : "FALHA";
    $details = $success ? "Registro bem-sucedido" : "Motivo: $error_message";
    
    $log_entry = "[$date] REGISTRO $status - IP: $ip, Usuário: $username, Email: $email, $details\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND);
    
    // Possibilidade de implementar bloqueio de IP em caso de muitas tentativas de registro
    // no mesmo período. Exemplo:
    // - Verificar quantas tentativas de registro foram feitas pelo mesmo IP nas últimas 24h
    // - Se exceder um limite (ex: 10 tentativas), bloquear temporariamente
}
```

### 3.4 Logging de Headers de Segurança

```php
private function log_security_headers() {
    $log_file = ABSPATH . 'wp-content/security-logs/auth.log';
    $ip = $_SERVER['REMOTE_ADDR'];
    $date = date("Y-m-d H:i:s");
    $url = $_SERVER['REQUEST_URI'];
    
    $log_entry = "[$date] HEADERS - IP: $ip, URL: $url, Headers de segurança aplicados\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND);
}
```

## 4. Proteção Contra Força Bruta

```php
private function check_brute_force($ip, $username) {
    $log_file = ABSPATH . 'wp-content/security-logs/auth.log';
    $log_content = file_get_contents($log_file);
    
    // Conta tentativas de login falhas nas últimas 24 horas
    $pattern = "/\[([0-9\-\: ]+)\] LOGIN FALHA - IP: $ip, Usuário: $username/";
    preg_match_all($pattern, $log_content, $matches);
    
    if (count($matches[0]) >= 5) {
        // Registra alerta de possível ataque de força bruta
        $date = date("Y-m-d H:i:s");
        $log_entry = "[$date] ALERTA - IP: $ip, Usuário: $username, Possível ataque de força bruta detectado. " . count($matches[0]) . " tentativas falhas.\n";
        file_put_contents($log_file, $log_entry, FILE_APPEND);
        
        // Aqui poderia ser implementado um bloqueio temporário do IP
        // ou outras medidas de proteção como CAPTCHA
    }
}
```

## 5. Script de Testes de Penetração

### 5.1 Verificação de Headers de Segurança

```powershell
# Verifica headers de segurança
function Test-SecurityHeaders {
    Write-Host "Verificando headers de segurança..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$targetUrl/wp-admin/admin-ajax.php" -UseBasicParsing
        $headers = $response.Headers
        $presentHeaders = @{}
        
        # Verifica headers de segurança essenciais
        $securityHeaders = @{
            "X-XSS-Protection" = "Proteção contra XSS"
            "X-Frame-Options" = "Proteção contra Clickjacking"
            "X-Content-Type-Options" = "Prevenção de MIME sniffing"
            "Content-Security-Policy" = "Content Security Policy"
            "Referrer-Policy" = "Controle de Referrer"
        }
        
        $missingHeaders = @()
        
        foreach ($header in $securityHeaders.Keys) {
            if ($headers.ContainsKey($header)) {
                $presentHeaders[$header] = $headers[$header]
            } else {
                $missingHeaders += "$header (${$securityHeaders[$header]})"
            }
        }
        
        $details = @{
            "PresentHeaders" = $presentHeaders
            "MissingHeaders" = $missingHeaders
        }
        
        if ($missingHeaders.Count -eq 0) {
            Write-AuthResult "Headers de Segurança" "SUCESSO" "Todos os headers de segurança estão presentes" $details
        } elseif ($missingHeaders.Count -le 2) {
            Write-AuthResult "Headers de Segurança" "ALERTA" "Alguns headers de segurança estão ausentes: $($missingHeaders -join ', ')" $details
        } else {
            Write-AuthResult "Headers de Segurança" "FALHA" "Vários headers de segurança estão ausentes: $($missingHeaders -join ', ')" $details
        }
    } catch {
        Write-AuthResult "Headers de Segurança" "ERRO" "Falha ao verificar headers de segurança: $_"
    }
}
```

### 5.2 Teste de Proteção Contra Força Bruta

```powershell
# Testa proteção contra força bruta
function Test-BruteForceProtection {
    Write-Host "Testando proteção contra força bruta..." -ForegroundColor Yellow
    
    try {
        # Lista de senhas comuns para teste
        $passwords = @("123456", "password", "admin123", "qwerty", "letmein", "welcome", "monkey", "1234567890")
        $username = "admin"
        $loginUrl = "$targetUrl/wp-admin/admin-ajax.php"
        
        # Obtém nonce válido para o teste
        $formPage = Invoke-WebRequest -Uri "$targetUrl/wp-login.php" -UseBasicParsing
        $nonce = ""
        if ($formPage.Content -match 'name="_wpnonce" value="([^"]+)"') {
            $nonce = $matches[1]
        }
        
        $responseTimes = @()
        $responseContents = @()
        $blocked = $false
        $throttled = $false
        
        # Tenta login várias vezes com credenciais inválidas
        for ($i = 0; $i -lt 10 -and -not $blocked; $i++) {
            $password = $passwords[$i % $passwords.Count]
            
            $start = Get-Date
            $response = Invoke-WebRequest -Uri $loginUrl -Method Post -Body @{
                action = "ajax_login"
                username = $username
                password = $password
                security = $nonce
            } -UseBasicParsing -ErrorAction SilentlyContinue
            $end = Get-Date
            
            $responseTime = ($end - $start).TotalMilliseconds
            $responseTimes += $responseTime
            $responseContents += $response.Content
            
            # Verifica se foi bloqueado
            if ($response.StatusCode -eq 403 -or $response.StatusCode -eq 429 -or $response.StatusCode -eq 503 -or 
                $response.Content -match "bloqueado|blocked|too many attempts|muitas tentativas|captcha|recaptcha|rate limit|limite de taxa") {
                $blocked = $true
            }
            
            # Verifica se há throttling (aumento no tempo de resposta)
            if ($i -gt 0 -and $responseTime -gt ($responseTimes[0] * 2)) {
                $throttled = $true
            }
            
            # Pequena pausa entre as tentativas
            Start-Sleep -Milliseconds 500
        }
        
        $details = @{
            "AttemptsMade" = $i
            "ResponseTimes" = $responseTimes
            "Throttled" = $throttled
            "Blocked" = $blocked
        }
        
        if ($blocked) {
            Write-AuthResult "Proteção Força Bruta" "SUCESSO" "O sistema bloqueia múltiplas tentativas de login falhas" $details
        } elseif ($throttled) {
            Write-AuthResult "Proteção Força Bruta" "ALERTA" "O sistema aplica throttling, mas não bloqueia completamente após múltiplas tentativas" $details
        } else {
            Write-AuthResult "Proteção Força Bruta" "FALHA" "Nenhuma proteção contra força bruta detectada após $i tentativas" $details
        }
    } catch {
        Write-AuthResult "Proteção Força Bruta" "ERRO" "Falha ao testar proteção contra força bruta: $_"
    }
}
```

## 6. Recomendações para Desenvolvedores

### 6.1 Manutenção de Segurança

- Manter todas as bibliotecas e plugins atualizados
- Revisar regularmente os logs de segurança
- Implementar monitoramento automatizado para detecção de atividades suspeitas
- Realizar auditorias de código periódicas

### 6.2 Melhorias Futuras

- Implementar autenticação de dois fatores (2FA)
- Adicionar política de senhas fortes
- Implementar rotação de tokens de sessão
- Adicionar proteção contra ataques de timing
- Implementar rate limiting baseado em IP

### 6.3 Boas Práticas de Desenvolvimento Seguro

- Seguir o princípio do menor privilégio
- Validar todas as entradas de usuário
- Escapar todas as saídas
- Usar consultas parametrizadas para acesso ao banco de dados
- Implementar CSRF tokens em todos os formulários
- Armazenar senhas usando algoritmos de hash seguros (bcrypt, Argon2)
- Implementar HTTPS em todo o site
- Configurar cookies com flags de segurança (HttpOnly, Secure, SameSite)

## Próximos Passos e Implementações Avançadas

As seguintes implementações avançadas de segurança foram realizadas ou estão em andamento para fortalecer a proteção da aplicação:

### 1. Autenticação Robusta

Implementamos um módulo de autenticação robusta em `src/utils/robust-auth.js` que inclui:

- **Multi-Factor Authentication (MFA)**
  - Implementação de TOTP (Time-based One-Time Password) usando a biblioteca speakeasy
  - Geração e validação de códigos QR para aplicativos autenticadores
  - Fluxo de recuperação de acesso com códigos de backup
  - Opção de autenticação via SMS como alternativa

- **Tokens JWT com Segurança Aprimorada**
  - Tempo de expiração curto (15 minutos) com refresh tokens
  - Rotação de chaves de assinatura
  - Validação de claims (emissor, audiência, tempo de expiração)
  - Revogação de tokens em caso de suspeita de comprometimento
  - Armazenamento seguro em cookies HttpOnly com flags de segurança

- **Políticas de Senhas Fortes**
  - Validação de complexidade (comprimento, caracteres especiais, números, maiúsculas/minúsculas)
  - Verificação contra senhas comuns/vazadas usando APIs de breach notification
  - Armazenamento seguro com bcrypt e fatores de custo adequados
  - Política de troca periódica de senhas com histórico para evitar reutilização

### 2. Logging e Monitoramento

Implementamos um sistema abrangente de logging e monitoramento em `src/utils/security-logging.js` que inclui:

- **Logs de Segurança Detalhados**
  - Registro de todas as tentativas de login (bem-sucedidas e falhas)
  - Logs de alterações de permissões e papéis de usuários
  - Registro de ações críticas no sistema (alterações de configuração, exclusões)
  - Logs de acesso a recursos sensíveis
  - Formato estruturado (JSON) para facilitar análise

- **Sistema de Detecção de Ameaças**
  - Detecção de tentativas de força bruta
  - Identificação de padrões suspeitos de acesso
  - Monitoramento de atividades anômalas (muitas ações em curto período)
  - Detecção de scanning de recursos

- **Alertas e Notificações**
  - Alertas em tempo real para eventos críticos de segurança
  - Diferentes níveis de severidade (informativo, aviso, crítico)
  - Opções de notificação via email, webhook ou console
  - Agregação de alertas para evitar sobrecarga

### 3. Monitoramento de Segurança em Tempo Real

Implementamos um sistema avançado de monitoramento de segurança em tempo real em `scripts/security-monitor.js` que inclui:

- **Dashboard de Segurança**
  - Interface web para visualização em tempo real de eventos de segurança
  - Gráficos e estatísticas de atividades suspeitas
  - Visualização de logs e alertas em tempo real
  - Painel de controle para administradores de segurança
  - Disponível em `/security-dashboard` com autenticação de administrador

- **Detecção de Padrões Avançados**
  - Análise comportamental para identificar anomalias
  - Correlação de eventos de segurança para detectar ataques complexos
  - Detecção de padrões temporais (ataques em horários específicos)
  - Identificação de tentativas de reconhecimento e scanning

- **Verificação de Integridade de Arquivos**
  - Monitoramento contínuo de arquivos críticos do sistema
  - Cálculo e verificação de hashes para detectar modificações não autorizadas
  - Alertas imediatos em caso de alterações suspeitas
  - Verificações periódicas programadas

- **Sistema de Alertas Multicamada**
  - Notificações por email para eventos críticos
  - Integração com Slack para alertas em tempo real
  - Alertas SMS para administradores em caso de incidentes críticos
  - Diferentes níveis de severidade com políticas de notificação personalizáveis

### 4. Testes de Segurança Automatizados

Implementamos um framework de testes de segurança em `scripts/security-tests.js` que inclui:

- **Testes de Penetração Automatizados**
  - Verificação de vulnerabilidades comuns (SQL Injection, XSS, CSRF)
  - Testes de configuração de headers HTTP de segurança
  - Verificação de proteções contra força bruta e rate limiting
  - Testes de configuração CORS e cookies

- **Análise Estática de Código**
  - Integração com ESLint e regras de segurança
  - Detecção de padrões inseguros no código (eval, innerHTML, etc.)
  - Verificação de hardcoding de segredos e credenciais
  - Análise de configurações de segurança

- **Integração com CI/CD**
  - Execução automática de testes de segurança no pipeline
  - Geração de relatórios detalhados em formato JSON e HTML
  - Falha do build em caso de problemas críticos de segurança
  - Verificação de dependências vulneráveis

### 5. Agendamento de Testes de Segurança

Implementamos um sistema de agendamento para execução periódica de testes de segurança em `scripts/scheduled-security-scan.js`:

- **Testes Diários**
  - Verificações rápidas de dependências e headers HTTP
  - Análise de logs para detecção de padrões suspeitos
  - Verificação de configurações críticas de segurança

- **Testes Semanais**
  - Testes de segurança completos e análise estática de código
  - Verificação de vulnerabilidades em dependências
  - Testes de penetração básicos automatizados

- **Testes Mensais**
  - Testes de penetração completos e auditoria de segurança
  - Análise profunda de configurações e permissões
  - Verificação de conformidade com padrões de segurança

- **Relatórios e Notificações**
  - Geração de relatórios detalhados em formato HTML e JSON
  - Alertas automáticos sobre problemas de segurança críticos
  - Dashboard de segurança com métricas e tendências

Scripts disponíveis:
```
npm run security:scan:init     # Inicializa o agendador de testes
npm run security:scan:daily    # Executa testes diários manualmente
npm run security:scan:weekly   # Executa testes semanais manualmente
npm run security:scan:monthly  # Executa testes mensais manualmente
```

### 6. Proteção Contra Ataques de Força Bruta

Implementamos um sistema robusto de proteção contra ataques de força bruta:

- **Limitação de Tentativas**: Configuração de limites para tentativas de login por usuário e por IP.
- **Bloqueio Progressivo**: Sistema de bloqueio com duração crescente para tentativas repetidas.
- **CAPTCHA Adaptativo**: Exigência de CAPTCHA após um número configurável de tentativas falhas.
- **Atraso Progressivo**: Introdução de atrasos crescentes entre tentativas para mitigar ataques automatizados.
- **Monitoramento em Tempo Real**: Registro e alerta sobre padrões suspeitos de tentativas de acesso.
- **Proteção de API**: Limitação de taxa para endpoints de API para prevenir abusos.

Arquivo de implementação: `src/utils/brute-force-protection.js`

Middlewares disponíveis:
```javascript
// Proteção para rotas de login
app.use('/api/auth/login', bruteForceProtection.loginProtection());

// Limitador de taxa para APIs
app.use('/api', bruteForceProtection.apiRateLimiter());
```

### 7. Dashboard de Segurança

Um Dashboard de Segurança em tempo real foi implementado para monitorar e visualizar o status de segurança da aplicação. O dashboard está disponível em `/security-dashboard` e requer autenticação de administrador.

#### Funcionalidades do Dashboard

- **Visão Geral de Segurança**: Estatísticas em tempo real de alertas críticos, de alto risco, avisos e eventos totais.

- **Gráficos e Visualizações**: Distribuição de eventos por tipo e nível de severidade para identificação rápida de problemas.

- **Monitoramento de Integridade**: Status de integridade do sistema, arquivos monitorados e violações detectadas.

- **Alertas em Tempo Real**: Exibição de alertas recentes e atividade em tempo real com notificações visuais.

- **Padrões de Detecção**: Lista de padrões de ataque monitorados com seus respectivos limites de alerta.

#### Implementação Técnica

O dashboard é implementado usando:

- **Frontend**: HTML5, CSS3, JavaScript, Chart.js para visualizações e Bootstrap para UI responsiva.

- **Backend**: Middleware Express em `src/middleware/security-dashboard.js` que integra com o sistema de monitoramento.

- **Comunicação em Tempo Real**: Socket.IO para atualizações em tempo real sem necessidade de atualização da página.

- **Segurança**: Autenticação obrigatória para acesso, com verificação de permissões de administrador.

Para iniciar o dashboard, você tem duas opções:

1. **Servidor Dedicado**: Execute o dashboard em um servidor separado:

```bash
npm run security:dashboard
```

2. **Integração com Servidor Principal**: Integre o dashboard ao servidor principal da aplicação:

```bash
npm run security:dashboard:integrate
```

Após a integração, o dashboard estará disponível em `/security-dashboard` quando o servidor principal for iniciado.

O dashboard também é verificado durante as verificações de segurança regulares através do script `run-security-checks.js`.

### 8. Próximos Passos Adicionais

Para elevar ainda mais o nível de segurança da aplicação, recomendamos:

- **Segurança de Infraestrutura**
  - Implementar Web Application Firewall (WAF)
  - Configurar proteção DDoS
  - Implementar monitoramento de rede para detecção de intrusão
  - Realizar hardening de servidores seguindo benchmarks CIS

- **Conformidade e Governança**
  - Implementar controles para conformidade com LGPD/GDPR
  - Desenvolver políticas de retenção e exclusão de dados
  - Criar procedimentos de resposta a incidentes
  - Realizar auditorias de segurança periódicas por terceiros

- **Segurança no Desenvolvimento**
  - Treinamento regular da equipe em desenvolvimento seguro
  - Implementar revisão de código focada em segurança
  - Criar biblioteca de componentes seguros reutilizáveis
  - Documentar padrões de segurança para novos desenvolvedores