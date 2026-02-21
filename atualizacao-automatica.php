<?php
/**
 * Plugin Name: Acucaradas - Atualização Automática de Segurança
 * Description: Implementa verificação e atualização automática de bibliotecas, plugins e temas para melhorar a segurança do site.
 * Version: 1.0.0
 * Author: Acucaradas Encomendas
 * Text Domain: acucaradas-atualizacao
 */

// Evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

class AcucaradasAtualizacao {
    /**
     * Construtor da classe
     */
    public function __construct() {
        // Hooks de inicialização
        add_action('admin_menu', array($this, 'adicionar_menu'));
        add_action('admin_init', array($this, 'registrar_configuracoes'));
        
        // Hooks para verificação e atualização
        add_action('wp_scheduled_auto_update', array($this, 'executar_atualizacoes_automaticas'));
        add_action('admin_init', array($this, 'verificar_atualizacoes_pendentes'));
        
        // Hooks para notificações
        add_action('admin_notices', array($this, 'exibir_notificacoes_admin'));
        add_action('wp_ajax_acucaradas_ignorar_notificacao', array($this, 'ajax_ignorar_notificacao'));
        
        // Agendamento de verificações
        if (!wp_next_scheduled('wp_scheduled_auto_update')) {
            wp_schedule_event(time(), 'daily', 'wp_scheduled_auto_update');
        }
        
        // Adicionar scripts e estilos
        add_action('admin_enqueue_scripts', array($this, 'adicionar_scripts'));
    }
    
    /**
     * Adicionar menu no painel administrativo
     */
    public function adicionar_menu() {
        add_submenu_page(
            'tools.php',
            'Atualização Automática',
            'Atualização Automática',
            'manage_options',
            'acucaradas-atualizacao',
            array($this, 'pagina_configuracoes')
        );
    }
    
    /**
     * Registrar configurações
     */
    public function registrar_configuracoes() {
        register_setting('acucaradas_atualizacao', 'acucaradas_atualizacao_config');
        
        add_settings_section(
            'acucaradas_atualizacao_section',
            'Configurações de Atualização Automática',
            array($this, 'secao_configuracoes_callback'),
            'acucaradas-atualizacao'
        );
        
        add_settings_field(
            'atualizar_plugins',
            'Atualizar Plugins Automaticamente',
            array($this, 'campo_checkbox_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'atualizar_plugins',
                'descricao' => 'Atualiza automaticamente plugins quando novas versões estiverem disponíveis.'
            )
        );
        
        add_settings_field(
            'atualizar_temas',
            'Atualizar Temas Automaticamente',
            array($this, 'campo_checkbox_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'atualizar_temas',
                'descricao' => 'Atualiza automaticamente temas quando novas versões estiverem disponíveis.'
            )
        );
        
        add_settings_field(
            'atualizar_wordpress',
            'Atualizar WordPress Automaticamente',
            array($this, 'campo_checkbox_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'atualizar_wordpress',
                'descricao' => 'Atualiza automaticamente o core do WordPress quando novas versões estiverem disponíveis.'
            )
        );
        
        add_settings_field(
            'apenas_seguranca',
            'Apenas Atualizações de Segurança',
            array($this, 'campo_checkbox_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'apenas_seguranca',
                'descricao' => 'Atualiza automaticamente apenas quando a atualização contiver correções de segurança.'
            )
        );
        
        add_settings_field(
            'email_notificacao',
            'E-mail para Notificações',
            array($this, 'campo_texto_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'email_notificacao',
                'descricao' => 'E-mail para receber notificações sobre atualizações disponíveis e realizadas.'
            )
        );
        
        add_settings_field(
            'plugins_excluidos',
            'Plugins Excluídos da Atualização Automática',
            array($this, 'campo_multiplo_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'plugins_excluidos',
                'descricao' => 'Selecione os plugins que não devem ser atualizados automaticamente.',
                'tipo' => 'plugins'
            )
        );
        
        add_settings_field(
            'temas_excluidos',
            'Temas Excluídos da Atualização Automática',
            array($this, 'campo_multiplo_callback'),
            'acucaradas-atualizacao',
            'acucaradas_atualizacao_section',
            array(
                'label_for' => 'temas_excluidos',
                'descricao' => 'Selecione os temas que não devem ser atualizados automaticamente.',
                'tipo' => 'temas'
            )
        );
    }
    
    /**
     * Callback para a seção de configurações
     */
    public function secao_configuracoes_callback() {
        echo '<p>Configure as opções de atualização automática para manter seu site seguro.</p>';
    }
    
