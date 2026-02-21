# Recomendações de Segurança Adicionais

Este documento apresenta recomendações detalhadas para continuar melhorando a segurança do sistema Acucaradas Encomendas, com foco em cinco áreas principais identificadas como prioritárias.

## 1. Implementação de Autenticação de Dois Fatores (2FA)

### Descrição
A autenticação de dois fatores adiciona uma camada extra de segurança ao processo de login, exigindo que os usuários forneçam duas formas diferentes de identificação antes de acessar o sistema.

### Implementação Recomendada

#### 1.1 Métodos de 2FA Recomendados
- **Aplicativo Autenticador**: Implementar integração com Google Authenticator, Microsoft Authenticator ou Authy
- **SMS/E-mail**: Envio de códigos temporários via SMS ou e-mail como alternativa
- **Chaves de Segurança**: Suporte para dispositivos FIDO2/WebAuthn como YubiKey

#### 1.2 Fluxo de Implementação
1. Adicionar opção de configuração 2FA no perfil do usuário
2. Implementar geração e validação de códigos TOTP (Time-based One-Time Password)
3. Armazenar chave secreta TOTP de forma segura no banco de dados
4. Criar fluxo de recuperação para usuários que perdem acesso ao dispositivo 2FA
5. Implementar lembretes de dispositivo confiável para reduzir fricção

#### 1.3 Código de Exemplo (PHP/WordPress)

```php
// Função para gerar segredo TOTP para um usuário
function generate_totp_secret($user_id) {
    require_once 'path/to/vendor/autoload.php'; // Usando biblioteca TOTP
    
    $secret = Base32::encode(random_bytes(16)); // Gera segredo aleatório
    update_user_meta($user_id, 'totp_secret', $secret); // Armazena no WordPress
    
    return $secret;
}

// Função para validar código TOTP
function validate_totp_code($user_id, $code) {
    require_once 'path/to/vendor/autoload.php';
    
    $secret = get_user_meta($user_id, 'totp_secret', true);
    if (empty($secret)) {
        return false; // 2FA não configurado
    }
    
    $totp = new TOTP($secret);
    return $totp->verify($code);
}
```

## 2. Política de Senhas Fortes

### Descrição
Uma política de senhas fortes estabelece requisitos mínimos para garantir que as senhas dos usuários sejam resistentes a ataques de força bruta e dicionário.

### Implementação Recomendada

#### 2.1 Requisitos de Senha
- **Comprimento mínimo**: 10 caracteres
- **Complexidade**: Combinação de letras maiúsculas, minúsculas, números e caracteres especiais
- **Proibições**: Evitar senhas comuns, informações pessoais e sequências óbvias
- **Expiração**: Considerar rotação de senhas a cada 90-180 dias (opcional)
- **Histórico**: Impedir reutilização das últimas 5 senhas

#### 2.2 Validação de Senha

```php
function validate_password_strength($password, $user) {
    $errors = new WP_Error();
    
    // Verificar comprimento mínimo
    if (strlen($password) < 10) {
        $errors->add('password_too_short', 'A senha deve ter pelo menos 10 caracteres.');
    }
    
    // Verificar complexidade
    if (!preg_match('/[A-Z]/', $password)) {
        $errors->add('password_no_upper', 'A senha deve incluir pelo menos uma letra maiúscula.');
    }
    
    if (!preg_match('/[a-z]/', $password)) {
        $errors->add('password_no_lower', 'A senha deve incluir pelo menos uma letra minúscula.');
    }
    
    if (!preg_match('/[0-9]/', $password)) {
        $errors->add('password_no_number', 'A senha deve incluir pelo menos um número.');
    }
    
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        $errors->add('password_no_special', 'A senha deve incluir pelo menos um caractere especial.');
    }
    
    // Verificar senhas comuns
    $common_passwords = ['password123', '12345678', 'qwerty123', 'admin123']; // Expandir esta lista
    if (in_array(strtolower($password), $common_passwords)) {
        $errors->add('password_common', 'Esta senha é muito comum e facilmente adivinhável.');
    }
    
    // Verificar informações do usuário na senha
    $user_data = $user->user_login . ' ' . $user->first_name . ' ' . $user->last_name;
    if (stripos($user_data, $password) !== false) {
        $errors->add('password_user_data', 'A senha não pode conter seu nome de usuário ou nome real.');
    }
    
    return $errors;
}
```

#### 2.3 Implementação no WordPress

