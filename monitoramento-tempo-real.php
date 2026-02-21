<?php
/**
 * Plugin Name: Acucaradas - Monitoramento em Tempo Real
 * Description: Implementa monitoramento em tempo real de atividades suspeitas para o site Acucaradas Encomendas
 * Version: 1.0.0
 * Author: Equipe de Segurança
 */

// Evitar acesso direto ao arquivo
if (!defined('ABSPATH')) {
    exit;
}

class AcucaradasMonitoramento {
    
    // Configurações
    private $limite_tentativas_login = 5;
    private $periodo_monitoramento = 3600; // 1 hora em segundos
    private $limite_requisicoes_api = 100;
    private $limite_requisicoes_pagina = 60;
    private $limite_acoes_admin = 30;
    private $email_admin = '';
    private $nivel_alerta = 'medio'; // baixo, medio, alto
    
    // Tabela de eventos
    private $tabela_eventos = '';
    
    /**
     * Construtor da classe
     */
    public function __construct() {
        global $wpdb;
        
        // Definir nome da tabela
        $this->tabela_eventos = $wpdb->prefix . 'security_events';
        
        // Obter email do administrador
        $this->email_admin = get_option('admin_email');
        
        // Registrar hooks
        add_action('init', array($this, 'iniciar_monitoramento'));
        add_action('wp_login_failed', array($this, 'monitorar_falha_login'));
        add_action('wp_login', array($this, 'monitorar_login_sucesso'), 10, 2);
        add_action('wp_logout', array($this, 'monitorar_logout'));
        add_action('admin_init', array($this, 'monitorar_acoes_admin'));
        add_action('rest_api_init', array($this, 'monitorar_requisicoes_api'));
        add_action('template_redirect', array($this, 'monitorar_requisicoes_pagina'));
        
        // Adicionar menu de configuração
        add_action('admin_menu', array($this, 'adicionar_menu_configuracao'));
        
        // Adicionar dashboard widget
        add_action('wp_dashboard_setup', array($this, 'adicionar_widget_dashboard'));
        
        // Adicionar AJAX handlers
        add_action('wp_ajax_monitoramento_obter_eventos', array($this, 'ajax_obter_eventos'));
        add_action('wp_ajax_monitoramento_obter_estatisticas', array($this, 'ajax_obter_estatisticas'));
        add_action('wp_ajax_monitoramento_bloquear_ip', array($this, 'ajax_bloquear_ip'));
        add_action('wp_ajax_monitoramento_desbloquear_ip', array($this, 'ajax_desbloquear_ip'));
        
        // Verificar bloqueios a cada requisição
        add_action('init', array($this, 'verificar_ip_bloqueado'), 1);
        
        // Criar tabela ao ativar plugin
        register_activation_hook(__FILE__, array($this, 'criar_tabela_eventos'));
        
        // Agendar verificação periódica
        if (!wp_next_scheduled('monitoramento_verificacao_periodica')) {
            wp_schedule_event(time(), 'hourly', 'monitoramento_verificacao_periodica');
        }
        add_action('monitoramento_verificacao_periodica', array($this, 'verificacao_periodica'));
    }
    
