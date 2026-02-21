<?php
/**
 * Plugin Name: Acucaradas - Autenticação de Dois Fatores (2FA)
 * Description: Implementa autenticação de dois fatores para o site Acucaradas Encomendas
 * Version: 1.0.0
 * Author: Equipe de Segurança
 */

// Evitar acesso direto ao arquivo
if (!defined('ABSPATH')) {
    exit;
}

// Verificar se a biblioteca necessária está disponível
if (!class_exists('Base32')) {
    // Incluir a biblioteca Base32 para codificação
    require_once plugin_dir_path(__FILE__) . 'vendor/autoload.php';
}

class AcucaradasDoisFatores {
    
    /**
     * Construtor da classe
     */
    public function __construct() {
        // Adicionar menu de configuração 2FA no perfil do usuário
        add_action('show_user_profile', array($this, 'adicionar_campo_2fa'));
        add_action('edit_user_profile', array($this, 'adicionar_campo_2fa'));
        
        // Salvar configurações 2FA
        add_action('personal_options_update', array($this, 'salvar_campo_2fa'));
        add_action('edit_user_profile_update', array($this, 'salvar_campo_2fa'));
        
        // Interceptar login para verificar 2FA
        add_filter('authenticate', array($this, 'autenticar_com_2fa'), 999, 3);
        
        // Adicionar scripts e estilos
        add_action('login_enqueue_scripts', array($this, 'adicionar_scripts_login'));
        add_action('admin_enqueue_scripts', array($this, 'adicionar_scripts_admin'));
        
        // Adicionar endpoints AJAX
        add_action('wp_ajax_gerar_segredo_2fa', array($this, 'ajax_gerar_segredo_2fa'));
        add_action('wp_ajax_verificar_codigo_2fa', array($this, 'ajax_verificar_codigo_2fa'));
        add_action('wp_ajax_desativar_2fa', array($this, 'ajax_desativar_2fa'));
        add_action('wp_ajax_nopriv_verificar_2fa_login', array($this, 'ajax_verificar_2fa_login'));
        
        // Interceptar login AJAX personalizado
        add_action('wp_ajax_nopriv_ajax_login', array($this, 'interceptar_login_ajax'), 1);
        
        // Criar tabela de códigos de recuperação
        register_activation_hook(__FILE__, array($this, 'criar_tabela_codigos_recuperacao'));
    }
    