```php
// Adicionar ao functions.php do tema ou plugin personalizado
add_filter('registration_errors', 'custom_password_validation', 10, 3);
function custom_password_validation($errors, $sanitized_user_login, $user_email) {
    if (isset($_POST['pass1']) && !empty($_POST['pass1'])) {
        $password = $_POST['pass1'];
        $user = (object) array(
            'user_login' => $sanitized_user_login,
            'first_name' => isset($_POST['first_name']) ? $_POST['first_name'] : '',
            'last_name' => isset($_POST['last_name']) ? $_POST['last_name'] : ''
        );
        
        $password_errors = validate_password_strength($password, $user);
        if ($password_errors->has_errors()) {
            foreach ($password_errors->get_error_messages() as $error) {
                $errors->add('password_error', $error);
            }
        }
    }
    
    return $errors;
}
```

## 3. Monitoramento em Tempo Real de Atividades Suspeitas

### Descrição
Um sistema de monitoramento em tempo real detecta e alerta sobre atividades potencialmente maliciosas, permitindo resposta rápida a tentativas de ataque.

### Implementação Recomendada

#### 3.1 Eventos a Monitorar
- **Tentativas de login**: Padrões incomuns, horários atípicos, IPs suspeitos
- **Ações administrativas**: Alterações em configurações críticas, plugins, temas
- **Acesso a arquivos sensíveis**: Tentativas de acessar wp-config.php, .htaccess
- **Atividade de usuários**: Ações incomuns para determinados perfis de usuário
- **Tráfego anormal**: Picos de requisições, padrões de acesso não usuais

#### 3.2 Sistema de Alertas

```php
// Função para registrar e analisar eventos de segurança
function log_security_event($event_type, $user_id, $data = array()) {
    global $wpdb;
    
    // Informações básicas do evento
    $event = array(
        'event_type' => $event_type,
        'user_id' => $user_id,
        'ip_address' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'],
        'timestamp' => current_time('mysql'),
        'data' => json_encode($data)
    );
    
    // Inserir no banco de dados
    $wpdb->insert(
        $wpdb->prefix . 'security_events',
        $event
    );
    
    // Analisar evento para possíveis alertas
    analyze_security_event($event);
    
    return $wpdb->insert_id;
}

// Função para analisar eventos e detectar atividades suspeitas
function analyze_security_event($event) {
    global $wpdb;
    
    // Exemplo: Detectar múltiplas tentativas de login falhas
    if ($event['event_type'] === 'failed_login') {
        $ip = $event['ip_address'];
        $timeframe = date('Y-m-d H:i:s', strtotime('-15 minutes'));
        
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}security_events 
            WHERE event_type = 'failed_login' 
            AND ip_address = %s 
            AND timestamp > %s",
            $ip, $timeframe
        ));
        
        if ($count >= 5) {
            // Alerta de possível ataque de força bruta
            trigger_security_alert('brute_force_attempt', array(
                'ip' => $ip,
                'attempts' => $count,
                'timeframe' => '15 minutes'
            ));
        }
    }
    
    // Outros tipos de análise podem ser adicionados aqui
}

// Função para enviar alertas
function trigger_security_alert($alert_type, $data) {
    // Registrar alerta no log
    $log_file = ABSPATH . 'wp-content/security-logs/alerts.log';
    $log_entry = date('Y-m-d H:i:s') . " - ALERTA: $alert_type - " . json_encode($data) . "\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND);
    
    // Enviar e-mail para administrador
    $admin_email = get_option('admin_email');
    $subject = "[Acucaradas Encomendas] Alerta de Segurança: $alert_type";
    
    $message = "Um alerta de segurança foi detectado:\n\n";
    $message .= "Tipo: $alert_type\n";
    $message .= "Data/Hora: " . date('Y-m-d H:i:s') . "\n";
    $message .= "Detalhes: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n";
    $message .= "Por favor, verifique o sistema imediatamente.";
    
    wp_mail($admin_email, $subject, $message);
    
    // Opcionalmente, integrar com serviços externos (Slack, SMS, etc.)
}
```

#### 3.3 Criação da Tabela de Eventos

```php
// Adicionar ao plugin de segurança ou função de ativação
function create_security_events_table() {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'security_events';
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        event_type varchar(50) NOT NULL,
        user_id bigint(20) DEFAULT NULL,
        ip_address varchar(45) NOT NULL,
        user_agent text NOT NULL,
        timestamp datetime NOT NULL,
        data longtext DEFAULT NULL,
        PRIMARY KEY (id),
        KEY event_type (event_type),
        KEY ip_address (ip_address),
        KEY timestamp (timestamp)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
```

## 4. Auditorias de Segurança Periódicas

### Descrição
Auditorias de segurança periódicas identificam vulnerabilidades e garantem que as medidas de segurança estejam funcionando conforme esperado.