    /**
     * Callback para campos de checkbox
     */
    public function campo_checkbox_callback($args) {
        $opcoes = get_option('acucaradas_atualizacao_config', array());
        $valor = isset($opcoes[$args['label_for']]) ? $opcoes[$args['label_for']] : 0;
        
        echo '<input type="checkbox" id="' . esc_attr($args['label_for']) . '" name="acucaradas_atualizacao_config[' . esc_attr($args['label_for']) . ']" value="1" ' . checked(1, $valor, false) . '>';
        echo '<label for="' . esc_attr($args['label_for']) . '">' . esc_html($args['descricao']) . '</label>';
    }
    
    /**
     * Callback para campos de texto
     */
    public function campo_texto_callback($args) {
        $opcoes = get_option('acucaradas_atualizacao_config', array());
        $valor = isset($opcoes[$args['label_for']]) ? $opcoes[$args['label_for']] : get_option('admin_email');
        
        echo '<input type="text" id="' . esc_attr($args['label_for']) . '" name="acucaradas_atualizacao_config[' . esc_attr($args['label_for']) . ']" value="' . esc_attr($valor) . '" class="regular-text">';
        echo '<p class="description">' . esc_html($args['descricao']) . '</p>';
    }
    
    /**
     * Callback para campos de seleção múltipla
     */
    public function campo_multiplo_callback($args) {
        $opcoes = get_option('acucaradas_atualizacao_config', array());
        $valores = isset($opcoes[$args['label_for']]) ? $opcoes[$args['label_for']] : array();
        
        if ($args['tipo'] === 'plugins') {
            $itens = get_plugins();
            
            echo '<select id="' . esc_attr($args['label_for']) . '" name="acucaradas_atualizacao_config[' . esc_attr($args['label_for']) . '][]" multiple style="min-width: 300px; height: 150px;">';
            
            foreach ($itens as $path => $plugin) {
                $selecionado = in_array($path, $valores) ? 'selected' : '';
                echo '<option value="' . esc_attr($path) . '" ' . $selecionado . '>' . esc_html($plugin['Name']) . '</option>';
            }
            
            echo '</select>';
        } elseif ($args['tipo'] === 'temas') {
            $itens = wp_get_themes();
            
            echo '<select id="' . esc_attr($args['label_for']) . '" name="acucaradas_atualizacao_config[' . esc_attr($args['label_for']) . '][]" multiple style="min-width: 300px; height: 150px;">';
            
            foreach ($itens as $slug => $tema) {
                $selecionado = in_array($slug, $valores) ? 'selected' : '';
                echo '<option value="' . esc_attr($slug) . '" ' . $selecionado . '>' . esc_html($tema->get('Name')) . '</option>';
            }
            
            echo '</select>';
        }
        
        echo '<p class="description">' . esc_html($args['descricao']) . '</p>';
        echo '<p class="description">Mantenha a tecla Ctrl pressionada para selecionar múltiplos itens.</p>';
    }
    
    /**
     * Página de configurações
     */
    public function pagina_configuracoes() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Verificar atualizações disponíveis
        $atualizacoes = $this->verificar_atualizacoes_disponiveis();
        
        // Obter histórico de atualizações
        $historico = get_option('acucaradas_atualizacao_historico', array());
        
        // Limitar histórico aos últimos 20 itens
        $historico = array_slice($historico, -20);
        
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <div class="notice notice-info">
                <p><strong>Importante:</strong> Manter seu site atualizado é uma das medidas de segurança mais importantes. Atualizações frequentemente corrigem vulnerabilidades de segurança.</p>
            </div>
            
            <h2 class="nav-tab-wrapper">
                <a href="#configuracoes" class="nav-tab nav-tab-active">Configurações</a>
                <a href="#atualizacoes" class="nav-tab">Atualizações Disponíveis</a>
                <a href="#historico" class="nav-tab">Histórico de Atualizações</a>
            </h2>
            
            <div id="configuracoes" class="tab-content">
                <form action="options.php" method="post">
                    <?php
                    settings_fields('acucaradas_atualizacao');
                    do_settings_sections('acucaradas-atualizacao');
                    submit_button('Salvar Configurações');
                    ?>
                </form>
            </div>
            
            <div id="atualizacoes" class="tab-content" style="display: none;">
                <h2>Atualizações Disponíveis</h2>
                
                <?php if (empty($atualizacoes['plugins']) && empty($atualizacoes['temas']) && empty($atualizacoes['wordpress'])) : ?>
                    <p>Não há atualizações disponíveis no momento. Tudo está atualizado!</p>
                <?php else : ?>
                    <form method="post" action="">
                        <?php wp_nonce_field('acucaradas_atualizar_itens', 'acucaradas_atualizar_nonce'); ?>
                        