    /**
     * Criar tabela para armazenar códigos de recuperação
     */
    public function criar_tabela_codigos_recuperacao() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . '2fa_recovery_codes';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            recovery_code varchar(20) NOT NULL,
            is_used tinyint(1) NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            used_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            KEY user_id (user_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Adicionar campo 2FA no perfil do usuário
     */
    public function adicionar_campo_2fa($user) {
        // Verificar se o usuário atual tem permissão para editar este perfil
        if (!current_user_can('edit_user', $user->ID)) {
            return;
        }
        
        // Verificar se 2FA está ativado para este usuário
        $is_2fa_enabled = get_user_meta($user->ID, '2fa_enabled', true);
        $secret_key = get_user_meta($user->ID, '2fa_secret', true);
        
        // Gerar URL para QR code se o segredo existir
        $qr_code_url = '';
        if (!empty($secret_key)) {
            $site_name = get_bloginfo('name');
            $user_email = $user->user_email;
            $qr_code_url = 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=' . 
                           urlencode("otpauth://totp/$user_email?secret=$secret_key&issuer=$site_name");
        }
        
        // Exibir interface de configuração 2FA
        ?>
        <h3>Autenticação de Dois Fatores (2FA)</h3>
        <table class="form-table">
            <tr>
                <th><label for="2fa_enabled">Status 2FA</label></th>
                <td>
                    <?php if ($is_2fa_enabled) : ?>
                        <span style="color: green; font-weight: bold;">ATIVADO</span>
                        <button type="button" id="desativar_2fa" class="button">Desativar 2FA</button>
                    <?php else : ?>
                        <span style="color: red; font-weight: bold;">DESATIVADO</span>
                        <button type="button" id="configurar_2fa" class="button button-primary">Configurar 2FA</button>
                    <?php endif; ?>
                </td>
            </tr>
            
            <tr id="2fa_setup_container" style="display: <?php echo $is_2fa_enabled ? 'none' : 'none'; ?>">
                <th>Configuração</th>
                <td>
                    <div id="2fa_step1">
                        <p>Siga os passos abaixo para configurar a autenticação de dois fatores:</p>
                        <ol>
                            <li>Instale um aplicativo autenticador no seu celular (Google Authenticator, Microsoft Authenticator ou Authy)</li>
                            <li>Clique em "Gerar Código QR" abaixo</li>
                            <li>Escaneie o código QR com seu aplicativo autenticador</li>
                            <li>Digite o código de 6 dígitos gerado pelo aplicativo para verificar</li>
                        </ol>
                        <button type="button" id="gerar_qr_code" class="button">Gerar Código QR</button>
                    </div>
                    
                    <div id="2fa_step2" style="display: none;">
                        <div id="qr_code_container" style="margin-bottom: 15px;">
                            <?php if (!empty($qr_code_url)) : ?>
                                <img src="<?php echo esc_url($qr_code_url); ?>" alt="Código QR para 2FA">
                            <?php endif; ?>
                        </div>
                        
                        <p><strong>Chave secreta:</strong> <span id="secret_key"><?php echo esc_html($secret_key); ?></span></p>
                        <p>Se não conseguir escanear o código QR, digite esta chave manualmente no seu aplicativo.</p>
                        
                        <div style="margin-top: 15px;">
                            <label for="verification_code">Digite o código de verificação:</label><br>
                            <input type="text" id="verification_code" name="verification_code" pattern="[0-9]{6}" maxlength="6" style="width: 150px;">
                            <button type="button" id="verificar_codigo" class="button button-primary">Verificar e Ativar</button>
                        </div>
                    </div>
                </td>
            </tr>
            
            <?php if ($is_2fa_enabled) : ?>
            <tr>
                <th>Códigos de Recuperação</th>
                <td>
                    <p>Códigos de recuperação permitem que você acesse sua conta caso perca acesso ao seu aplicativo autenticador.</p>
                    <button type="button" id="gerar_codigos_recuperacao" class="button">Gerar Novos Códigos de Recuperação</button>
                    
                    <div id="codigos_recuperacao_container" style="display: none; margin-top: 15px;">
                        <p><strong>Seus códigos de recuperação:</strong></p>
                        <pre id="codigos_recuperacao" style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd;"></pre>
                        <p><strong>IMPORTANTE:</strong> Salve estes códigos em um local seguro. Eles só serão exibidos uma vez!</p>
                    </div>
                </td>
            </tr>
            <?php endif; ?>
        </table>
        
        <input type="hidden" id="user_id" value="<?php echo esc_attr($user->ID); ?>">
        <?php
    }
    
    /**
     * Salvar configurações 2FA
     */
    public function salvar_campo_2fa($user_id) {
        // Esta função é usada principalmente para salvar via formulário padrão
        // A maior parte da funcionalidade é tratada via AJAX
    }
    
    /**
     * Gerar segredo 2FA via AJAX
     */
    public function ajax_gerar_segredo_2fa() {
        // Verificar nonce e permissões
        check_ajax_referer('2fa_nonce', 'nonce');
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(array('message' => 'Usuário não autenticado'));
            return;
        }
        
        // Gerar segredo aleatório
        $secret = $this->gerar_segredo();
        
        // Armazenar temporariamente (não ativado ainda)
        update_user_meta($user_id, '2fa_temp_secret', $secret);
        
        // Gerar URL para QR code
        $site_name = get_bloginfo('name');
        $user = get_userdata($user_id);
        $user_email = $user->user_email;
        
        $qr_code_url = 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=' . 
                       urlencode("otpauth://totp/$user_email?secret=$secret&issuer=$site_name");
        
        wp_send_json_success(array(
            'secret' => $secret,
            'qr_code_url' => $qr_code_url
        ));
    }
    