### Implementação Recomendada

#### 4.1 Tipos de Auditoria
- **Auditoria de Código**: Revisão manual e automatizada do código
- **Testes de Penetração**: Simulação de ataques para identificar vulnerabilidades
- **Verificação de Configurações**: Análise das configurações de segurança
- **Auditoria de Permissões**: Revisão de permissões de usuários e arquivos
- **Análise de Logs**: Revisão de logs de segurança para identificar padrões suspeitos

#### 4.2 Checklist de Auditoria

```powershell
# Script de auditoria de segurança (PowerShell)

# Configurações
$targetUrl = "https://acucaradas.com"
$reportPath = "./security-audit-reports"
$date = Get-Date -Format "yyyy-MM-dd"
$reportFile = "$reportPath/security-audit-$date.md"

# Criar diretório de relatórios se não existir
if (-not (Test-Path $reportPath)) {
    New-Item -ItemType Directory -Path $reportPath | Out-Null
}

# Iniciar relatório
"# Relatório de Auditoria de Segurança - $date\n" | Out-File -FilePath $reportFile
"## Site: $targetUrl\n" | Add-Content -Path $reportFile

# 1. Verificação de Headers de Segurança
"## 1. Headers de Segurança\n" | Add-Content -Path $reportFile

try {
    $response = Invoke-WebRequest -Uri $targetUrl -UseBasicParsing
    $headers = $response.Headers
    
    $securityHeaders = @{
        "X-XSS-Protection" = "Proteção contra XSS"
        "X-Frame-Options" = "Proteção contra Clickjacking"
        "X-Content-Type-Options" = "Prevenção de MIME sniffing"
        "Content-Security-Policy" = "Content Security Policy"
        "Referrer-Policy" = "Controle de Referrer"
        "Strict-Transport-Security" = "HSTS"
    }
    
    foreach ($header in $securityHeaders.Keys) {
        if ($headers.ContainsKey($header)) {
            "- ✅ $($securityHeaders[$header]): $header = $($headers[$header])" | Add-Content -Path $reportFile
        } else {
            "- ❌ $($securityHeaders[$header]): $header não encontrado" | Add-Content -Path $reportFile
        }
    }
} catch {
    "- ❌ Erro ao verificar headers: $_" | Add-Content -Path $reportFile
}

# 2. Verificação de Plugins e Temas Desatualizados
"\n## 2. Plugins e Temas\n" | Add-Content -Path $reportFile

# Esta verificação requer acesso ao WP-CLI ou API interna do WordPress
"- ⚠️ Verificação manual necessária para plugins e temas desatualizados" | Add-Content -Path $reportFile
"- 📋 Instruções: Acessar o painel WordPress e verificar atualizações pendentes" | Add-Content -Path $reportFile

# 3. Verificação de Permissões de Arquivos
"\n## 3. Permissões de Arquivos\n" | Add-Content -Path $reportFile
"- ⚠️ Verificação manual necessária para permissões de arquivos" | Add-Content -Path $reportFile
"- 📋 Instruções: Verificar permissões de wp-config.php (600) e diretórios (755)" | Add-Content -Path $reportFile

# 4. Verificação de Logs de Segurança
"\n## 4. Logs de Segurança\n" | Add-Content -Path $reportFile

# Verificação de existência de logs (requer acesso ao servidor)
"- ⚠️ Verificação manual necessária para logs de segurança" | Add-Content -Path $reportFile
"- 📋 Instruções: Verificar existência e proteção dos arquivos de log em wp-content/security-logs/" | Add-Content -Path $reportFile

# 5. Testes de Penetração Básicos
"\n## 5. Testes de Penetração\n" | Add-Content -Path $reportFile
"- ⚠️ Executar script de testes de penetração separadamente" | Add-Content -Path $reportFile
"- 📋 Instruções: Executar pentest-automation.ps1 e anexar resultados a este relatório" | Add-Content -Path $reportFile

# 6. Recomendações
"\n## 6. Recomendações\n" | Add-Content -Path $reportFile
"- 📌 Revisar e atualizar todas as bibliotecas e plugins" | Add-Content -Path $reportFile
"- 📌 Verificar configurações de firewall e WAF" | Add-Content -Path $reportFile
"- 📌 Implementar autenticação de dois fatores (2FA)" | Add-Content -Path $reportFile
"- 📌 Reforçar política de senhas" | Add-Content -Path $reportFile
"- 📌 Configurar monitoramento em tempo real" | Add-Content -Path $reportFile

# Finalização
"\n## Conclusão\n" | Add-Content -Path $reportFile
"Auditoria de segurança concluída em $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")." | Add-Content -Path $reportFile
"Este relatório deve ser revisado pela equipe de segurança e as recomendações implementadas o mais breve possível." | Add-Content -Path $reportFile

Write-Host "Auditoria de segurança concluída. Relatório salvo em: $reportFile" -ForegroundColor Green
```