                        <?php if (!empty($atualizacoes['wordpress'])) : ?>
                            <h3>WordPress</h3>
                            <table class="wp-list-table widefat fixed striped">
                                <thead>
                                    <tr>
                                        <th scope="col" class="manage-column column-cb check-column">
                                            <input type="checkbox" id="cb-select-all-wordpress">
                                        </th>
                                        <th>Versão Atual</th>
                                        <th>Nova Versão</th>
                                        <th>Tipo de Atualização</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <th scope="row" class="check-column">
                                            <input type="checkbox" name="atualizar_wordpress" value="1">
                                        </th>
                                        <td><?php echo esc_html($atualizacoes['wordpress']['versao_atual']); ?></td>
                                        <td><?php echo esc_html($atualizacoes['wordpress']['nova_versao']); ?></td>
                                        <td>
                                            <?php 
                                            if ($atualizacoes['wordpress']['tipo'] === 'security') {
                                                echo '<span class="atualizar-seguranca">Atualização de Segurança</span>';
                                            } else {
                                                echo 'Atualização Regular';
                                            }
                                            ?>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        <?php endif; ?>
                        
                        <?php if (!empty($atualizacoes['plugins'])) : ?>
                            <h3>Plugins</h3>
                            <table class="wp-list-table widefat fixed striped">
                                <thead>
                                    <tr>
                                        <th scope="col" class="manage-column column-cb check-column">
                                            <input type="checkbox" id="cb-select-all-plugins">
                                        </th>
                                        <th>Plugin</th>
                                        <th>Versão Atual</th>
                                        <th>Nova Versão</th>
                                        <th>Tipo de Atualização</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($atualizacoes['plugins'] as $plugin_file => $plugin) : ?>
                                        <tr>
                                            <th scope="row" class="check-column">
                                                <input type="checkbox" name="atualizar_plugins[]" value="<?php echo esc_attr($plugin_file); ?>">
                                            </th>
                                            <td><?php echo esc_html($plugin['Name']); ?></td>
                                            <td><?php echo esc_html($plugin['Version']); ?></td>
                                            <td><?php echo esc_html($plugin['new_version']); ?></td>
                                            <td>
                                                <?php 
                                                if (isset($plugin['tipo']) && $plugin['tipo'] === 'security') {
                                                    echo '<span class="atualizar-seguranca">Atualização de Segurança</span>';
                                                } else {
                                                    echo 'Atualização Regular';
                                                }
                                                ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        <?php endif; ?>
                        
                        <?php if (!empty($atualizacoes['temas'])) : ?>
                            <h3>Temas</h3>
                            <table class="wp-list-table widefat fixed striped">
                                <thead>
                                    <tr>
                                        <th scope="col" class="manage-column column-cb check-column">
                                            <input type="checkbox" id="cb-select-all-temas">
                                        </th>
                                        <th>Tema</th>
                                        <th>Versão Atual</th>
                                        <th>Nova Versão</th>
                                        <th>Tipo de Atualização</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($atualizacoes['temas'] as $tema_slug => $tema) : ?>
                                        <tr>
                                            <th scope="row" class="check-column">
                                                <input type="checkbox" name="atualizar_temas[]" value="<?php echo esc_attr($tema_slug); ?>">
                                            </th>
                                            <td><?php echo esc_html($tema['name']); ?></td>
                                            <td><?php echo esc_html($tema['version']); ?></td>
                                            <td><?php echo esc_html($tema['new_version']); ?></td>
                                            <td>
                                                <?php 
                                                if (isset($tema['tipo']) && $tema['tipo'] === 'security') {
                                                    echo '<span class="atualizar-seguranca">Atualização de Segurança</span>';
                                                } else {
                                                    echo 'Atualização Regular';
                                                }
                                                ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        <?php endif; ?>
                        
                        <?php submit_button('Atualizar Itens Selecionados', 'primary', 'acucaradas_atualizar_itens'); ?>
                    </form>
                <?php endif; ?>
                
                <p>
                    <button id="verificar-atualizacoes" class="button button-secondary">Verificar Novamente</button>
                </p>
            </div>
            
            <div id="historico" class="tab-content" style="display: none;">
                <h2>Histórico de Atualizações</h2>
                