    /**
     * Verificar código 2FA via AJAX
     */
    public function ajax_verificar_codigo_2fa() {
        // Verificar nonce e permissões
        check_ajax_referer('2fa_nonce', 'nonce');
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(array('message' => 'Usuário não autenticado'));
            return;
        }
        
        $verification_code = isset($_POST['code']) ? sanitize_text_field($_POST['code']) : '';
        $temp_secret = get_user_meta($user_id, '2fa_temp_secret', true);
        
        if (empty($temp_secret)) {
            wp_send_json_error(array('message' => 'Nenhum segredo temporário encontrado. Gere um novo código QR.'));
            return;
        }
        
        // Verificar código
        if ($this->verificar_codigo_totp($temp_secret, $verification_code)) {
            // Código válido, ativar 2FA
            update_user_meta($user_id, '2fa_secret', $temp_secret);
            update_user_meta($user_id, '2fa_enabled', 1);
            delete_user_meta($user_id, '2fa_temp_secret');
            
            // Gerar códigos de recuperação
            $recovery_codes = $this->gerar_codigos_recuperacao($user_id);
            
            // Registrar no log de segurança
            $this->registrar_evento_seguranca('2FA_ATIVADO', $user_id, 'Autenticação de dois fatores ativada com sucesso');
            
            wp_send_json_success(array(
                'message' => 'Autenticação de dois fatores ativada com sucesso!',
                'recovery_codes' => $recovery_codes
            ));
        } else {
            // Código inválido
            $this->registrar_evento_seguranca('2FA_FALHA_VERIFICACAO', $user_id, 'Falha na verificação do código 2FA durante configuração');
            
            wp_send_json_error(array('message' => 'Código de verificação inválido. Tente novamente.'));
        }
    }
    
    /**
     * Desativar 2FA via AJAX
     */
    public function ajax_desativar_2fa() {
        // Verificar nonce e permissões
        check_ajax_referer('2fa_nonce', 'nonce');
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(array('message' => 'Usuário não autenticado'));
            return;
        }
        
        // Remover metadados 2FA
        delete_user_meta($user_id, '2fa_secret');
        delete_user_meta($user_id, '2fa_enabled');
        delete_user_meta($user_id, '2fa_temp_secret');
        
        // Remover códigos de recuperação
        $this->remover_codigos_recuperacao($user_id);
        
        // Registrar no log de segurança
        $this->registrar_evento_seguranca('2FA_DESATIVADO', $user_id, 'Autenticação de dois fatores desativada');
        
        wp_send_json_success(array('message' => 'Autenticação de dois fatores desativada com sucesso!'));
    }
    
    /**
     * Verificar código 2FA durante login via AJAX
     */
    public function ajax_verificar_2fa_login() {
        // Verificar dados necessários
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $verification_code = isset($_POST['code']) ? sanitize_text_field($_POST['code']) : '';
        $recovery_mode = isset($_POST['recovery_mode']) && $_POST['recovery_mode'] === 'true';
        
        if (!$user_id || empty($verification_code)) {
            wp_send_json_error(array('message' => 'Dados incompletos'));
            return;
        }
        
        // Verificar se é um código de recuperação ou código TOTP
        if ($recovery_mode) {
            // Verificar código de recuperação
            if ($this->verificar_codigo_recuperacao($user_id, $verification_code)) {
                // Código válido, autenticar usuário
                $user = get_user_by('ID', $user_id);
                wp_set_auth_cookie($user_id, true);
                
                $this->registrar_evento_seguranca('2FA_LOGIN_RECUPERACAO', $user_id, 'Login com código de recuperação bem-sucedido');
                
                wp_send_json_success(array(
                    'message' => 'Autenticação bem-sucedida!',
                    'redirect' => admin_url()
                ));
            } else {
                $this->registrar_evento_seguranca('2FA_FALHA_RECUPERACAO', $user_id, 'Falha no login com código de recuperação');
                
                wp_send_json_error(array('message' => 'Código de recuperação inválido'));
            }
        } else {
            // Verificar código TOTP
            $secret = get_user_meta($user_id, '2fa_secret', true);
            
            if (empty($secret)) {
                wp_send_json_error(array('message' => 'Configuração 2FA não encontrada'));
                return;
            }
            
            if ($this->verificar_codigo_totp($secret, $verification_code)) {
                // Código válido, autenticar usuário
                $user = get_user_by('ID', $user_id);
                wp_set_auth_cookie($user_id, true);
                
                $this->registrar_evento_seguranca('2FA_LOGIN_SUCESSO', $user_id, 'Login com 2FA bem-sucedido');
                
                wp_send_json_success(array(
                    'message' => 'Autenticação bem-sucedida!',
                    'redirect' => admin_url()
                ));
            } else {
                $this->registrar_evento_seguranca('2FA_FALHA_LOGIN', $user_id, 'Falha na verificação do código 2FA durante login');
                
                wp_send_json_error(array('message' => 'Código de verificação inválido'));
            }
        }
    }
    
    /**
     * Interceptar login AJAX personalizado
     */
    public function interceptar_login_ajax() {
        // Verificar se é uma requisição de login
        if (isset($_POST['action']) && $_POST['action'] === 'ajax_login') {
            // Obter credenciais
            $username = isset($_POST['username']) ? sanitize_user($_POST['username']) : '';
            $password = isset($_POST['password']) ? $_POST['password'] : '';
            
            // Autenticar usuário
            $user = wp_authenticate($username, $password);
            
            // Verificar se a autenticação foi bem-sucedida
            if (is_wp_error($user)) {
                // Erro de autenticação, deixar o fluxo normal continuar
                return;
            }
            
            // Verificar se 2FA está ativado para este usuário
            $is_2fa_enabled = get_user_meta($user->ID, '2fa_enabled', true);
            
            if ($is_2fa_enabled) {
                // 2FA ativado, interromper login normal e solicitar código
                wp_send_json(array(
                    'success' => 'needs_2fa',
                    'user_id' => $user->ID,
                    'message' => 'Digite o código de autenticação de dois fatores',
                ));
                exit;
            }
            
            // 2FA não ativado, deixar o fluxo normal continuar
        }
    }
    
    /**
     * Autenticar com 2FA
     */
    public function autenticar_com_2fa($user, $username, $password) {
        // Se já houver um erro ou não for um objeto de usuário, retornar
        if (is_wp_error($user) || !is_a($user, 'WP_User')) {
            return $user;
        }
        
        // Verificar se 2FA está ativado para este usuário
        $is_2fa_enabled = get_user_meta($user->ID, '2fa_enabled', true);
        
        if ($is_2fa_enabled) {
            // Verificar se estamos na tela de login padrão do WordPress
            if (isset($_POST['wp-submit'])) {
                // Armazenar ID do usuário em sessão para verificação 2FA
                if (!session_id()) {
                    session_start();
                }
                
                $_SESSION['2fa_user_id'] = $user->ID;
                
                // Redirecionar para página de verificação 2FA
                wp_redirect(site_url('wp-login.php?action=2fa_verify'));
                exit;
            }
        }
        
        return $user;
    }
    
    /**
     * Adicionar scripts e estilos na tela de login
     */
    public function adicionar_scripts_login() {
        // Adicionar scripts e estilos para a tela de verificação 2FA
        if (isset($_GET['action']) && $_GET['action'] === '2fa_verify') {
            // Adicionar estilos e scripts necessários
        }
    }
    
    /**
     * Adicionar scripts e estilos no admin
     */
    public function adicionar_scripts_admin($hook) {
        // Adicionar apenas na página de perfil
        if ($hook === 'profile.php' || $hook === 'user-edit.php') {
            // Adicionar scripts e estilos para configuração 2FA
            wp_enqueue_script('2fa-admin', plugin_dir_url(__FILE__) . 'js/2fa-admin.js', array('jquery'), '1.0.0', true);
            wp_localize_script('2fa-admin', '2fa_vars', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('2fa_nonce')
            ));
        }
    }
    
    /**
     * Gerar segredo aleatório para TOTP
     */
    private function gerar_segredo() {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 charset
        $secret = '';
        
        for ($i = 0; $i < 16; $i++) {
            $secret .= $chars[random_int(0, 31)];
        }
        
        return $secret;
    }
    
    /**
     * Verificar código TOTP
     */
    private function verificar_codigo_totp($secret, $code) {
        // Implementação básica de verificação TOTP
        // Em produção, use uma biblioteca TOTP completa
        
        // Decodificar segredo Base32
        $decoded = $this->base32_decode($secret);
        
        // Obter timestamp atual em intervalos de 30 segundos
        $timestamp = floor(time() / 30);
        
        // Verificar código atual e códigos adjacentes (para compensar dessincronia de relógio)
        for ($t = $timestamp - 1; $t <= $timestamp + 1; $t++) {
            $calculated_code = $this->calcular_totp($decoded, $t);
            if ($calculated_code === $code) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Decodificar Base32
     */
    private function base32_decode($secret) {
        if (class_exists('Base32')) {
            return Base32::decode($secret);
        }
        
        // Implementação básica de decodificação Base32
        $secret = strtoupper($secret);
        $secret = str_replace('=', '', $secret);
        
        $decoded = '';
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        
        for ($i = 0; $i < strlen($secret); $i++) {
            $val = strpos($chars, $secret[$i]);
            if ($val === false) continue;
            $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
        }
        
        for ($i = 0; $i + 8 <= strlen($bits); $i += 8) {
            $byte = substr($bits, $i, 8);
            $decoded .= chr(bindec($byte));
        }
        
        return $decoded;
    }
    
    /**
     * Calcular código TOTP
     */
    private function calcular_totp($key, $timestamp) {
        // Converter timestamp para bytes (big-endian)
        $timestamp = pack('N*', 0, $timestamp);
        
        // Calcular HMAC-SHA1
        $hash = hash_hmac('sha1', $timestamp, $key, true);
        
        // Extrair 4 bytes com base no último nibble
        $offset = ord($hash[19]) & 0x0F;
        $truncated = (
            ((ord($hash[$offset + 0]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        );
        
        // Gerar código de 6 dígitos
        $code = $truncated % 1000000;
        return str_pad($code, 6, '0', STR_PAD_LEFT);
    }
    
    /**
     * Gerar códigos de recuperação
     */
    private function gerar_codigos_recuperacao($user_id) {
        global $wpdb;
        
        // Remover códigos antigos
        $this->remover_codigos_recuperacao($user_id);
        
        // Gerar 10 códigos de recuperação
        $recovery_codes = array();
        $table_name = $wpdb->prefix . '2fa_recovery_codes';
        
        for ($i = 0; $i < 10; $i++) {
            // Gerar código aleatório (formato: XXXX-XXXX-XXXX)
            $code = sprintf(
                '%04X-%04X-%04X',
                random_int(0, 0xFFFF),
                random_int(0, 0xFFFF),
                random_int(0, 0xFFFF)
            );
            
            // Inserir no banco de dados
            $wpdb->insert(
                $table_name,
                array(
                    'user_id' => $user_id,
                    'recovery_code' => $code,
                    'created_at' => current_time('mysql')
                )
            );
            
            $recovery_codes[] = $code;
        }
        
        return $recovery_codes;
    }
    
    /**
     * Remover códigos de recuperação
     */
    private function remover_codigos_recuperacao($user_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . '2fa_recovery_codes';
        
        $wpdb->delete(
            $table_name,
            array('user_id' => $user_id)
        );
    }
    
    /**
     * Verificar código de recuperação
     */
    private function verificar_codigo_recuperacao($user_id, $code) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . '2fa_recovery_codes';
        
        // Buscar código não utilizado
        $recovery_code = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE user_id = %d AND recovery_code = %s AND is_used = 0",
            $user_id,
            $code
        ));
        
        if ($recovery_code) {
            // Marcar código como utilizado
            $wpdb->update(
                $table_name,
                array(
                    'is_used' => 1,
                    'used_at' => current_time('mysql')
                ),
                array('id' => $recovery_code->id)
            );
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Registrar evento de segurança no log
     */
    private function registrar_evento_seguranca($tipo, $user_id, $mensagem) {
        $log_file = ABSPATH . 'wp-content/security-logs/auth.log';
        $ip = $_SERVER['REMOTE_ADDR'];
        $date = date("Y-m-d H:i:s");
        $user = get_userdata($user_id);
        $username = $user ? $user->user_login : 'ID:' . $user_id;
        
        $log_entry = "[$date] $tipo - IP: $ip, Usuário: $username, $mensagem\n";
        file_put_contents($log_file, $log_entry, FILE_APPEND);
    }
}

// Inicializar o plugin
$acucaradas_dois_fatores = new AcucaradasDoisFatores();

// Adicionar JavaScript para o frontend
function acucaradas_2fa_frontend_js() {
    ?>
    <script type="text/javascript">
    jQuery(document).ready(function($) {
        // Interceptar formulário de login AJAX
        $(document).on('submit', '#ajax-login-form', function(e) {
            // O código original de login AJAX continua funcionando
            // Este script apenas adiciona suporte para o fluxo 2FA
            
            // Verificar resposta do servidor após tentativa de login
            $(document).ajaxSuccess(function(event, xhr, settings) {
                if (settings.url.indexOf('ajax_login') > -1) {
                    var response = xhr.responseJSON;
                    
                    // Verificar se precisa de 2FA
                    if (response && response.success === 'needs_2fa') {
                        // Exibir formulário 2FA
                        $('#login-form').hide();
                        $('#2fa-form').show();
                        $('#2fa-user-id').val(response.user_id);
                        $('#2fa-message').text(response.message);
                    }
                }
            });
        });
        
        // Enviar código 2FA
        $(document).on('submit', '#2fa-verification-form', function(e) {
            e.preventDefault();
            
            var user_id = $('#2fa-user-id').val();
            var code = $('#2fa-code').val();
            var recovery_mode = $('#2fa-recovery-mode').is(':checked');
            
            $.ajax({
                type: 'POST',
                url: ajax_object.ajax_url,
                data: {
                    action: 'verificar_2fa_login',
                    user_id: user_id,
                    code: code,
                    recovery_mode: recovery_mode
                },
                success: function(response) {
                    if (response.success) {
                        // Redirecionar após autenticação bem-sucedida
                        window.location.href = response.data.redirect;
                    } else {
                        // Exibir erro
                        $('#2fa-error').text(response.data.message).show();
                    }
                }
            });
        });
        
        // Alternar entre código 2FA e código de recuperação
        $(document).on('change', '#2fa-recovery-mode', function() {
            if ($(this).is(':checked')) {
                $('#2fa-code-label').text('Código de recuperação:');
                $('#2fa-code').attr('placeholder', 'XXXX-XXXX-XXXX');
            } else {
                $('#2fa-code-label').text('Código de verificação:');
                $('#2fa-code').attr('placeholder', '000000');
            }
        });
    });
    </script>
    <?php
}
add_action('wp_footer', 'acucaradas_2fa_frontend_js');

// Adicionar HTML para o formulário 2FA
function acucaradas_2fa_form_html() {
    ?>
    <div id="2fa-form" style="display: none;">
        <h3>Autenticação de Dois Fatores</h3>
        <p id="2fa-message"></p>
        
        <form id="2fa-verification-form">
            <input type="hidden" id="2fa-user-id" name="user_id" value="">
            
            <p>
                <label id="2fa-code-label" for="2fa-code">Código de verificação:</label>
                <input type="text" id="2fa-code" name="code" placeholder="000000" required>
            </p>
            
            <p>
                <label>
                    <input type="checkbox" id="2fa-recovery-mode" name="recovery_mode">
                    Usar código de recuperação
                </label>
            </p>
            
            <p id="2fa-error" style="color: red; display: none;"></p>
            
            <p>
                <button type="submit" class="button button-primary">Verificar</button>
            </p>
        </form>
    </div>
    <?php
}
add_action('wp_footer', 'acucaradas_2fa_form_html');