## 5. Manutenção de Bibliotecas e Plugins

### Descrição
Manter bibliotecas e plugins atualizados é essencial para corrigir vulnerabilidades conhecidas e melhorar a segurança geral do sistema.

### Implementação Recomendada

#### 5.1 Estratégia de Atualização
- **Atualizações Automáticas**: Configurar atualizações automáticas para correções de segurança
- **Ambiente de Teste**: Testar atualizações em ambiente de homologação antes da produção
- **Backup Regular**: Realizar backups antes de qualquer atualização
- **Monitoramento de Vulnerabilidades**: Acompanhar boletins de segurança e CVEs

#### 5.2 Script de Verificação de Atualizações

```php
// Função para verificar plugins desatualizados e vulneráveis
function check_plugin_updates() {
    $update_plugins = get_site_transient('update_plugins');
    $outdated_plugins = array();
    
    if (!empty($update_plugins->response)) {
        foreach ($update_plugins->response as $plugin_file => $plugin_data) {
            $plugin_info = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin_file);
            $outdated_plugins[] = array(
                'name' => $plugin_info['Name'],
                'current_version' => $plugin_info['Version'],
                'new_version' => $plugin_data->new_version,
                'url' => $plugin_data->url,
                'file' => $plugin_file
            );
        }
    }
    
    return $outdated_plugins;
}

// Função para verificar temas desatualizados
function check_theme_updates() {
    $update_themes = get_site_transient('update_themes');
    $outdated_themes = array();
    
    if (!empty($update_themes->response)) {
        foreach ($update_themes->response as $theme_dir => $theme_data) {
            $theme = wp_get_theme($theme_dir);
            $outdated_themes[] = array(
                'name' => $theme->get('Name'),
                'current_version' => $theme->get('Version'),
                'new_version' => $theme_data['new_version'],
                'url' => $theme_data['url'],
                'dir' => $theme_dir
            );
        }
    }
    
    return $outdated_themes;
}

// Função para enviar relatório de atualizações pendentes
function send_update_notification() {
    $outdated_plugins = check_plugin_updates();
    $outdated_themes = check_theme_updates();
    
    if (empty($outdated_plugins) && empty($outdated_themes)) {
        return; // Nada para atualizar
    }
    
    $admin_email = get_option('admin_email');
    $site_name = get_bloginfo('name');
    $subject = "[$site_name] Atualizações de Segurança Pendentes";
    
    $message = "Olá,\n\nExistem atualizações pendentes no site $site_name que podem conter correções de segurança importantes:\n\n";
    
    if (!empty($outdated_plugins)) {
        $message .= "PLUGINS DESATUALIZADOS:\n";
        foreach ($outdated_plugins as $plugin) {
            $message .= "- {$plugin['name']}: {$plugin['current_version']} -> {$plugin['new_version']}\n";
        }
        $message .= "\n";
    }
    
    if (!empty($outdated_themes)) {
        $message .= "TEMAS DESATUALIZADOS:\n";
        foreach ($outdated_themes as $theme) {
            $message .= "- {$theme['name']}: {$theme['current_version']} -> {$theme['new_version']}\n";
        }
        $message .= "\n";
    }
    
    $message .= "Por favor, faça backup do site e atualize estes componentes o mais breve possível para manter a segurança do sistema.\n\n";
    $message .= "Este é um e-mail automático do sistema de monitoramento de segurança.";
    
    wp_mail($admin_email, $subject, $message);
}

// Agendar verificação semanal
if (!wp_next_scheduled('security_update_check')) {
    wp_schedule_event(time(), 'weekly', 'security_update_check');
}
add_action('security_update_check', 'send_update_notification');
```

## Conclusão

A implementação destas recomendações adicionais de segurança fortalecerá significativamente a postura de segurança do sistema Acucaradas Encomendas. Recomenda-se priorizar estas implementações na seguinte ordem:

1. Política de senhas fortes (implementação rápida, alto impacto)
2. Manutenção de bibliotecas e plugins (implementação contínua)
3. Monitoramento em tempo real (implementação moderada)
4. Auditorias de segurança periódicas (implementação trimestral)
5. Autenticação de dois fatores (implementação mais complexa)

Cada uma destas recomendações deve ser implementada seguindo as melhores práticas de segurança e adaptada às necessidades específicas do sistema Acucaradas Encomendas.