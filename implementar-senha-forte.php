<?php
/**
 * Plugin Name: Acucaradas - Política de Senhas Fortes
 * Description: Implementa política de senhas fortes para o site Acucaradas Encomendas
 * Version: 1.0.0
 * Author: Equipe de Segurança
 */

// Evitar acesso direto ao arquivo
if (!defined('ABSPATH')) {
    exit;
}

class AcucaradasSenhasFortes {
    
    /**
     * Construtor da classe
     */
    public function __construct() {
        // Adicionar validação de senha no registro
        add_filter('registration_errors', array($this, 'validar_senha_registro'), 10, 3);
        
        // Adicionar validação de senha na alteração de senha
        add_action('user_profile_update_errors', array($this, 'validar_senha_perfil'), 10, 3);
        
        // Adicionar validação de senha no reset de senha
        add_action('validate_password_reset', array($this, 'validar_senha_reset'), 10, 2);
        
        // Adicionar validação de senha no formulário de login AJAX personalizado
        add_action('wp_ajax_nopriv_ajax_login', array($this, 'interceptar_login_ajax'), 1);
        add_action('wp_ajax_nopriv_ajax_register', array($this, 'interceptar_registro_ajax'), 1);
        
        // Adicionar mensagem informativa no formulário de login
        add_action('login_enqueue_scripts', array($this, 'adicionar_css_login'));
        add_action('login_form', array($this, 'adicionar_mensagem_login'));
    }
    
    /**
     * Validar força da senha
     * 
     * @param string $password Senha a ser validada
     * @param WP_User|string $user Usuário ou nome de usuário
     * @return WP_Error Erros de validação, se houver
     */
    public function validar_senha_forte($password, $user) {
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
        $common_passwords = array(
            'password123', '12345678', 'qwerty123', 'admin123', 'senha123', 'abc123',
            'welcome1', '123456789', 'password1', 'administrator', 'acucaradas',
            '1234567890', 'senha1234', 'mudar123', 'mudar@123', 'teste123'
        );
        
        if (in_array(strtolower($password), $common_passwords)) {
            $errors->add('password_common', 'Esta senha é muito comum e facilmente adivinhável.');
        }
        
        // Verificar informações do usuário na senha
        if (is_object($user) && isset($user->user_login)) {
            $user_data = $user->user_login . ' ' . 
                         (isset($user->first_name) ? $user->first_name : '') . ' ' . 
                         (isset($user->last_name) ? $user->last_name : '');
            
            // Verificar se partes do nome de usuário estão na senha
            $user_parts = explode(' ', $user_data);
            foreach ($user_parts as $part) {
                if (!empty($part) && strlen($part) > 3 && stripos($password, $part) !== false) {
                    $errors->add('password_user_data', 'A senha não pode conter seu nome de usuário ou nome real.');
                    break;
                }
            }
        } elseif (is_string($user) && !empty($user)) {
            if (stripos($password, $user) !== false) {
                $errors->add('password_user_data', 'A senha não pode conter seu nome de usuário.');
            }
        }
        
        // Verificar sequências óbvias
        $sequences = array('123', 'abc', 'qwe', 'asd', 'zxc');
        foreach ($sequences as $sequence) {
            if (stripos($password, $sequence) !== false) {
                $errors->add('password_sequence', 'A senha não deve conter sequências óbvias como "' . $sequence . '".');
                break;
            }
        }
        
        return $errors;
    }
    
    /**
     * Validar senha no registro de usuário
     */
    public function validar_senha_registro($errors, $sanitized_user_login, $user_email) {
        if (isset($_POST['pass1']) && !empty($_POST['pass1'])) {
            $password = $_POST['pass1'];
            $password_errors = $this->validar_senha_forte($password, $sanitized_user_login);
            
            if ($password_errors->has_errors()) {
                foreach ($password_errors->get_error_messages() as $error) {
                    $errors->add('password_error', $error);
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Validar senha na atualização de perfil
     */
    public function validar_senha_perfil($errors, $update, $user) {
        if (isset($_POST['pass1']) && !empty($_POST['pass1'])) {
            $password = $_POST['pass1'];
            $password_errors = $this->validar_senha_forte($password, $user);
            
            if ($password_errors->has_errors()) {
                foreach ($password_errors->get_error_messages() as $error) {
                    $errors->add('password_error', $error);
                }
            }
        }
    }
    
    /**
     * Validar senha no reset de senha
     */
    public function validar_senha_reset($errors, $user) {
        if (isset($_POST['pass1']) && !empty($_POST['pass1'])) {
            $password = $_POST['pass1'];
            $password_errors = $this->validar_senha_forte($password, $user);
            
            if ($password_errors->has_errors()) {
                foreach ($password_errors->get_error_messages() as $error) {
                    $errors->add('password_error', $error);
                }
            }
        }
    }
    
    /**
     * Interceptar login AJAX para validar senha
     */
    public function interceptar_login_ajax() {
        // Não validamos a senha no login, apenas no registro e alteração
        // Esta função pode ser usada para logging ou outras verificações futuras
    }
    
    /**
     * Interceptar registro AJAX para validar senha
     */
    public function interceptar_registro_ajax() {
        if (isset($_POST['action']) && $_POST['action'] === 'ajax_register') {
            if (isset($_POST['password']) && !empty($_POST['password'])) {
                $password = $_POST['password'];
                $username = isset($_POST['username']) ? $_POST['username'] : '';
                
                $password_errors = $this->validar_senha_forte($password, $username);
                
                if ($password_errors->has_errors()) {
                    $error_message = 'Erro na senha: ' . implode(' ', $password_errors->get_error_messages());
                    
                    // Enviar erro via AJAX
                    wp_send_json_error(array('message' => $error_message));
                    exit;
                }
            }
        }
    }
    
    /**
     * Adicionar CSS ao formulário de login
     */
    public function adicionar_css_login() {
        echo '<style>
            .password-policy {
                background-color: #f8f8f8;
                border-left: 4px solid #00a0d2;
                padding: 10px;
                margin: 15px 0;
                font-size: 13px;
                color: #444;
            }
            .password-policy ul {
                margin: 5px 0 5px 20px;
                list-style-type: disc;
            }
        </style>';
    }
    
    /**
     * Adicionar mensagem informativa no formulário de login
     */
    public function adicionar_mensagem_login() {
        echo '<div class="password-policy">
            <p><strong>Política de Senhas:</strong></p>
            <ul>
                <li>Mínimo de 10 caracteres</li>
                <li>Pelo menos uma letra maiúscula</li>
                <li>Pelo menos uma letra minúscula</li>
                <li>Pelo menos um número</li>
                <li>Pelo menos um caractere especial</li>
                <li>Não pode conter seu nome de usuário</li>
                <li>Não pode ser uma senha comum</li>
            </ul>
        </div>';
    }
    
    /**
     * Registrar evento de segurança no log
     */
    private function registrar_evento_seguranca($tipo, $usuario, $mensagem) {
        $log_file = ABSPATH . 'wp-content/security-logs/auth.log';
        $ip = $_SERVER['REMOTE_ADDR'];
        $date = date("Y-m-d H:i:s");
        
        $log_entry = "[$date] $tipo - IP: $ip, Usuário: $usuario, $mensagem\n";
        file_put_contents($log_file, $log_entry, FILE_APPEND);
    }
}

// Inicializar o plugin
$acucaradas_senhas_fortes = new AcucaradasSenhasFortes();