                <?php if (empty($historico)) : ?>
                    <p>Nenhuma atualização foi realizada ainda.</p>
                <?php else : ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Item</th>
                                <th>Tipo</th>
                                <th>Versão Anterior</th>
                                <th>Nova Versão</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($historico as $item) : ?>
                                <tr>
                                    <td><?php echo esc_html(date('d/m/Y H:i', $item['timestamp'])); ?></td>
                                    <td><?php echo esc_html($item['nome']); ?></td>
                                    <td><?php echo esc_html(ucfirst($item['tipo'])); ?></td>
                                    <td><?php echo esc_html($item['versao_anterior']); ?></td>
                                    <td><?php echo esc_html($item['nova_versao']); ?></td>
                                    <td>
                                        <?php 
                                        if ($item['status'] === 'sucesso') {
                                            echo '<span class="status-sucesso">Sucesso</span>';
                                        } else {
                                            echo '<span class="status-erro">Erro</span>';
                                            if (!empty($item['mensagem_erro'])) {
                                                echo ' <a href="#" class="mostrar-erro" data-erro="' . esc_attr($item['mensagem_erro']) . '">Ver detalhes</a>';
                                            }
                                        }
                                        ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        
        <div id="erro-dialog" title="Detalhes do Erro" style="display: none;"></div>
        <?php
    }
    
    /**
     * Adicionar scripts e estilos
     */
    public function adicionar_scripts($hook) {
        if ($hook !== 'tools_page_acucaradas-atualizacao') {
            return;
        }
        
        wp_enqueue_style('wp-jquery-ui-dialog');
        wp_enqueue_script('jquery-ui-dialog');
        
        wp_enqueue_script(
            'acucaradas-atualizacao',
            plugin_dir_url(__FILE__) . 'js/atualizacao.js',
            array('jquery', 'jquery-ui-dialog'),
            '1.0.0',
            true
        );
        
        wp_localize_script(
            'acucaradas-atualizacao',
            'acucaradasAtualizacao',
            array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('acucaradas_atualizacao_ajax'),
                'verificandoAtualizacoes' => 'Verificando atualizações...',
                'atualizacoesVerificadas' => 'Atualizações verificadas com sucesso!',
                'erroVerificarAtualizacoes' => 'Erro ao verificar atualizações.',
                'ignorandoNotificacao' => 'Ignorando notificação...',
                'notificacaoIgnorada' => 'Notificação ignorada com sucesso!',
                'erroIgnorarNotificacao' => 'Erro ao ignorar notificação.'
            )
        );
        
        wp_add_inline_style('wp-admin', '
            .tab-content { margin-top: 20px; }
            .atualizar-seguranca { color: #d54e21; font-weight: bold; }
            .status-sucesso { color: #46b450; }
            .status-erro { color: #dc3232; }
            .mostrar-erro { cursor: pointer; }
            .ui-dialog { z-index: 100000 !important; }
        ');
    }
    
    /**
     * Verificar atualizações disponíveis
     */
    public function verificar_atualizacoes_disponiveis() {
        $atualizacoes = array(
            'plugins' => array(),
            'temas' => array(),
            'wordpress' => array()
        );
        
        // Forçar verificação de atualizações
        wp_update_plugins();
        wp_update_themes();
        wp_version_check();
        
        // Verificar atualizações de plugins
        $plugins_atualizacoes = get_site_transient('update_plugins');
        if ($plugins_atualizacoes && !empty($plugins_atualizacoes->response)) {
            $plugins_instalados = get_plugins();
            
            foreach ($plugins_atualizacoes->response as $plugin_file => $plugin_data) {
                if (isset($plugins_instalados[$plugin_file])) {
                    $plugin_info = $plugins_instalados[$plugin_file];
                    $plugin_info['new_version'] = $plugin_data->new_version;
                    
                    // Verificar se é uma atualização de segurança
                    $plugin_info['tipo'] = $this->verificar_tipo_atualizacao('plugin', $plugin_data);
                    
                    $atualizacoes['plugins'][$plugin_file] = $plugin_info;
                }
            }
        }
        
        // Verificar atualizações de temas
        $temas_atualizacoes = get_site_transient('update_themes');
        if ($temas_atualizacoes && !empty($temas_atualizacoes->response)) {
            $temas_instalados = wp_get_themes();
            
            foreach ($temas_atualizacoes->response as $tema_slug => $tema_data) {
                if (isset($temas_instalados[$tema_slug])) {
                    $tema_info = array(
                        'name' => $temas_instalados[$tema_slug]->get('Name'),
                        'version' => $temas_instalados[$tema_slug]->get('Version'),
                        'new_version' => $tema_data['new_version']
                    );
                    
                    // Verificar se é uma atualização de segurança
                    $tema_info['tipo'] = $this->verificar_tipo_atualizacao('tema', $tema_data);
                    
                    $atualizacoes['temas'][$tema_slug] = $tema_info;
                }
            }
        }
        
        // Verificar atualizações do WordPress
        $core_atualizacoes = get_site_transient('update_core');
        if ($core_atualizacoes && !empty($core_atualizacoes->updates)) {
            foreach ($core_atualizacoes->updates as $update) {
                if ($update->response === 'upgrade') {
                    $atualizacoes['wordpress'] = array(
                        'versao_atual' => get_bloginfo('version'),
                        'nova_versao' => $update->version,
                        'tipo' => $this->verificar_tipo_atualizacao('core', $update)
                    );
                    break;
                }
            }
        }
        
        return $atualizacoes;
    }
    
    /**
     * Verificar tipo de atualização (segurança ou regular)
     */
    private function verificar_tipo_atualizacao($tipo, $dados) {
        // Verificar se é uma atualização de segurança
        // Isso é uma simplificação, na prática seria necessário analisar o changelog
        // ou consultar APIs específicas para determinar se é uma atualização de segurança
        
        if ($tipo === 'plugin') {
            // Verificar se o plugin tem informações sobre segurança
            if (isset($dados->is_security_update) && $dados->is_security_update) {
                return 'security';
            }
            
            // Verificar se a descrição da atualização menciona segurança
            if (isset($dados->upgrade_notice) && 
                (strpos(strtolower($dados->upgrade_notice), 'security') !== false || 
                 strpos(strtolower($dados->upgrade_notice), 'segurança') !== false ||
                 strpos(strtolower($dados->upgrade_notice), 'vulnerability') !== false ||
                 strpos(strtolower($dados->upgrade_notice), 'vulnerabilidade') !== false)) {
                return 'security';
            }
        } elseif ($tipo === 'tema') {
            // Para temas, é mais difícil determinar se é uma atualização de segurança
            // sem informações adicionais
        } elseif ($tipo === 'core') {
            // Para o core, verificar se é uma versão de segurança (x.y.z)
            $versao_atual = get_bloginfo('version');
            $partes_atual = explode('.', $versao_atual);
            $partes_nova = explode('.', $dados->version);
            
            // Se for uma atualização de terceiro nível (x.y.z), geralmente é de segurança
            if (count($partes_atual) >= 3 && count($partes_nova) >= 3 && 
                $partes_atual[0] === $partes_nova[0] && $partes_atual[1] === $partes_nova[1]) {
                return 'security';
            }
        }
        
        return 'regular';
    }
    
    /**
     * Executar atualizações automáticas
     */
    public function executar_atualizacoes_automaticas() {
        $opcoes = get_option('acucaradas_atualizacao_config', array());
        $apenas_seguranca = isset($opcoes['apenas_seguranca']) && $opcoes['apenas_seguranca'];
        $historico = get_option('acucaradas_atualizacao_historico', array());
        $atualizacoes_realizadas = array();
        
        // Verificar atualizações disponíveis
        $atualizacoes = $this->verificar_atualizacoes_disponiveis();
        
        // Atualizar plugins
        if (isset($opcoes['atualizar_plugins']) && $opcoes['atualizar_plugins'] && !empty($atualizacoes['plugins'])) {
            $plugins_excluidos = isset($opcoes['plugins_excluidos']) ? $opcoes['plugins_excluidos'] : array();
            
            foreach ($atualizacoes['plugins'] as $plugin_file => $plugin) {
                // Verificar se o plugin está na lista de exclusão
                if (in_array($plugin_file, $plugins_excluidos)) {
                    continue;
                }
                
                // Verificar se deve atualizar apenas atualizações de segurança
                if ($apenas_seguranca && (!isset($plugin['tipo']) || $plugin['tipo'] !== 'security')) {
                    continue;
                }
                
                // Atualizar plugin
                include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
                include_once ABSPATH . 'wp-admin/includes/plugin-install.php';
                
                $upgrader = new Plugin_Upgrader(new Automatic_Upgrader_Skin());
                $resultado = $upgrader->upgrade($plugin_file);
                
                // Registrar no histórico
                $historico[] = array(
                    'timestamp' => time(),
                    'tipo' => 'plugin',
                    'nome' => $plugin['Name'],
                    'versao_anterior' => $plugin['Version'],
                    'nova_versao' => $plugin['new_version'],
                    'status' => $resultado ? 'sucesso' : 'erro',
                    'mensagem_erro' => $resultado ? '' : $upgrader->skin->get_upgrade_messages()
                );
                
                if ($resultado) {
                    $atualizacoes_realizadas[] = array(
                        'tipo' => 'plugin',
                        'nome' => $plugin['Name'],
                        'versao' => $plugin['new_version']
                    );
                }
            }
        }
        
        // Atualizar temas
        if (isset($opcoes['atualizar_temas']) && $opcoes['atualizar_temas'] && !empty($atualizacoes['temas'])) {
            $temas_excluidos = isset($opcoes['temas_excluidos']) ? $opcoes['temas_excluidos'] : array();
            
            foreach ($atualizacoes['temas'] as $tema_slug => $tema) {
                // Verificar se o tema está na lista de exclusão
                if (in_array($tema_slug, $temas_excluidos)) {
                    continue;
                }
                
                // Verificar se deve atualizar apenas atualizações de segurança
                if ($apenas_seguranca && (!isset($tema['tipo']) || $tema['tipo'] !== 'security')) {
                    continue;
                }
                
                // Atualizar tema
                include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
                include_once ABSPATH . 'wp-admin/includes/theme-install.php';
                
                $upgrader = new Theme_Upgrader(new Automatic_Upgrader_Skin());
                $resultado = $upgrader->upgrade($tema_slug);
                
                // Registrar no histórico
                $historico[] = array(
                    'timestamp' => time(),
                    'tipo' => 'tema',
                    'nome' => $tema['name'],
                    'versao_anterior' => $tema['version'],
                    'nova_versao' => $tema['new_version'],
                    'status' => $resultado ? 'sucesso' : 'erro',
                    'mensagem_erro' => $resultado ? '' : $upgrader->skin->get_upgrade_messages()
                );
                
                if ($resultado) {
                    $atualizacoes_realizadas[] = array(
                        'tipo' => 'tema',
                        'nome' => $tema['name'],
                        'versao' => $tema['new_version']
                    );
                }
            }
        }
        
        // Atualizar WordPress
        if (isset($opcoes['atualizar_wordpress']) && $opcoes['atualizar_wordpress'] && !empty($atualizacoes['wordpress'])) {
            // Verificar se deve atualizar apenas atualizações de segurança
            if (!$apenas_seguranca || (isset($atualizacoes['wordpress']['tipo']) && $atualizacoes['wordpress']['tipo'] === 'security')) {
                // Atualizar WordPress
                include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
                include_once ABSPATH . 'wp-admin/includes/update-core.php';
                
                $upgrader = new Core_Upgrader(new Automatic_Upgrader_Skin());
                $resultado = $upgrader->upgrade($atualizacoes['wordpress']['nova_versao']);
                
                // Registrar no histórico
                $historico[] = array(
                    'timestamp' => time(),
                    'tipo' => 'wordpress',
                    'nome' => 'WordPress',
                    'versao_anterior' => $atualizacoes['wordpress']['versao_atual'],
                    'nova_versao' => $atualizacoes['wordpress']['nova_versao'],
                    'status' => $resultado ? 'sucesso' : 'erro',
                    'mensagem_erro' => $resultado ? '' : $upgrader->skin->get_upgrade_messages()
                );
                
                if ($resultado) {
                    $atualizacoes_realizadas[] = array(
                        'tipo' => 'wordpress',
                        'nome' => 'WordPress',
                        'versao' => $atualizacoes['wordpress']['nova_versao']
                    );
                }
            }
        }
        
        // Salvar histórico
        update_option('acucaradas_atualizacao_historico', $historico);
        
        // Enviar e-mail de notificação se houver atualizações realizadas
        if (!empty($atualizacoes_realizadas)) {
            $this->enviar_email_atualizacoes($atualizacoes_realizadas);
        }
    }
    
    /**
     * Verificar atualizações pendentes
     */
    public function verificar_atualizacoes_pendentes() {
        // Verificar se o usuário é administrador
        if (!current_user_can('update_plugins')) {
            return;
        }
        
        // Verificar se já verificou hoje
        $ultima_verificacao = get_option('acucaradas_ultima_verificacao', 0);
        if (time() - $ultima_verificacao < 86400) { // 24 horas
            return;
        }
        
        // Verificar atualizações disponíveis
        $atualizacoes = $this->verificar_atualizacoes_disponiveis();
        
        // Contar atualizações de segurança
        $total_seguranca = 0;
        
        if (!empty($atualizacoes['wordpress']) && isset($atualizacoes['wordpress']['tipo']) && $atualizacoes['wordpress']['tipo'] === 'security') {
            $total_seguranca++;
        }
        
        foreach ($atualizacoes['plugins'] as $plugin) {
            if (isset($plugin['tipo']) && $plugin['tipo'] === 'security') {
                $total_seguranca++;
            }
        }
        
        foreach ($atualizacoes['temas'] as $tema) {
            if (isset($tema['tipo']) && $tema['tipo'] === 'security') {
                $total_seguranca++;
            }
        }
        
        // Salvar informações para notificação
        update_option('acucaradas_atualizacoes_pendentes', array(
            'total' => count($atualizacoes['plugins']) + count($atualizacoes['temas']) + (!empty($atualizacoes['wordpress']) ? 1 : 0),
            'seguranca' => $total_seguranca,
            'timestamp' => time()
        ));
        
        // Atualizar data da última verificação
        update_option('acucaradas_ultima_verificacao', time());
    }
    
    /**
     * Exibir notificações no painel administrativo
     */
    public function exibir_notificacoes_admin() {
        // Verificar se o usuário é administrador
        if (!current_user_can('update_plugins')) {
            return;
        }
        
        // Verificar se há atualizações pendentes
        $atualizacoes_pendentes = get_option('acucaradas_atualizacoes_pendentes', array());
        
        if (empty($atualizacoes_pendentes) || empty($atualizacoes_pendentes['total'])) {
            return;
        }
        
        // Verificar se a notificação foi ignorada
        $notificacoes_ignoradas = get_option('acucaradas_notificacoes_ignoradas', array());
        
        if (isset($notificacoes_ignoradas[$atualizacoes_pendentes['timestamp']])) {
            return;
        }
        
        // Exibir notificação
        $classe = $atualizacoes_pendentes['seguranca'] > 0 ? 'notice-error' : 'notice-warning';
        $mensagem = $atualizacoes_pendentes['seguranca'] > 0 ?
            sprintf(_n('Há %d atualização de segurança pendente!', 'Há %d atualizações de segurança pendentes!', $atualizacoes_pendentes['seguranca'], 'acucaradas-atualizacao'), $atualizacoes_pendentes['seguranca']) :
            sprintf(_n('Há %d atualização pendente.', 'Há %d atualizações pendentes.', $atualizacoes_pendentes['total'], 'acucaradas-atualizacao'), $atualizacoes_pendentes['total']);
        
        ?>
        <div class="notice <?php echo esc_attr($classe); ?> is-dismissible acucaradas-notificacao" data-timestamp="<?php echo esc_attr($atualizacoes_pendentes['timestamp']); ?>">
            <p>
                <strong><?php echo esc_html($mensagem); ?></strong>
                <a href="<?php echo esc_url(admin_url('tools.php?page=acucaradas-atualizacao#atualizacoes')); ?>" class="button button-small"><?php esc_html_e('Ver atualizações', 'acucaradas-atualizacao'); ?></a>
            </p>
        </div>
        <script>
        jQuery(document).ready(function($) {
            $('.acucaradas-notificacao .notice-dismiss').on('click', function() {
                var $notice = $(this).closest('.acucaradas-notificacao');
                var timestamp = $notice.data('timestamp');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'acucaradas_ignorar_notificacao',
                        timestamp: timestamp,
                        nonce: '<?php echo wp_create_nonce('acucaradas_ignorar_notificacao'); ?>'
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * AJAX: Ignorar notificação
     */
    public function ajax_ignorar_notificacao() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'acucaradas_ignorar_notificacao')) {
            wp_send_json_error('Nonce inválido.');
        }
        
        // Verificar timestamp
        if (!isset($_POST['timestamp'])) {
            wp_send_json_error('Timestamp não fornecido.');
        }
        
        $timestamp = intval($_POST['timestamp']);
        $notificacoes_ignoradas = get_option('acucaradas_notificacoes_ignoradas', array());
        $notificacoes_ignoradas[$timestamp] = time();
        
        update_option('acucaradas_notificacoes_ignoradas', $notificacoes_ignoradas);
        
        wp_send_json_success();
    }
    
    /**
     * Enviar e-mail de notificação de atualizações
     */
    private function enviar_email_atualizacoes($atualizacoes) {
        $opcoes = get_option('acucaradas_atualizacao_config', array());
        $email = isset($opcoes['email_notificacao']) ? $opcoes['email_notificacao'] : get_option('admin_email');
        
        $assunto = sprintf('[%s] Atualizações automáticas realizadas', get_bloginfo('name'));
        
        $corpo = '<h2>Atualizações automáticas realizadas</h2>';
        $corpo .= '<p>As seguintes atualizações foram realizadas automaticamente em seu site:</p>';
        $corpo .= '<ul>';
        
        foreach ($atualizacoes as $atualizacao) {
            $corpo .= '<li>';
            $corpo .= '<strong>' . esc_html($atualizacao['nome']) . '</strong>: ';
            $corpo .= 'Atualizado para a versão ' . esc_html($atualizacao['versao']);
            $corpo .= '</li>';
        }
        
        $corpo .= '</ul>';
        $corpo .= '<p>Acesse o <a href="' . esc_url(admin_url('tools.php?page=acucaradas-atualizacao#historico')) . '">histórico de atualizações</a> para mais detalhes.</p>';
        
        $headers = array('Content-Type: text/html; charset=UTF-8');
        
        wp_mail($email, $assunto, $corpo, $headers);
    }
}

// Inicializar o plugin
$acucaradas_atualizacao = new AcucaradasAtualizacao();

// Criar arquivo JavaScript para o plugin
function acucaradas_criar_arquivo_js() {
    $js_dir = plugin_dir_path(__FILE__) . 'js';
    
    if (!file_exists($js_dir)) {
        mkdir($js_dir, 0755, true);
    }
    
    $js_file = $js_dir . '/atualizacao.js';
    
    if (!file_exists($js_file)) {
        $js_content = "jQuery(document).ready(function($) {\n";
        $js_content .= "    // Navegação por abas\n";
        $js_content .= "    $('.nav-tab').on('click', function(e) {\n";
        $js_content .= "        e.preventDefault();\n";
        $js_content .= "        var target = $(this).attr('href');\n";
        $js_content .= "        \n";
        $js_content .= "        // Ativar aba\n";
        $js_content .= "        $('.nav-tab').removeClass('nav-tab-active');\n";
        $js_content .= "        $(this).addClass('nav-tab-active');\n";
        $js_content .= "        \n";
        $js_content .= "        // Mostrar conteúdo\n";
        $js_content .= "        $('.tab-content').hide();\n";
        $js_content .= "        $(target).show();\n";
        $js_content .= "    });\n";
        $js_content .= "    \n";
        $js_content .= "    // Verificar atualizações\n";
        $js_content .= "    $('#verificar-atualizacoes').on('click', function() {\n";
        $js_content .= "        var $button = $(this);\n";
        $js_content .= "        var originalText = $button.text();\n";
        $js_content .= "        \n";
        $js_content .= "        $button.text(acucaradasAtualizacao.verificandoAtualizacoes).prop('disabled', true);\n";
        $js_content .= "        \n";
        $js_content .= "        $.ajax({\n";
        $js_content .= "            url: acucaradasAtualizacao.ajaxUrl,\n";
        $js_content .= "            type: 'POST',\n";
        $js_content .= "            data: {\n";
        $js_content .= "                action: 'acucaradas_verificar_atualizacoes',\n";
        $js_content .= "                nonce: acucaradasAtualizacao.nonce\n";
        $js_content .= "            },\n";
        $js_content .= "            success: function(response) {\n";
        $js_content .= "                if (response.success) {\n";
        $js_content .= "                    alert(acucaradasAtualizacao.atualizacoesVerificadas);\n";
        $js_content .= "                    location.reload();\n";
        $js_content .= "                } else {\n";
        $js_content .= "                    alert(acucaradasAtualizacao.erroVerificarAtualizacoes);\n";
        $js_content .= "                }\n";
        $js_content .= "            },\n";
        $js_content .= "            error: function() {\n";
        $js_content .= "                alert(acucaradasAtualizacao.erroVerificarAtualizacoes);\n";
        $js_content .= "            },\n";
        $js_content .= "            complete: function() {\n";
        $js_content .= "                $button.text(originalText).prop('disabled', false);\n";
        $js_content .= "            }\n";
        $js_content .= "        });\n";
        $js_content .= "    });\n";
        $js_content .= "    \n";
        $js_content .= "    // Selecionar todos os checkboxes\n";
        $js_content .= "    $('#cb-select-all-wordpress').on('change', function() {\n";
        $js_content .= "        $('input[name="atualizar_wordpress"]').prop('checked', $(this).prop('checked'));\n";
        $js_content .= "    });\n";
        $js_content .= "    \n";
        $js_content .= "    $('#cb-select-all-plugins').on('change', function() {\n";
        $js_content .= "        $('input[name="atualizar_plugins[]"]').prop('checked', $(this).prop('checked'));\n";
        $js_content .= "    });\n";
        $js_content .= "    \n";
        $js_content .= "    $('#cb-select-all-temas').on('change', function() {\n";
        $js_content .= "        $('input[name="atualizar_temas[]"]').prop('checked', $(this).prop('checked'));\n";
        $js_content .= "    });\n";
        $js_content .= "    \n";
        $js_content .= "    // Mostrar detalhes do erro\n";
        $js_content .= "    $('.mostrar-erro').on('click', function(e) {\n";
        $js_content .= "        e.preventDefault();\n";
        $js_content .= "        \n";
        $js_content .= "        var erro = $(this).data('erro');\n";
        $js_content .= "        \n";
        $js_content .= "        $('#erro-dialog').html(erro).dialog({\n";
        $js_content .= "            modal: true,\n";
        $js_content .= "            width: 500,\n";
        $js_content .= "            height: 300,\n";
        $js_content .= "            buttons: {\n";
        $js_content .= "                Fechar: function() {\n";
        $js_content .= "                    $(this).dialog('close');\n";
        $js_content .= "                }\n";
        $js_content .= "            }\n";
        $js_content .= "        });\n";
        $js_content .= "    });\n";
        $js_content .= "});";
        
        file_put_contents($js_file, $js_content);
    }
}

register_activation_hook(__FILE__, 'acucaradas_criar_arquivo_js');