    /**
     * Criar tabela de eventos de segurança
     */
    public function criar_tabela_eventos() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->tabela_eventos} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            timestamp datetime NOT NULL,
            ip varchar(45) NOT NULL,
            user_id bigint(20) DEFAULT NULL,
            username varchar(60) DEFAULT NULL,
            event_type varchar(50) NOT NULL,
            event_data longtext DEFAULT NULL,
            severity varchar(20) NOT NULL DEFAULT 'info',
            is_blocked tinyint(1) NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            KEY ip (ip),
            KEY user_id (user_id),
            KEY event_type (event_type),
            KEY timestamp (timestamp),
            KEY severity (severity)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Criar tabela de IPs bloqueados
        $sql = "CREATE TABLE {$wpdb->prefix}blocked_ips (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            ip varchar(45) NOT NULL,
            reason varchar(255) NOT NULL,
            blocked_at datetime NOT NULL,
            expires_at datetime DEFAULT NULL,
            notes text DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY ip (ip)
        ) $charset_collate;";
        
        dbDelta($sql);
        
        // Definir opções padrão
        add_option('monitoramento_limite_tentativas_login', $this->limite_tentativas_login);
        add_option('monitoramento_periodo_monitoramento', $this->periodo_monitoramento);
        add_option('monitoramento_limite_requisicoes_api', $this->limite_requisicoes_api);
        add_option('monitoramento_limite_requisicoes_pagina', $this->limite_requisicoes_pagina);
        add_option('monitoramento_limite_acoes_admin', $this->limite_acoes_admin);
        add_option('monitoramento_nivel_alerta', $this->nivel_alerta);
        add_option('monitoramento_notificacoes_email', 'on');
        add_option('monitoramento_bloquear_automatico', 'off');
    }
    
    /**
     * Iniciar monitoramento
     */
    public function iniciar_monitoramento() {
        // Carregar configurações
        $this->limite_tentativas_login = get_option('monitoramento_limite_tentativas_login', $this->limite_tentativas_login);
        $this->periodo_monitoramento = get_option('monitoramento_periodo_monitoramento', $this->periodo_monitoramento);
        $this->limite_requisicoes_api = get_option('monitoramento_limite_requisicoes_api', $this->limite_requisicoes_api);
        $this->limite_requisicoes_pagina = get_option('monitoramento_limite_requisicoes_pagina', $this->limite_requisicoes_pagina);
        $this->limite_acoes_admin = get_option('monitoramento_limite_acoes_admin', $this->limite_acoes_admin);
        $this->nivel_alerta = get_option('monitoramento_nivel_alerta', $this->nivel_alerta);
    }
    
    /**
     * Verificar se o IP atual está bloqueado
     */
    public function verificar_ip_bloqueado() {
        global $wpdb;
        
        $ip = $this->obter_ip_cliente();
        
        // Verificar se o IP está na lista de bloqueados
        $bloqueado = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}blocked_ips WHERE ip = %s AND (expires_at IS NULL OR expires_at > %s)",
            $ip,
            current_time('mysql')
        ));
        
        if ($bloqueado) {
            // Registrar tentativa de acesso de IP bloqueado
            $this->registrar_evento('BLOCKED_IP_ACCESS_ATTEMPT', null, null, array(
                'reason' => $bloqueado->reason,
                'blocked_at' => $bloqueado->blocked_at,
                'expires_at' => $bloqueado->expires_at
            ), 'alta');
            
            // Exibir mensagem de bloqueio
            wp_die(
                '<h1>Acesso Bloqueado</h1>' .
                '<p>Seu endereço IP foi bloqueado por atividade suspeita.</p>' .
                '<p>Se você acredita que isso é um erro, entre em contato com o administrador do site.</p>',
                'Acesso Bloqueado',
                array('response' => 403)
            );
        }
    }
    
    /**
     * Monitorar falhas de login
     */
    public function monitorar_falha_login($username) {
        $ip = $this->obter_ip_cliente();
        $user = get_user_by('login', $username);
        $user_id = $user ? $user->ID : null;
        
        // Registrar evento
        $this->registrar_evento('FAILED_LOGIN', $user_id, $username, array(
            'user_agent' => $_SERVER['HTTP_USER_AGENT']
        ), 'media');
        
        // Verificar número de tentativas recentes
        $this->verificar_tentativas_login($ip, $username);
    }
    
    /**
     * Monitorar login bem-sucedido
     */
    public function monitorar_login_sucesso($username, $user) {
        $ip = $this->obter_ip_cliente();
        
        // Registrar evento
        $this->registrar_evento('SUCCESSFUL_LOGIN', $user->ID, $username, array(
            'user_agent' => $_SERVER['HTTP_USER_AGENT']
        ), 'baixa');
        
        // Verificar login de locais incomuns
        $this->verificar_local_incomum($ip, $user->ID);
    }
    
    /**
     * Monitorar logout
     */
    public function monitorar_logout() {
        $user = wp_get_current_user();
        if ($user->ID) {
            $this->registrar_evento('LOGOUT', $user->ID, $user->user_login, array(), 'baixa');
        }
    }
    
    /**
     * Monitorar ações administrativas
     */
    public function monitorar_acoes_admin() {
        if (!is_admin() || !is_user_logged_in()) {
            return;
        }
        
        $user = wp_get_current_user();
        $screen = get_current_screen();
        $action = isset($_REQUEST['action']) ? sanitize_text_field($_REQUEST['action']) : '';
        
        // Monitorar apenas ações sensíveis
        $acoes_sensiveis = array(
            'update', 'delete', 'trash', 'untrash', 'edit', 'create', 'activate', 'deactivate',
            'install', 'upload', 'export', 'import', 'options', 'settings'
        );
        
        if ($action && in_array($action, $acoes_sensiveis)) {
            $this->registrar_evento('ADMIN_ACTION', $user->ID, $user->user_login, array(
                'screen' => $screen ? $screen->id : 'unknown',
                'action' => $action,
                'request_uri' => $_SERVER['REQUEST_URI']
            ), 'media');
            
            // Verificar frequência de ações administrativas
            $this->verificar_frequencia_acoes_admin($user->ID);
        }
    }
    
    /**
     * Monitorar requisições à API REST
     */
    public function monitorar_requisicoes_api() {
        $ip = $this->obter_ip_cliente();
        $user_id = get_current_user_id();
        $username = $user_id ? wp_get_current_user()->user_login : null;
        $route = isset($_SERVER['REQUEST_URI']) ? sanitize_text_field($_SERVER['REQUEST_URI']) : '';
        
        if (strpos($route, '/wp-json/') !== false) {
            $this->registrar_evento('API_REQUEST', $user_id, $username, array(
                'route' => $route,
                'method' => $_SERVER['REQUEST_METHOD']
            ), 'baixa');
            
            // Verificar frequência de requisições à API
            $this->verificar_frequencia_requisicoes_api($ip);
        }
    }
    
    /**
     * Monitorar requisições a páginas
     */
    public function monitorar_requisicoes_pagina() {
        $ip = $this->obter_ip_cliente();
        $user_id = get_current_user_id();
        $username = $user_id ? wp_get_current_user()->user_login : null;
        
        // Monitorar apenas requisições a páginas sensíveis
        $paginas_sensiveis = array(
            'wp-login.php', 'wp-admin', 'admin-ajax.php', 'admin-post.php',
            'checkout', 'carrinho', 'minha-conta'
        );
        
        $uri = $_SERVER['REQUEST_URI'];
        $is_sensitive = false;
        
        foreach ($paginas_sensiveis as $pagina) {
            if (strpos($uri, $pagina) !== false) {
                $is_sensitive = true;
                break;
            }
        }
        
        if ($is_sensitive) {
            $this->registrar_evento('PAGE_REQUEST', $user_id, $username, array(
                'uri' => $uri,
                'method' => $_SERVER['REQUEST_METHOD'],
                'referer' => isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : null
            ), 'baixa');
            
            // Verificar frequência de requisições a páginas
            $this->verificar_frequencia_requisicoes_pagina($ip);
        }
    }
    
    /**
     * Verificar tentativas de login
     */
    private function verificar_tentativas_login($ip, $username) {
        global $wpdb;
        
        // Obter período de monitoramento
        $periodo = current_time('mysql', 1);
        $periodo_inicio = date('Y-m-d H:i:s', strtotime($periodo) - $this->periodo_monitoramento);
        
        // Contar tentativas de login falhas recentes
        $tentativas = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} 
            WHERE event_type = 'FAILED_LOGIN' 
            AND ip = %s 
            AND timestamp > %s",
            $ip,
            $periodo_inicio
        ));
        
        // Verificar se excedeu o limite
        if ($tentativas >= $this->limite_tentativas_login) {
            // Registrar evento de excesso de tentativas
            $this->registrar_evento('EXCESSIVE_LOGIN_ATTEMPTS', null, $username, array(
                'attempts' => $tentativas,
                'period' => $this->periodo_monitoramento . ' seconds'
            ), 'alta');
            
            // Verificar se bloqueio automático está ativado
            if (get_option('monitoramento_bloquear_automatico') === 'on') {
                $this->bloquear_ip($ip, 'Excesso de tentativas de login', 24); // Bloquear por 24 horas
            }
            
            // Enviar notificação
            if (get_option('monitoramento_notificacoes_email') === 'on') {
                $this->enviar_notificacao_alerta(
                    'Excesso de tentativas de login',
                    "Foram detectadas $tentativas tentativas de login falhas para o usuário '$username' no IP $ip nos últimos " . 
                    ($this->periodo_monitoramento / 60) . " minutos."
                );
            }
        }
    }
    
    /**
     * Verificar login de local incomum
     */
    private function verificar_local_incomum($ip, $user_id) {
        global $wpdb;
        
        // Obter informações de geolocalização do IP atual
        $geolocalizacao_atual = $this->obter_geolocalizacao($ip);
        
        if (!$geolocalizacao_atual) {
            return;
        }
        
        // Obter últimos logins bem-sucedidos do usuário
        $logins_anteriores = $wpdb->get_results($wpdb->prepare(
            "SELECT ip FROM {$this->tabela_eventos} 
            WHERE event_type = 'SUCCESSFUL_LOGIN' 
            AND user_id = %d 
            ORDER BY timestamp DESC 
            LIMIT 5",
            $user_id
        ));
        
        // Se não houver logins anteriores, não há como comparar
        if (empty($logins_anteriores)) {
            return;
        }
        
        // Verificar se o IP atual já foi usado antes
        $ip_conhecido = false;
        foreach ($logins_anteriores as $login) {
            if ($login->ip === $ip) {
                $ip_conhecido = true;
                break;
            }
        }
        
        // Se o IP é conhecido, não é um local incomum
        if ($ip_conhecido) {
            return;
        }
        
        // Obter geolocalização do último IP conhecido
        $ultimo_ip = $logins_anteriores[0]->ip;
        $geolocalizacao_anterior = $this->obter_geolocalizacao($ultimo_ip);
        
        if (!$geolocalizacao_anterior) {
            return;
        }
        
        // Calcular distância entre localizações
        $distancia = $this->calcular_distancia_geografica(
            $geolocalizacao_anterior['latitude'],
            $geolocalizacao_anterior['longitude'],
            $geolocalizacao_atual['latitude'],
            $geolocalizacao_atual['longitude']
        );
        
        // Se a distância for grande (mais de 500km), considerar como local incomum
        if ($distancia > 500) {
            $user = get_userdata($user_id);
            
            // Registrar evento
            $this->registrar_evento('UNUSUAL_LOGIN_LOCATION', $user_id, $user->user_login, array(
                'current_location' => $geolocalizacao_atual['country'] . ', ' . $geolocalizacao_atual['city'],
                'previous_location' => $geolocalizacao_anterior['country'] . ', ' . $geolocalizacao_anterior['city'],
                'distance_km' => round($distancia)
            ), 'alta');
            
            // Enviar notificação
            if (get_option('monitoramento_notificacoes_email') === 'on') {
                $this->enviar_notificacao_alerta(
                    'Login de local incomum',
                    "Foi detectado um login para o usuário '{$user->user_login}' de um local incomum.\n" .
                    "Local atual: {$geolocalizacao_atual['country']}, {$geolocalizacao_atual['city']}\n" .
                    "Local anterior: {$geolocalizacao_anterior['country']}, {$geolocalizacao_anterior['city']}\n" .
                    "Distância: aproximadamente " . round($distancia) . " km\n" .
                    "IP: $ip\n" .
                    "Data/Hora: " . current_time('mysql')
                );
            }
        }
    }
    
    /**
     * Verificar frequência de ações administrativas
     */
    private function verificar_frequencia_acoes_admin($user_id) {
        global $wpdb;
        
        // Obter período de monitoramento
        $periodo = current_time('mysql', 1);
        $periodo_inicio = date('Y-m-d H:i:s', strtotime($periodo) - $this->periodo_monitoramento);
        
        // Contar ações administrativas recentes
        $acoes = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} 
            WHERE event_type = 'ADMIN_ACTION' 
            AND user_id = %d 
            AND timestamp > %s",
            $user_id,
            $periodo_inicio
        ));
        
        // Verificar se excedeu o limite
        if ($acoes >= $this->limite_acoes_admin) {
            $user = get_userdata($user_id);
            $ip = $this->obter_ip_cliente();
            
            // Registrar evento de excesso de ações administrativas
            $this->registrar_evento('EXCESSIVE_ADMIN_ACTIONS', $user_id, $user->user_login, array(
                'actions' => $acoes,
                'period' => $this->periodo_monitoramento . ' seconds'
            ), 'alta');
            
            // Enviar notificação
            if (get_option('monitoramento_notificacoes_email') === 'on') {
                $this->enviar_notificacao_alerta(
                    'Excesso de ações administrativas',
                    "Foram detectadas $acoes ações administrativas para o usuário '{$user->user_login}' no IP $ip nos últimos " . 
                    ($this->periodo_monitoramento / 60) . " minutos."
                );
            }
        }
    }
    
    /**
     * Verificar frequência de requisições à API
     */
    private function verificar_frequencia_requisicoes_api($ip) {
        global $wpdb;
        
        // Obter período de monitoramento
        $periodo = current_time('mysql', 1);
        $periodo_inicio = date('Y-m-d H:i:s', strtotime($periodo) - $this->periodo_monitoramento);
        
        // Contar requisições à API recentes
        $requisicoes = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} 
            WHERE event_type = 'API_REQUEST' 
            AND ip = %s 
            AND timestamp > %s",
            $ip,
            $periodo_inicio
        ));
        
        // Verificar se excedeu o limite
        if ($requisicoes >= $this->limite_requisicoes_api) {
            // Registrar evento de excesso de requisições à API
            $this->registrar_evento('EXCESSIVE_API_REQUESTS', null, null, array(
                'requests' => $requisicoes,
                'period' => $this->periodo_monitoramento . ' seconds'
            ), 'alta');
            
            // Verificar se bloqueio automático está ativado
            if (get_option('monitoramento_bloquear_automatico') === 'on') {
                $this->bloquear_ip($ip, 'Excesso de requisições à API', 1); // Bloquear por 1 hora
            }
            
            // Enviar notificação
            if (get_option('monitoramento_notificacoes_email') === 'on') {
                $this->enviar_notificacao_alerta(
                    'Excesso de requisições à API',
                    "Foram detectadas $requisicoes requisições à API do IP $ip nos últimos " . 
                    ($this->periodo_monitoramento / 60) . " minutos."
                );
            }
        }
    }
    
    /**
     * Verificar frequência de requisições a páginas
     */
    private function verificar_frequencia_requisicoes_pagina($ip) {
        global $wpdb;
        
        // Obter período de monitoramento
        $periodo = current_time('mysql', 1);
        $periodo_inicio = date('Y-m-d H:i:s', strtotime($periodo) - $this->periodo_monitoramento);
        
        // Contar requisições a páginas recentes
        $requisicoes = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} 
            WHERE event_type = 'PAGE_REQUEST' 
            AND ip = %s 
            AND timestamp > %s",
            $ip,
            $periodo_inicio
        ));
        
        // Verificar se excedeu o limite
        if ($requisicoes >= $this->limite_requisicoes_pagina) {
            // Registrar evento de excesso de requisições a páginas
            $this->registrar_evento('EXCESSIVE_PAGE_REQUESTS', null, null, array(
                'requests' => $requisicoes,
                'period' => $this->periodo_monitoramento . ' seconds'
            ), 'alta');
            
            // Verificar se bloqueio automático está ativado
            if (get_option('monitoramento_bloquear_automatico') === 'on') {
                $this->bloquear_ip($ip, 'Excesso de requisições a páginas', 1); // Bloquear por 1 hora
            }
            
            // Enviar notificação
            if (get_option('monitoramento_notificacoes_email') === 'on') {
                $this->enviar_notificacao_alerta(
                    'Excesso de requisições a páginas',
                    "Foram detectadas $requisicoes requisições a páginas sensíveis do IP $ip nos últimos " . 
                    ($this->periodo_monitoramento / 60) . " minutos."
                );
            }
        }
    }
    
    /**
     * Registrar evento de segurança
     */
    public function registrar_evento($tipo, $user_id, $username, $dados = array(), $severidade = 'info') {
        global $wpdb;
        
        $ip = $this->obter_ip_cliente();
        
        $wpdb->insert(
            $this->tabela_eventos,
            array(
                'timestamp' => current_time('mysql'),
                'ip' => $ip,
                'user_id' => $user_id,
                'username' => $username,
                'event_type' => $tipo,
                'event_data' => json_encode($dados),
                'severity' => $severidade
            )
        );
        
        // Registrar também no log de segurança do WordPress
        $log_file = ABSPATH . 'wp-content/security-logs/security.log';
        $date = date("Y-m-d H:i:s");
        $user_info = $username ? "Usuário: $username" : "Usuário: Anônimo";
        $log_entry = "[$date] $tipo - IP: $ip, $user_info, Severidade: $severidade, Dados: " . json_encode($dados) . "\n";
        file_put_contents($log_file, $log_entry, FILE_APPEND);
        
        return $wpdb->insert_id;
    }
    
    /**
     * Bloquear IP
     */
    public function bloquear_ip($ip, $motivo, $horas = 24) {
        global $wpdb;
        
        // Calcular data de expiração
        $expiracao = null;
        if ($horas > 0) {
            $expiracao = date('Y-m-d H:i:s', strtotime(current_time('mysql')) + ($horas * 3600));
        }
        
        // Inserir ou atualizar bloqueio
        $wpdb->replace(
            $wpdb->prefix . 'blocked_ips',
            array(
                'ip' => $ip,
                'reason' => $motivo,
                'blocked_at' => current_time('mysql'),
                'expires_at' => $expiracao
            )
        );
        
        // Registrar evento de bloqueio
        $this->registrar_evento('IP_BLOCKED', null, null, array(
            'reason' => $motivo,
            'duration_hours' => $horas
        ), 'alta');
        
        return true;
    }
    
    /**
     * Desbloquear IP
     */
    public function desbloquear_ip($ip) {
        global $wpdb;
        
        $result = $wpdb->delete(
            $wpdb->prefix . 'blocked_ips',
            array('ip' => $ip)
        );
        
        if ($result) {
            // Registrar evento de desbloqueio
            $this->registrar_evento('IP_UNBLOCKED', null, null, array(
                'ip' => $ip
            ), 'media');
        }
        
        return $result;
    }
    
    /**
     * Enviar notificação de alerta
     */
    private function enviar_notificacao_alerta($assunto, $mensagem) {
        $headers = array('Content-Type: text/plain; charset=UTF-8');
        $assunto = '[Acucaradas Segurança] ' . $assunto;
        
        wp_mail($this->email_admin, $assunto, $mensagem, $headers);
    }
    
    /**
     * Obter IP do cliente
     */
    private function obter_ip_cliente() {
        // Verificar cabeçalhos comuns para proxy
        $headers = array(
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        );
        
        foreach ($headers as $header) {
            if (isset($_SERVER[$header]) && filter_var($_SERVER[$header], FILTER_VALIDATE_IP)) {
                return $_SERVER[$header];
            }
        }
        
        return $_SERVER['REMOTE_ADDR'];
    }
    
    /**
     * Obter geolocalização de um IP
     */
    private function obter_geolocalizacao($ip) {
        // Verificar se é um IP local
        if (in_array($ip, array('127.0.0.1', '::1')) || strpos($ip, '192.168.') === 0) {
            return array(
                'country' => 'Local',
                'city' => 'Local',
                'latitude' => 0,
                'longitude' => 0
            );
        }
        
        // Usar API de geolocalização
        $url = "http://ip-api.com/json/$ip?fields=status,country,city,lat,lon";
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        
        if (!$data || $data['status'] !== 'success') {
            return false;
        }
        
        return array(
            'country' => $data['country'],
            'city' => $data['city'],
            'latitude' => $data['lat'],
            'longitude' => $data['lon']
        );
    }
    
    /**
     * Calcular distância geográfica entre dois pontos (fórmula de Haversine)
     */
    private function calcular_distancia_geografica($lat1, $lon1, $lat2, $lon2) {
        $raio_terra = 6371; // Raio da Terra em km
        
        $dlat = deg2rad($lat2 - $lat1);
        $dlon = deg2rad($lon2 - $lon1);
        
        $a = sin($dlat/2) * sin($dlat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dlon/2) * sin($dlon/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        $distancia = $raio_terra * $c;
        
        return $distancia;
    }
    
    /**
     * Verificação periódica de segurança
     */
    public function verificacao_periodica() {
        global $wpdb;
        
        // Verificar eventos de alta severidade nas últimas 24 horas
        $periodo_inicio = date('Y-m-d H:i:s', strtotime(current_time('mysql')) - 86400); // 24 horas
        
        $eventos_alta = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} 
            WHERE severity = 'alta' 
            AND timestamp > %s",
            $periodo_inicio
        ));
        
        // Se houver muitos eventos de alta severidade, enviar relatório
        if ($eventos_alta > 10 && get_option('monitoramento_notificacoes_email') === 'on') {
            // Obter detalhes dos eventos
            $eventos = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$this->tabela_eventos} 
                WHERE severity = 'alta' 
                AND timestamp > %s 
                ORDER BY timestamp DESC",
                $periodo_inicio
            ));
            
            // Preparar mensagem
            $mensagem = "Relatório de Segurança - Eventos de Alta Severidade nas últimas 24 horas\n\n";
            $mensagem .= "Total de eventos: $eventos_alta\n\n";
            
            // Agrupar eventos por tipo
            $eventos_por_tipo = array();
            foreach ($eventos as $evento) {
                if (!isset($eventos_por_tipo[$evento->event_type])) {
                    $eventos_por_tipo[$evento->event_type] = 0;
                }
                $eventos_por_tipo[$evento->event_type]++;
            }
            
            $mensagem .= "Resumo por tipo de evento:\n";
            foreach ($eventos_por_tipo as $tipo => $contagem) {
                $mensagem .= "- $tipo: $contagem\n";
            }
            
            $mensagem .= "\nDetalhes dos 10 eventos mais recentes:\n";
            $contador = 0;
            foreach ($eventos as $evento) {
                if ($contador >= 10) break;
                
                $mensagem .= "\n[{$evento->timestamp}] {$evento->event_type}\n";
                $mensagem .= "IP: {$evento->ip}\n";
                if ($evento->username) {
                    $mensagem .= "Usuário: {$evento->username}\n";
                }
                $mensagem .= "Dados: " . $evento->event_data . "\n";
                
                $contador++;
            }
            
            $mensagem .= "\n\nAcesse o painel administrativo para mais detalhes.";
            
            // Enviar relatório
            $this->enviar_notificacao_alerta(
                'Relatório de Segurança - Eventos de Alta Severidade',
                $mensagem
            );
        }
        
        // Limpar eventos antigos (mais de 30 dias)
        $data_limite = date('Y-m-d H:i:s', strtotime(current_time('mysql')) - (30 * 86400));
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$this->tabela_eventos} WHERE timestamp < %s",
            $data_limite
        ));
        
        // Remover bloqueios expirados
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}blocked_ips WHERE expires_at IS NOT NULL AND expires_at < %s",
            current_time('mysql')
        ));
    }
    
    /**
     * Adicionar menu de configuração
     */
    public function adicionar_menu_configuracao() {
        add_menu_page(
            'Monitoramento de Segurança',
            'Monitoramento',
            'manage_options',
            'monitoramento-seguranca',
            array($this, 'pagina_configuracao'),
            'dashicons-shield',
            30
        );
        
        add_submenu_page(
            'monitoramento-seguranca',
            'Configurações',
            'Configurações',
            'manage_options',
            'monitoramento-seguranca',
            array($this, 'pagina_configuracao')
        );
        
        add_submenu_page(
            'monitoramento-seguranca',
            'Eventos',
            'Eventos',
            'manage_options',
            'monitoramento-eventos',
            array($this, 'pagina_eventos')
        );
        
        add_submenu_page(
            'monitoramento-seguranca',
            'IPs Bloqueados',
            'IPs Bloqueados',
            'manage_options',
            'monitoramento-ips',
            array($this, 'pagina_ips_bloqueados')
        );
    }
    
    /**
     * Página de configuração
     */
    public function pagina_configuracao() {
        // Salvar configurações
        if (isset($_POST['salvar_configuracoes'])) {
            check_admin_referer('monitoramento_configuracoes');
            
            update_option('monitoramento_limite_tentativas_login', intval($_POST['limite_tentativas_login']));
            update_option('monitoramento_periodo_monitoramento', intval($_POST['periodo_monitoramento']));
            update_option('monitoramento_limite_requisicoes_api', intval($_POST['limite_requisicoes_api']));
            update_option('monitoramento_limite_requisicoes_pagina', intval($_POST['limite_requisicoes_pagina']));
            update_option('monitoramento_limite_acoes_admin', intval($_POST['limite_acoes_admin']));
            update_option('monitoramento_nivel_alerta', sanitize_text_field($_POST['nivel_alerta']));
            update_option('monitoramento_notificacoes_email', isset($_POST['notificacoes_email']) ? 'on' : 'off');
            update_option('monitoramento_bloquear_automatico', isset($_POST['bloquear_automatico']) ? 'on' : 'off');
            
            echo '<div class="notice notice-success"><p>Configurações salvas com sucesso!</p></div>';
        }
        
        // Obter configurações atuais
        $limite_tentativas_login = get_option('monitoramento_limite_tentativas_login', $this->limite_tentativas_login);
        $periodo_monitoramento = get_option('monitoramento_periodo_monitoramento', $this->periodo_monitoramento);
        $limite_requisicoes_api = get_option('monitoramento_limite_requisicoes_api', $this->limite_requisicoes_api);
        $limite_requisicoes_pagina = get_option('monitoramento_limite_requisicoes_pagina', $this->limite_requisicoes_pagina);
        $limite_acoes_admin = get_option('monitoramento_limite_acoes_admin', $this->limite_acoes_admin);
        $nivel_alerta = get_option('monitoramento_nivel_alerta', $this->nivel_alerta);
        $notificacoes_email = get_option('monitoramento_notificacoes_email', 'on');
        $bloquear_automatico = get_option('monitoramento_bloquear_automatico', 'off');
        
        // Exibir formulário
        ?>
        <div class="wrap">
            <h1>Configurações de Monitoramento de Segurança</h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('monitoramento_configuracoes'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Limite de tentativas de login</th>
                        <td>
                            <input type="number" name="limite_tentativas_login" value="<?php echo esc_attr($limite_tentativas_login); ?>" min="1" max="20">
                            <p class="description">Número máximo de tentativas de login falhas antes de gerar um alerta.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Período de monitoramento (segundos)</th>
                        <td>
                            <input type="number" name="periodo_monitoramento" value="<?php echo esc_attr($periodo_monitoramento); ?>" min="300" max="86400">
                            <p class="description">Período de tempo (em segundos) para monitorar eventos. Recomendado: 3600 (1 hora).</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Limite de requisições à API</th>
                        <td>
                            <input type="number" name="limite_requisicoes_api" value="<?php echo esc_attr($limite_requisicoes_api); ?>" min="10" max="1000">
                            <p class="description">Número máximo de requisições à API no período de monitoramento antes de gerar um alerta.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Limite de requisições a páginas</th>
                        <td>
                            <input type="number" name="limite_requisicoes_pagina" value="<?php echo esc_attr($limite_requisicoes_pagina); ?>" min="10" max="1000">
                            <p class="description">Número máximo de requisições a páginas sensíveis no período de monitoramento antes de gerar um alerta.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Limite de ações administrativas</th>
                        <td>
                            <input type="number" name="limite_acoes_admin" value="<?php echo esc_attr($limite_acoes_admin); ?>" min="5" max="100">
                            <p class="description">Número máximo de ações administrativas no período de monitoramento antes de gerar um alerta.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Nível de alerta</th>
                        <td>
                            <select name="nivel_alerta">
                                <option value="baixo" <?php selected($nivel_alerta, 'baixo'); ?>>Baixo</option>
                                <option value="medio" <?php selected($nivel_alerta, 'medio'); ?>>Médio</option>
                                <option value="alto" <?php selected($nivel_alerta, 'alto'); ?>>Alto</option>
                            </select>
                            <p class="description">Nível de sensibilidade para alertas. Quanto mais alto, mais alertas serão gerados.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Notificações por e-mail</th>
                        <td>
                            <label>
                                <input type="checkbox" name="notificacoes_email" <?php checked($notificacoes_email, 'on'); ?>>
                                Enviar notificações por e-mail para <?php echo esc_html($this->email_admin); ?>
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Bloqueio automático</th>
                        <td>
                            <label>
                                <input type="checkbox" name="bloquear_automatico" <?php checked($bloquear_automatico, 'on'); ?>>
                                Bloquear automaticamente IPs suspeitos
                            </label>
                            <p class="description">ATENÇÃO: Ative com cuidado. Pode bloquear usuários legítimos em caso de falsos positivos.</p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="salvar_configuracoes" class="button button-primary" value="Salvar Configurações">
                </p>
            </form>
        </div>
        <?php
    }
    
    /**
     * Página de eventos
     */
    public function pagina_eventos() {
        ?>
        <div class="wrap">
            <h1>Eventos de Segurança</h1>
            
            <div class="tablenav top">
                <div class="alignleft actions">
                    <label for="filtro-severidade">Severidade:</label>
                    <select id="filtro-severidade">
                        <option value="">Todas</option>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                    
                    <label for="filtro-tipo">Tipo de Evento:</label>
                    <select id="filtro-tipo">
                        <option value="">Todos</option>
                        <option value="FAILED_LOGIN">Falha de Login</option>
                        <option value="SUCCESSFUL_LOGIN">Login Bem-sucedido</option>
                        <option value="EXCESSIVE_LOGIN_ATTEMPTS">Excesso de Tentativas de Login</option>
                        <option value="UNUSUAL_LOGIN_LOCATION">Local de Login Incomum</option>
                        <option value="ADMIN_ACTION">Ação Administrativa</option>
                        <option value="EXCESSIVE_ADMIN_ACTIONS">Excesso de Ações Administrativas</option>
                        <option value="API_REQUEST">Requisição à API</option>
                        <option value="EXCESSIVE_API_REQUESTS">Excesso de Requisições à API</option>
                        <option value="PAGE_REQUEST">Requisição a Página</option>
                        <option value="EXCESSIVE_PAGE_REQUESTS">Excesso de Requisições a Páginas</option>
                        <option value="IP_BLOCKED">IP Bloqueado</option>
                        <option value="IP_UNBLOCKED">IP Desbloqueado</option>
                    </select>
                    
                    <label for="filtro-ip">IP:</label>
                    <input type="text" id="filtro-ip" placeholder="Filtrar por IP">
                    
                    <button id="aplicar-filtros" class="button">Aplicar Filtros</button>
                </div>
            </div>
            
            <table class="wp-list-table widefat fixed striped" id="tabela-eventos">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Tipo</th>
                        <th>IP</th>
                        <th>Usuário</th>
                        <th>Severidade</th>
                        <th>Detalhes</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="7">Carregando eventos...</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="tablenav bottom">
                <div class="tablenav-pages" id="paginacao-eventos">
                    <span class="displaying-num">0 itens</span>
                    <span class="pagination-links">
                        <a class="first-page button" href="#"><span class="screen-reader-text">Primeira página</span><span aria-hidden="true">«</span></a>
                        <a class="prev-page button" href="#"><span class="screen-reader-text">Página anterior</span><span aria-hidden="true">‹</span></a>
                        <span class="paging-input">
                            <label for="current-page-selector" class="screen-reader-text">Página atual</label>
                            <input class="current-page" id="current-page-selector" type="text" name="paged" value="1" size="1" aria-describedby="table-paging">
                            <span class="tablenav-paging-text"> de <span class="total-pages">1</span></span>
                        </span>
                        <a class="next-page button" href="#"><span class="screen-reader-text">Próxima página</span><span aria-hidden="true">›</span></a>
                        <a class="last-page button" href="#"><span class="screen-reader-text">Última página</span><span aria-hidden="true">»</span></a>
                    </span>
                </div>
            </div>
        </div>
        
        <div id="modal-detalhes" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Detalhes do Evento</h2>
                <div id="conteudo-detalhes"></div>
            </div>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var pagina_atual = 1;
            var itens_por_pagina = 20;
            var total_paginas = 1;
            
            // Carregar eventos
            function carregarEventos() {
                var filtro_severidade = $('#filtro-severidade').val();
                var filtro_tipo = $('#filtro-tipo').val();
                var filtro_ip = $('#filtro-ip').val();
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'monitoramento_obter_eventos',
                        pagina: pagina_atual,
                        itens_por_pagina: itens_por_pagina,
                        severidade: filtro_severidade,
                        tipo: filtro_tipo,
                        ip: filtro_ip
                    },
                    success: function(response) {
                        if (response.success) {
                            var eventos = response.data.eventos;
                            var total = response.data.total;
                            
                            // Atualizar tabela
                            var html = '';
                            if (eventos.length === 0) {
                                html = '<tr><td colspan="7">Nenhum evento encontrado.</td></tr>';
                            } else {
                                $.each(eventos, function(index, evento) {
                                    html += '<tr>';
                                    html += '<td>' + evento.timestamp + '</td>';
                                    html += '<td>' + evento.event_type + '</td>';
                                    html += '<td>' + evento.ip + '</td>';
                                    html += '<td>' + (evento.username ? evento.username : 'Anônimo') + '</td>';
                                    html += '<td><span class="severidade-' + evento.severity + '">' + evento.severity.toUpperCase() + '</span></td>';
                                    html += '<td><button class="button ver-detalhes" data-id="' + evento.id + '">Ver Detalhes</button></td>';
                                    html += '<td>';
                                    if (evento.is_blocked == 0) {
                                        html += '<button class="button bloquear-ip" data-ip="' + evento.ip + '">Bloquear IP</button>';
                                    } else {
                                        html += '<button class="button desbloquear-ip" data-ip="' + evento.ip + '">Desbloquear IP</button>';
                                    }
                                    html += '</td>';
                                    html += '</tr>';
                                });
                            }
                            $('#tabela-eventos tbody').html(html);
                            
                            // Atualizar paginação
                            total_paginas = Math.ceil(total / itens_por_pagina);
                            $('.displaying-num').text(total + ' itens');
                            $('.total-pages').text(total_paginas);
                            $('#current-page-selector').val(pagina_atual);
                            
                            // Habilitar/desabilitar botões de paginação
                            $('.first-page, .prev-page').toggleClass('disabled', pagina_atual === 1);
                            $('.last-page, .next-page').toggleClass('disabled', pagina_atual === total_paginas);
                        }
                    }
                });
            }
            
            // Carregar eventos iniciais
            carregarEventos();
            
            // Aplicar filtros
            $('#aplicar-filtros').on('click', function() {
                pagina_atual = 1;
                carregarEventos();
            });
            
            // Paginação
            $('.first-page').on('click', function(e) {
                e.preventDefault();
                if (pagina_atual !== 1) {
                    pagina_atual = 1;
                    carregarEventos();
                }
            });
            
            $('.prev-page').on('click', function(e) {
                e.preventDefault();
                if (pagina_atual > 1) {
                    pagina_atual--;
                    carregarEventos();
                }
            });
            
            $('.next-page').on('click', function(e) {
                e.preventDefault();
                if (pagina_atual < total_paginas) {
                    pagina_atual++;
                    carregarEventos();
                }
            });
            
            $('.last-page').on('click', function(e) {
                e.preventDefault();
                if (pagina_atual !== total_paginas) {
                    pagina_atual = total_paginas;
                    carregarEventos();
                }
            });
            
            $('#current-page-selector').on('keydown', function(e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    var nova_pagina = parseInt($(this).val());
                    if (nova_pagina > 0 && nova_pagina <= total_paginas) {
                        pagina_atual = nova_pagina;
                        carregarEventos();
                    }
                }
            });
            
            // Ver detalhes do evento
            $(document).on('click', '.ver-detalhes', function() {
                var id = $(this).data('id');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'monitoramento_obter_evento',
                        id: id
                    },
                    success: function(response) {
                        if (response.success) {
                            var evento = response.data;
                            var dados = JSON.parse(evento.event_data);
                            
                            var html = '<table class="widefat">';
                            html += '<tr><th>ID</th><td>' + evento.id + '</td></tr>';
                            html += '<tr><th>Data/Hora</th><td>' + evento.timestamp + '</td></tr>';
                            html += '<tr><th>Tipo</th><td>' + evento.event_type + '</td></tr>';
                            html += '<tr><th>IP</th><td>' + evento.ip + '</td></tr>';
                            html += '<tr><th>Usuário</th><td>' + (evento.username ? evento.username : 'Anônimo') + '</td></tr>';
                            html += '<tr><th>Severidade</th><td>' + evento.severity.toUpperCase() + '</td></tr>';
                            html += '<tr><th>Dados</th><td><pre>' + JSON.stringify(dados, null, 2) + '</pre></td></tr>';
                            html += '</table>';
                            
                            $('#conteudo-detalhes').html(html);
                            $('#modal-detalhes').show();
                        }
                    }
                });
            });
            
            // Fechar modal
            $('.close').on('click', function() {
                $('#modal-detalhes').hide();
            });
            
            $(window).on('click', function(e) {
                if ($(e.target).is('#modal-detalhes')) {
                    $('#modal-detalhes').hide();
                }
            });
            
            // Bloquear IP
            $(document).on('click', '.bloquear-ip', function() {
                var ip = $(this).data('ip');
                var motivo = prompt('Motivo do bloqueio:');
                
                if (motivo) {
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'monitoramento_desbloquear_ip',
                            ip: ip
                        },
                        success: function(response) {
                            if (response.success) {
                                alert('IP desbloqueado com sucesso!');
                                carregarEventos();
                            } else {
                                alert('Erro ao desbloquear IP: ' + response.data.message);
                            }
                        }
                    });
                }
            });
        });
        </script>
        
        <style>
        .severidade-baixa { color: green; }
        .severidade-media { color: orange; }
        .severidade-alta { color: red; font-weight: bold; }
        
        #modal-detalhes {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
        }
        
        .modal-content {
            background-color: #fefefe;
            margin: 10% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 800px;
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover,
        .close:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
        }
        </style>
        <?php
    }
    
    /**
     * Página de IPs bloqueados
     */
    public function pagina_ips_bloqueados() {
        global $wpdb;
        
        // Obter IPs bloqueados
        $ips_bloqueados = $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}blocked_ips ORDER BY blocked_at DESC"
        );
        
        ?>
        <div class="wrap">
            <h1>IPs Bloqueados</h1>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>IP</th>
                        <th>Motivo</th>
                        <th>Bloqueado em</th>
                        <th>Expira em</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($ips_bloqueados)) : ?>
                        <tr>
                            <td colspan="5">Nenhum IP bloqueado.</td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($ips_bloqueados as $ip) : ?>
                            <tr>
                                <td><?php echo esc_html($ip->ip); ?></td>
                                <td><?php echo esc_html($ip->reason); ?></td>
                                <td><?php echo esc_html($ip->blocked_at); ?></td>
                                <td><?php echo $ip->expires_at ? esc_html($ip->expires_at) : 'Permanente'; ?></td>
                                <td>
                                    <button class="button desbloquear-ip" data-ip="<?php echo esc_attr($ip->ip); ?>">Desbloquear</button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
            
            <div style="margin-top: 20px;">
                <h2>Bloquear Novo IP</h2>
                <form method="post" id="form-bloquear-ip">
                    <table class="form-table">
                        <tr>
                            <th scope="row">Endereço IP</th>
                            <td>
                                <input type="text" name="ip" id="novo-ip" required>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Motivo</th>
                            <td>
                                <input type="text" name="motivo" id="novo-motivo" required>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Duração</th>
                            <td>
                                <select name="duracao" id="nova-duracao">
                                    <option value="1">1 hora</option>
                                    <option value="6">6 horas</option>
                                    <option value="24" selected>24 horas</option>
                                    <option value="168">7 dias</option>
                                    <option value="720">30 dias</option>
                                    <option value="0">Permanente</option>
                                </select>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">Bloquear IP</button>
                    </p>
                </form>
            </div>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Desbloquear IP
            $('.desbloquear-ip').on('click', function() {
                var ip = $(this).data('ip');
                
                if (confirm('Tem certeza que deseja desbloquear o IP ' + ip + '?')) {
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'monitoramento_desbloquear_ip',
                            ip: ip
                        },
                        success: function(response) {
                            if (response.success) {
                                alert('IP desbloqueado com sucesso!');
                                location.reload();
                            } else {
                                alert('Erro ao desbloquear IP: ' + response.data.message);
                            }
                        }
                    });
                }
            });
            
            // Bloquear novo IP
            $('#form-bloquear-ip').on('submit', function(e) {
                e.preventDefault();
                
                var ip = $('#novo-ip').val();
                var motivo = $('#novo-motivo').val();
                var duracao = $('#nova-duracao').val();
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'monitoramento_bloquear_ip',
                        ip: ip,
                        motivo: motivo,
                        duracao: duracao
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('IP bloqueado com sucesso!');
                            location.reload();
                        } else {
                            alert('Erro ao bloquear IP: ' + response.data.message);
                        }
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * Adicionar widget ao dashboard
     */
    public function adicionar_widget_dashboard() {
        wp_add_dashboard_widget(
            'monitoramento_seguranca_widget',
            'Monitoramento de Segurança',
            array($this, 'conteudo_widget_dashboard')
        );
    }
    
    /**
     * Conteúdo do widget do dashboard
     */
    public function conteudo_widget_dashboard() {
        global $wpdb;
        
        // Obter estatísticas
        $periodo_inicio = date('Y-m-d H:i:s', strtotime(current_time('mysql')) - 86400); // 24 horas
        
        $total_eventos = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} WHERE timestamp > %s",
            $periodo_inicio
        ));
        
        $eventos_alta = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} WHERE severity = 'alta' AND timestamp > %s",
            $periodo_inicio
        ));
        
        $eventos_media = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} WHERE severity = 'media' AND timestamp > %s",
            $periodo_inicio
        ));
        
        $eventos_baixa = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} WHERE severity = 'baixa' AND timestamp > %s",
            $periodo_inicio
        ));
        
        $ips_bloqueados = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->prefix}blocked_ips"
        );
        
        // Obter eventos recentes
        $eventos_recentes = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->tabela_eventos} WHERE timestamp > %s ORDER BY timestamp DESC LIMIT 5",
            $periodo_inicio
        ));
        
        ?>
        <div class="monitoramento-dashboard-widget">
            <div class="estatisticas">
                <div class="estatistica">
                    <h3><?php echo esc_html($total_eventos); ?></h3>
                    <p>Eventos nas últimas 24h</p>
                </div>
                
                <div class="estatistica">
                    <h3><?php echo esc_html($eventos_alta); ?></h3>
                    <p>Eventos de alta severidade</p>
                </div>
                
                <div class="estatistica">
                    <h3><?php echo esc_html($ips_bloqueados); ?></h3>
                    <p>IPs bloqueados</p>
                </div>
            </div>
            
            <h4>Eventos Recentes</h4>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Tipo</th>
                        <th>Severidade</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($eventos_recentes)) : ?>
                        <tr>
                            <td colspan="3">Nenhum evento recente.</td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($eventos_recentes as $evento) : ?>
                            <tr>
                                <td><?php echo esc_html($evento->timestamp); ?></td>
                                <td><?php echo esc_html($evento->event_type); ?></td>
                                <td><span class="severidade-<?php echo esc_attr($evento->severity); ?>"><?php echo esc_html(strtoupper($evento->severity)); ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
            
            <p>
                <a href="<?php echo esc_url(admin_url('admin.php?page=monitoramento-eventos')); ?>" class="button">Ver Todos os Eventos</a>
            </p>
        </div>
        
        <style>
        .monitoramento-dashboard-widget .estatisticas {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .monitoramento-dashboard-widget .estatistica {
            text-align: center;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            flex: 1;
            margin: 0 5px;
        }
        
        .monitoramento-dashboard-widget .estatistica h3 {
            margin: 0;
            font-size: 24px;
        }
        
        .monitoramento-dashboard-widget .estatistica p {
            margin: 5px 0 0;
            font-size: 12px;
        }
        
        .monitoramento-dashboard-widget .severidade-baixa { color: green; }
        .monitoramento-dashboard-widget .severidade-media { color: orange; }
        .monitoramento-dashboard-widget .severidade-alta { color: red; font-weight: bold; }
        </style>
        <?php
    }
    
    /**
     * AJAX: Obter eventos
     */
    public function ajax_obter_eventos() {
        global $wpdb;
        
        // Parâmetros
        $pagina = isset($_POST['pagina']) ? intval($_POST['pagina']) : 1;
        $itens_por_pagina = isset($_POST['itens_por_pagina']) ? intval($_POST['itens_por_pagina']) : 20;
        $severidade = isset($_POST['severidade']) ? sanitize_text_field($_POST['severidade']) : '';
        $tipo = isset($_POST['tipo']) ? sanitize_text_field($_POST['tipo']) : '';
        $ip = isset($_POST['ip']) ? sanitize_text_field($_POST['ip']) : '';
        
        // Construir consulta
        $where = '1=1';
        $params = array();
        
        if (!empty($severidade)) {
            $where .= ' AND severity = %s';
            $params[] = $severidade;
        }
        
        if (!empty($tipo)) {
            $where .= ' AND event_type = %s';
            $params[] = $tipo;
        }
        
        if (!empty($ip)) {
            $where .= ' AND ip LIKE %s';
            $params[] = '%' . $wpdb->esc_like($ip) . '%';
        }
        
        // Contar total
        $query_count = "SELECT COUNT(*) FROM {$this->tabela_eventos} WHERE $where";
        $total = $wpdb->get_var($wpdb->prepare($query_count, $params));
        
        // Obter eventos
        $offset = ($pagina - 1) * $itens_por_pagina;
        $query = "SELECT * FROM {$this->tabela_eventos} WHERE $where ORDER BY timestamp DESC LIMIT %d OFFSET %d";
        $params[] = $itens_por_pagina;
        $params[] = $offset;
        
        $eventos = $wpdb->get_results($wpdb->prepare($query, $params));
        
        // Verificar IPs bloqueados
        $ips_bloqueados = array();
        $ips = array_unique(array_map(function($evento) {
            return $evento->ip;
        }, $eventos));
        
        if (!empty($ips)) {
            $placeholders = implode(',', array_fill(0, count($ips), '%s'));
            $query_bloqueados = "SELECT ip FROM {$wpdb->prefix}blocked_ips WHERE ip IN ($placeholders)";
            $ips_bloqueados_result = $wpdb->get_results($wpdb->prepare($query_bloqueados, $ips));
            
            foreach ($ips_bloqueados_result as $ip_bloqueado) {
                $ips_bloqueados[] = $ip_bloqueado->ip;
            }
        }
        
        // Marcar eventos com IPs bloqueados
        foreach ($eventos as $evento) {
            $evento->is_blocked = in_array($evento->ip, $ips_bloqueados) ? 1 : 0;
        }
        
        wp_send_json_success(array(
            'eventos' => $eventos,
            'total' => $total
        ));
    }
    
    /**
     * AJAX: Obter evento específico
     */
    public function ajax_obter_evento() {
        global $wpdb;
        
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        
        if (!$id) {
            wp_send_json_error(array('message' => 'ID inválido'));
            return;
        }
        
        $evento = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->tabela_eventos} WHERE id = %d",
            $id
        ));
        
        if (!$evento) {
            wp_send_json_error(array('message' => 'Evento não encontrado'));
            return;
        }
        
        wp_send_json_success($evento);
    }
    
    /**
     * AJAX: Obter estatísticas
     */
    public function ajax_obter_estatisticas() {
        global $wpdb;
        
        // Período
        $periodo = isset($_POST['periodo']) ? intval($_POST['periodo']) : 24; // Horas
        $periodo_inicio = date('Y-m-d H:i:s', strtotime(current_time('mysql')) - ($periodo * 3600));
        
        // Estatísticas gerais
        $total_eventos = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_eventos} WHERE timestamp > %s",
            $periodo_inicio
        ));
        
        $eventos_por_severidade = $wpdb->get_results($wpdb->prepare(
            "SELECT severity, COUNT(*) as total FROM {$this->tabela_eventos} 
            WHERE timestamp > %s 
            GROUP BY severity",
            $periodo_inicio
        ));
        
        $eventos_por_tipo = $wpdb->get_results($wpdb->prepare(
            "SELECT event_type, COUNT(*) as total FROM {$this->tabela_eventos} 
            WHERE timestamp > %s 
            GROUP BY event_type 
            ORDER BY total DESC 
            LIMIT 10",
            $periodo_inicio
        ));
        
        $ips_mais_ativos = $wpdb->get_results($wpdb->prepare(
            "SELECT ip, COUNT(*) as total FROM {$this->tabela_eventos} 
            WHERE timestamp > %s 
            GROUP BY ip 
            ORDER BY total DESC 
            LIMIT 10",
            $periodo_inicio
        ));
        
        wp_send_json_success(array(
            'total_eventos' => $total_eventos,
            'eventos_por_severidade' => $eventos_por_severidade,
            'eventos_por_tipo' => $eventos_por_tipo,
            'ips_mais_ativos' => $ips_mais_ativos
        ));
    }
    
    /**
     * AJAX: Bloquear IP
     */
    public function ajax_bloquear_ip() {
        // Verificar permissões
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada'));
            return;
        }
        
        $ip = isset($_POST['ip']) ? sanitize_text_field($_POST['ip']) : '';
        $motivo = isset($_POST['motivo']) ? sanitize_text_field($_POST['motivo']) : 'Bloqueio manual';
        $duracao = isset($_POST['duracao']) ? intval($_POST['duracao']) : 24;
        
        if (empty($ip)) {
            wp_send_json_error(array('message' => 'IP inválido'));
            return;
        }
        
        // Bloquear IP
        $resultado = $this->bloquear_ip($ip, $motivo, $duracao);
        
        if ($resultado) {
            wp_send_json_success(array('message' => 'IP bloqueado com sucesso'));
        } else {
            wp_send_json_error(array('message' => 'Erro ao bloquear IP'));
        }
    }
    
    /**
     * AJAX: Desbloquear IP
     */
    public function ajax_desbloquear_ip() {
        // Verificar permissões
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada'));
            return;
        }
        
        $ip = isset($_POST['ip']) ? sanitize_text_field($_POST['ip']) : '';
        
        if (empty($ip)) {
            wp_send_json_error(array('message' => 'IP inválido'));
            return;
        }
        
        // Desbloquear IP
        $resultado = $this->desbloquear_ip($ip);
        
        if ($resultado) {
            wp_send_json_success(array('message' => 'IP desbloqueado com sucesso'));
        } else {
            wp_send_json_error(array('message' => 'Erro ao desbloquear IP'));
        }
    }
}

// Inicializar o plugin
$acucaradas_monitoramento = new AcucaradasMonitoramento();

                        type: 'POST',
                        data: {
                            action: 'monitoramento_bloquear_ip',
                            ip: ip,
                            motivo: motivo
                        },
                        success: function(response) {
                            if (response.success) {
                                alert('IP bloqueado com sucesso!');
                                carregarEventos();
                            } else {
                                alert('Erro ao bloquear IP: ' + response.data.message);
                            }
                        }
                    });
                }
            });
            
            // Desbloquear IP
            $(document).on('click', '.desbloquear-ip', function() {
                var ip = $(this).data('ip');
                
                if (confirm('Tem certeza que deseja desbloquear o IP ' + ip + '?')) {
                    $.ajax({
                        url: ajaxurl,