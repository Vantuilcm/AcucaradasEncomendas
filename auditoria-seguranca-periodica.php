<?php
/**
 * Plugin Name: Acucaradas - Auditoria de Segurança Periódica
 * Description: Implementa auditorias de segurança periódicas automatizadas para o site Acucaradas Encomendas
 * Version: 1.0.0
 * Author: Equipe de Segurança
 */

// Evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

class AcucaradasAuditoria {
    // Tabela para armazenar resultados de auditorias
    private $tabela_auditorias;
    
    // Tabela para armazenar detalhes de vulnerabilidades
    private $tabela_vulnerabilidades;
    
    // Construtor
    public function __construct() {
        global $wpdb;
        
        // Definir nomes das tabelas
        $this->tabela_auditorias = $wpdb->prefix . 'security_audits';
        $this->tabela_vulnerabilidades = $wpdb->prefix . 'security_vulnerabilities';
        
        // Hooks de inicialização
        register_activation_hook(__FILE__, array($this, 'ativar'));
        add_action('admin_menu', array($this, 'adicionar_menu'));
        add_action('admin_enqueue_scripts', array($this, 'carregar_assets'));
        
        // Hooks para AJAX
        add_action('wp_ajax_iniciar_auditoria', array($this, 'ajax_iniciar_auditoria'));
        add_action('wp_ajax_obter_resultados_auditoria', array($this, 'ajax_obter_resultados_auditoria'));
        add_action('wp_ajax_obter_detalhes_vulnerabilidade', array($this, 'ajax_obter_detalhes_vulnerabilidade'));
        add_action('wp_ajax_marcar_vulnerabilidade_resolvida', array($this, 'ajax_marcar_vulnerabilidade_resolvida'));
        
        // Agendamento de auditorias automáticas
        add_action('auditoria_seguranca_cron', array($this, 'executar_auditoria_automatica'));
        
        // Verificar se o cron está agendado
        if (!wp_next_scheduled('auditoria_seguranca_cron')) {
            wp_schedule_event(time(), 'weekly', 'auditoria_seguranca_cron');
        }
    }
    
    /**
     * Ativar o plugin
     */
    public function ativar() {
        // Criar tabelas no banco de dados
        $this->criar_tabelas();
        
        // Agendar primeira auditoria
        if (!wp_next_scheduled('auditoria_seguranca_cron')) {
            wp_schedule_event(time(), 'weekly', 'auditoria_seguranca_cron');
        }
    }
    
    /**
     * Criar tabelas no banco de dados
     */
    private function criar_tabelas() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabela de auditorias
        $sql_auditorias = "CREATE TABLE {$this->tabela_auditorias} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            timestamp datetime NOT NULL,
            tipo varchar(50) NOT NULL,
            status varchar(20) NOT NULL,
            pontuacao_seguranca int NOT NULL,
            total_vulnerabilidades int NOT NULL,
            alta_severidade int NOT NULL,
            media_severidade int NOT NULL,
            baixa_severidade int NOT NULL,
            info_severidade int NOT NULL,
            duracao int NOT NULL,
            iniciado_por varchar(100) NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        
        // Tabela de vulnerabilidades
        $sql_vulnerabilidades = "CREATE TABLE {$this->tabela_vulnerabilidades} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            auditoria_id mediumint(9) NOT NULL,
            tipo varchar(100) NOT NULL,
            titulo varchar(255) NOT NULL,
            descricao text NOT NULL,
            severidade varchar(20) NOT NULL,
            localizacao text,
            recomendacao text NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pendente',
            data_identificacao datetime NOT NULL,
            data_resolucao datetime,
            PRIMARY KEY  (id),
            KEY auditoria_id (auditoria_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_auditorias);
        dbDelta($sql_vulnerabilidades);
    }
    
    /**
     * Adicionar menu no painel administrativo
     */
    public function adicionar_menu() {
        add_menu_page(
            'Auditoria de Segurança',
            'Auditoria de Segurança',
            'manage_options',
            'auditoria-seguranca',
            array($this, 'pagina_principal'),
            'dashicons-shield',
            30
        );
        
        add_submenu_page(
            'auditoria-seguranca',
            'Histórico de Auditorias',
            'Histórico',
            'manage_options',
            'auditoria-historico',
            array($this, 'pagina_historico')
        );
        
        add_submenu_page(
            'auditoria-seguranca',
            'Vulnerabilidades',
            'Vulnerabilidades',
            'manage_options',
            'auditoria-vulnerabilidades',
            array($this, 'pagina_vulnerabilidades')
        );
        
        add_submenu_page(
            'auditoria-seguranca',
            'Configurações',
            'Configurações',
            'manage_options',
            'auditoria-configuracoes',
            array($this, 'pagina_configuracoes')
        );
    }
    
    /**
     * Carregar assets (CSS e JS)
     */
    public function carregar_assets($hook) {
        // Verificar se estamos em uma página do plugin
        if (strpos($hook, 'auditoria-seguranca') === false) {
            return;
        }
        
        // Registrar e enfileirar estilos e scripts
        wp_enqueue_style('auditoria-css', plugin_dir_url(__FILE__) . 'assets/css/auditoria.css', array(), '1.0.0');
        wp_enqueue_script('chart-js', 'https://cdn.jsdelivr.net/npm/chart.js', array(), '3.7.0', true);
        wp_enqueue_script('auditoria-js', plugin_dir_url(__FILE__) . 'assets/js/auditoria.js', array('jquery', 'chart-js'), '1.0.0', true);
        
        // Passar variáveis para o JavaScript
        wp_localize_script('auditoria-js', 'auditoria_vars', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('auditoria_seguranca_nonce')
        ));
    }
    
    /**
     * Página principal do plugin
     */
    public function pagina_principal() {
        global $wpdb;
        
        // Obter última auditoria
        $ultima_auditoria = $wpdb->get_row("SELECT * FROM {$this->tabela_auditorias} ORDER BY id DESC LIMIT 1");
        
        // Obter estatísticas gerais
        $total_vulnerabilidades = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE status = 'pendente'");
        $alta_severidade = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE status = 'pendente' AND severidade = 'alta'");
        $media_severidade = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE status = 'pendente' AND severidade = 'media'");
        $baixa_severidade = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE status = 'pendente' AND severidade = 'baixa'");
        
        ?>
        <div class="wrap">
            <h1>Auditoria de Segurança</h1>
            
            <div class="auditoria-dashboard">
                <div class="auditoria-card">
                    <h2>Status de Segurança</h2>
                    
                    <?php if ($ultima_auditoria) : ?>
                        <div class="pontuacao-seguranca">
                            <div class="pontuacao-valor <?php echo $this->obter_classe_pontuacao($ultima_auditoria->pontuacao_seguranca); ?>">
                                <?php echo esc_html($ultima_auditoria->pontuacao_seguranca); ?>
                            </div>
                            <div class="pontuacao-texto">Pontuação de Segurança</div>
                        </div>
                        
                        <div class="ultima-auditoria">
                            <p>Última auditoria: <?php echo date('d/m/Y H:i', strtotime($ultima_auditoria->timestamp)); ?></p>
                            <p>Tipo: <?php echo esc_html(ucfirst($ultima_auditoria->tipo)); ?></p>
                            <p>Status: <?php echo esc_html(ucfirst($ultima_auditoria->status)); ?></p>
                        </div>
                    <?php else : ?>
                        <p>Nenhuma auditoria realizada ainda.</p>
                    <?php endif; ?>
                    
                    <button id="iniciar-auditoria" class="button button-primary">Iniciar Nova Auditoria</button>
                </div>
                
                <div class="auditoria-card">
                    <h2>Vulnerabilidades Pendentes</h2>
                    
                    <div class="vulnerabilidades-resumo">
                        <div class="vulnerabilidade-contador total">
                            <span class="contador"><?php echo esc_html($total_vulnerabilidades); ?></span>
                            <span class="label">Total</span>
                        </div>
                        
                        <div class="vulnerabilidade-contador alta">
                            <span class="contador"><?php echo esc_html($alta_severidade); ?></span>
                            <span class="label">Alta</span>
                        </div>
                        
                        <div class="vulnerabilidade-contador media">
                            <span class="contador"><?php echo esc_html($media_severidade); ?></span>
                            <span class="label">Média</span>
                        </div>
                        
                        <div class="vulnerabilidade-contador baixa">
                            <span class="contador"><?php echo esc_html($baixa_severidade); ?></span>
                            <span class="label">Baixa</span>
                        </div>
                    </div>
                    
                    <a href="<?php echo admin_url('admin.php?page=auditoria-vulnerabilidades'); ?>" class="button">Ver Todas as Vulnerabilidades</a>
                </div>
            </div>
            
            <div class="auditoria-progresso" style="display: none;">
                <h2>Auditoria em Andamento</h2>
                <div class="progresso-container">
                    <div class="progresso-barra">
                        <div class="progresso-valor" style="width: 0%;"></div>
                    </div>
                    <div class="progresso-texto">0%</div>
                </div>
                <div class="progresso-etapa">Iniciando auditoria...</div>
            </div>
            
            <div class="auditoria-resultados" style="display: none;">
                <h2>Resultados da Auditoria</h2>
                
                <div class="resultados-resumo">
                    <div class="resultado-card pontuacao">
                        <h3>Pontuação de Segurança</h3>
                        <div class="pontuacao-valor">0</div>
                    </div>
                    
                    <div class="resultado-card vulnerabilidades">
                        <h3>Vulnerabilidades</h3>
                        <div class="vulnerabilidades-contadores">
                            <div class="contador alta">0 Alta</div>
                            <div class="contador media">0 Média</div>
                            <div class="contador baixa">0 Baixa</div>
                            <div class="contador info">0 Info</div>
                        </div>
                    </div>
                    
                    <div class="resultado-card tempo">
                        <h3>Tempo de Execução</h3>
                        <div class="tempo-valor">0 segundos</div>
                    </div>
                </div>
                
                <div class="resultados-detalhes">
                    <h3>Vulnerabilidades Encontradas</h3>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Tipo</th>
                                <th>Severidade</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="vulnerabilidades-lista">
                            <!-- Preenchido via JavaScript -->
                        </tbody>
                    </table>
                </div>
                
                <div class="resultados-acoes">
                    <a href="<?php echo admin_url('admin.php?page=auditoria-vulnerabilidades'); ?>" class="button button-primary">Ver Todas as Vulnerabilidades</a>
                    <a href="<?php echo admin_url('admin.php?page=auditoria-historico'); ?>" class="button">Ver Histórico de Auditorias</a>
                </div>
            </div>
        </div>
        
        <!-- Modal de detalhes da vulnerabilidade -->
        <div id="modal-vulnerabilidade" class="modal-vulnerabilidade" style="display: none;">
            <div class="modal-conteudo">
                <span class="fechar">&times;</span>
                <h2 id="modal-titulo">Detalhes da Vulnerabilidade</h2>
                
                <div class="modal-corpo">
                    <div class="detalhe">
                        <strong>Tipo:</strong> <span id="modal-tipo"></span>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Severidade:</strong> <span id="modal-severidade"></span>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Descrição:</strong>
                        <div id="modal-descricao"></div>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Localização:</strong>
                        <div id="modal-localizacao"></div>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Recomendação:</strong>
                        <div id="modal-recomendacao"></div>
                    </div>
                </div>
                
                <div class="modal-acoes">
                    <button id="modal-marcar-resolvido" class="button button-primary">Marcar como Resolvido</button>
                    <button class="button fechar-modal">Fechar</button>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Página de histórico de auditorias
     */
    public function pagina_historico() {
        global $wpdb;
        
        // Obter histórico de auditorias
        $auditorias = $wpdb->get_results("SELECT * FROM {$this->tabela_auditorias} ORDER BY id DESC");
        
        ?>
        <div class="wrap">
            <h1>Histórico de Auditorias</h1>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Data/Hora</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Pontuação</th>
                        <th>Vulnerabilidades</th>
                        <th>Duração</th>
                        <th>Iniciado por</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($auditorias)) : ?>
                        <tr>
                            <td colspan="9">Nenhuma auditoria realizada ainda.</td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($auditorias as $auditoria) : ?>
                            <tr>
                                <td><?php echo esc_html($auditoria->id); ?></td>
                                <td><?php echo date('d/m/Y H:i', strtotime($auditoria->timestamp)); ?></td>
                                <td><?php echo esc_html(ucfirst($auditoria->tipo)); ?></td>
                                <td><?php echo esc_html(ucfirst($auditoria->status)); ?></td>
                                <td>
                                    <span class="pontuacao <?php echo $this->obter_classe_pontuacao($auditoria->pontuacao_seguranca); ?>">
                                        <?php echo esc_html($auditoria->pontuacao_seguranca); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="vulnerabilidades-contador">
                                        <span class="alta"><?php echo esc_html($auditoria->alta_severidade); ?></span> / 
                                        <span class="media"><?php echo esc_html($auditoria->media_severidade); ?></span> / 
                                        <span class="baixa"><?php echo esc_html($auditoria->baixa_severidade); ?></span> / 
                                        <span class="info"><?php echo esc_html($auditoria->info_severidade); ?></span>
                                    </span>
                                </td>
                                <td><?php echo esc_html($auditoria->duracao); ?> segundos</td>
                                <td><?php echo esc_html($auditoria->iniciado_por); ?></td>
                                <td>
                                    <a href="<?php echo admin_url('admin.php?page=auditoria-vulnerabilidades&auditoria_id=' . $auditoria->id); ?>" class="button button-small">Ver Detalhes</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
    
    /**
     * Página de vulnerabilidades
     */
    public function pagina_vulnerabilidades() {
        global $wpdb;
        
        // Filtros
        $auditoria_id = isset($_GET['auditoria_id']) ? intval($_GET['auditoria_id']) : 0;
        $severidade = isset($_GET['severidade']) ? sanitize_text_field($_GET['severidade']) : '';
        $status = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';
        
        // Construir consulta
        $where = '1=1';
        $params = array();
        
        if ($auditoria_id) {
            $where .= ' AND auditoria_id = %d';
            $params[] = $auditoria_id;
        }
        
        if ($severidade) {
            $where .= ' AND severidade = %s';
            $params[] = $severidade;
        }
        
        if ($status) {
            $where .= ' AND status = %s';
            $params[] = $status;
        }
        
        // Obter vulnerabilidades
        $vulnerabilidades = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->tabela_vulnerabilidades} WHERE $where ORDER BY data_identificacao DESC",
                $params
            )
        );
        
        // Obter auditorias para o filtro
        $auditorias = $wpdb->get_results("SELECT id, timestamp FROM {$this->tabela_auditorias} ORDER BY id DESC");
        
        ?>
        <div class="wrap">
            <h1>Vulnerabilidades</h1>
            
            <div class="filtros">
                <form method="get" action="">
                    <input type="hidden" name="page" value="auditoria-vulnerabilidades">
                    
                    <select name="auditoria_id">
                        <option value="">Todas as auditorias</option>
                        <?php foreach ($auditorias as $auditoria) : ?>
                            <option value="<?php echo esc_attr($auditoria->id); ?>" <?php selected($auditoria_id, $auditoria->id); ?>>
                                Auditoria #<?php echo esc_html($auditoria->id); ?> (<?php echo date('d/m/Y H:i', strtotime($auditoria->timestamp)); ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                    
                    <select name="severidade">
                        <option value="">Todas as severidades</option>
                        <option value="alta" <?php selected($severidade, 'alta'); ?>>Alta</option>
                        <option value="media" <?php selected($severidade, 'media'); ?>>Média</option>
                        <option value="baixa" <?php selected($severidade, 'baixa'); ?>>Baixa</option>
                        <option value="info" <?php selected($severidade, 'info'); ?>>Informativa</option>
                    </select>
                    
                    <select name="status">
                        <option value="">Todos os status</option>
                        <option value="pendente" <?php selected($status, 'pendente'); ?>>Pendente</option>
                        <option value="resolvido" <?php selected($status, 'resolvido'); ?>>Resolvido</option>
                    </select>
                    
                    <button type="submit" class="button">Filtrar</button>
                </form>
            </div>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Tipo</th>
                        <th>Severidade</th>
                        <th>Status</th>
                        <th>Identificada em</th>
                        <th>Resolvida em</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($vulnerabilidades)) : ?>
                        <tr>
                            <td colspan="8">Nenhuma vulnerabilidade encontrada.</td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($vulnerabilidades as $vulnerabilidade) : ?>
                            <tr>
                                <td><?php echo esc_html($vulnerabilidade->id); ?></td>
                                <td><?php echo esc_html($vulnerabilidade->titulo); ?></td>
                                <td><?php echo esc_html($vulnerabilidade->tipo); ?></td>
                                <td>
                                    <span class="severidade-<?php echo esc_attr($vulnerabilidade->severidade); ?>">
                                        <?php echo esc_html(ucfirst($vulnerabilidade->severidade)); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="status-<?php echo esc_attr($vulnerabilidade->status); ?>">
                                        <?php echo esc_html(ucfirst($vulnerabilidade->status)); ?>
                                    </span>
                                </td>
                                <td><?php echo date('d/m/Y H:i', strtotime($vulnerabilidade->data_identificacao)); ?></td>
                                <td>
                                    <?php echo $vulnerabilidade->data_resolucao ? date('d/m/Y H:i', strtotime($vulnerabilidade->data_resolucao)) : '-'; ?>
                                </td>
                                <td>
                                    <button class="button button-small ver-detalhes" data-id="<?php echo esc_attr($vulnerabilidade->id); ?>">Ver Detalhes</button>
                                    
                                    <?php if ($vulnerabilidade->status === 'pendente') : ?>
                                        <button class="button button-small marcar-resolvido" data-id="<?php echo esc_attr($vulnerabilidade->id); ?>">Marcar Resolvido</button>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <!-- Modal de detalhes da vulnerabilidade -->
        <div id="modal-vulnerabilidade" class="modal-vulnerabilidade" style="display: none;">
            <div class="modal-conteudo">
                <span class="fechar">&times;</span>
                <h2 id="modal-titulo">Detalhes da Vulnerabilidade</h2>
                
                <div class="modal-corpo">
                    <div class="detalhe">
                        <strong>Tipo:</strong> <span id="modal-tipo"></span>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Severidade:</strong> <span id="modal-severidade"></span>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Descrição:</strong>
                        <div id="modal-descricao"></div>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Localização:</strong>
                        <div id="modal-localizacao"></div>
                    </div>
                    
                    <div class="detalhe">
                        <strong>Recomendação:</strong>
                        <div id="modal-recomendacao"></div>
                    </div>
                </div>
                
                <div class="modal-acoes">
                    <button id="modal-marcar-resolvido" class="button button-primary">Marcar como Resolvido</button>
                    <button class="button fechar-modal">Fechar</button>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Página de configurações
     */
    public function pagina_configuracoes() {
        // Salvar configurações
        if (isset($_POST['salvar_configuracoes'])) {
            check_admin_referer('auditoria_configuracoes_nonce');
            
            $configuracoes = array(
                'frequencia_auditoria' => sanitize_text_field($_POST['frequencia_auditoria']),
                'notificar_email' => isset($_POST['notificar_email']) ? 1 : 0,
                'email_notificacao' => sanitize_email($_POST['email_notificacao']),
                'verificar_plugins' => isset($_POST['verificar_plugins']) ? 1 : 0,
                'verificar_temas' => isset($_POST['verificar_temas']) ? 1 : 0,
                'verificar_usuarios' => isset($_POST['verificar_usuarios']) ? 1 : 0,
                'verificar_permissoes' => isset($_POST['verificar_permissoes']) ? 1 : 0,
                'verificar_arquivos' => isset($_POST['verificar_arquivos']) ? 1 : 0,
                'verificar_banco_dados' => isset($_POST['verificar_banco_dados']) ? 1 : 0
            );
            
            update_option('auditoria_seguranca_config', $configuracoes);
            
            // Reagendar cron se a frequência mudou
            $frequencia_anterior = get_option('auditoria_frequencia', 'weekly');
            if ($frequencia_anterior !== $configuracoes['frequencia_auditoria']) {
                // Remover agendamento anterior
                $timestamp = wp_next_scheduled('auditoria_seguranca_cron');
                if ($timestamp) {
                    wp_unschedule_event($timestamp, 'auditoria_seguranca_cron');
                }
                
                // Adicionar novo agendamento
                wp_schedule_event(time(), $configuracoes['frequencia_auditoria'], 'auditoria_seguranca_cron');
                update_option('auditoria_frequencia', $configuracoes['frequencia_auditoria']);
            }
            
            echo '<div class="notice notice-success"><p>Configurações salvas com sucesso!</p></div>';
        }
        
        // Obter configurações atuais
        $configuracoes = get_option('auditoria_seguranca_config', array(
            'frequencia_auditoria' => 'weekly',
            'notificar_email' => 1,
            'email_notificacao' => get_option('admin_email'),
            'verificar_plugins' => 1,
            'verificar_temas' => 1,
            'verificar_usuarios' => 1,
            'verificar_permissoes' => 1,
            'verificar_arquivos' => 1,
            'verificar_banco_dados' => 1
        ));
        
        ?>
        <div class="wrap">
            <h1>Configurações de Auditoria</h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('auditoria_configuracoes_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Frequência de Auditoria Automática</th>
                        <td>
                            <select name="frequencia_auditoria">
                                <option value="daily" <?php selected($configuracoes['frequencia_auditoria'], 'daily'); ?>>Diária</option>
                                <option value="weekly" <?php selected($configuracoes['frequencia_auditoria'], 'weekly'); ?>>Semanal</option>
                                <option value="biweekly" <?php selected($configuracoes['frequencia_auditoria'], 'biweekly'); ?>>Quinzenal</option>
                                <option value="monthly" <?php selected($configuracoes['frequencia_auditoria'], 'monthly'); ?>>Mensal</option>
                            </select>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Notificações por E-mail</th>
                        <td>
                            <label>
                                <input type="checkbox" name="notificar_email" value="1" <?php checked($configuracoes['notificar_email'], 1); ?>> 
                                Enviar notificações por e-mail após cada auditoria
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">E-mail para Notificações</th>
                        <td>
                            <input type="email" name="email_notificacao" value="<?php echo esc_attr($configuracoes['email_notificacao']); ?>" class="regular-text">
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Componentes a Verificar</th>
                        <td>
                            <fieldset>
                                <legend class="screen-reader-text">Componentes a Verificar</legend>
                                
                                <label>
                                    <input type="checkbox" name="verificar_plugins" value="1" <?php checked($configuracoes['verificar_plugins'], 1); ?>> 
                                    Plugins (atualizações, vulnerabilidades conhecidas)
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="verificar_temas" value="1" <?php checked($configuracoes['verificar_temas'], 1); ?>> 
                                    Temas (atualizações, vulnerabilidades conhecidas)
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="verificar_usuarios" value="1" <?php checked($configuracoes['verificar_usuarios'], 1); ?>> 
                                    Usuários (senhas fracas, permissões excessivas)
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="verificar_permissoes" value="1" <?php checked($configuracoes['verificar_permissoes'], 1); ?>> 
                                    Permissões de arquivos e diretórios
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="verificar_arquivos" value="1" <?php checked($configuracoes['verificar_arquivos'], 1); ?>> 
                                    Integridade de arquivos do core
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="verificar_banco_dados" value="1" <?php checked($configuracoes['verificar_banco_dados'], 1); ?>> 
                                    Segurança do banco de dados
                                </label>
                            </fieldset>
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
     * AJAX: Iniciar auditoria
     */
    public function ajax_iniciar_auditoria() {
        // Verificar nonce e permissões
        check_ajax_referer('auditoria_seguranca_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada'));
            return;
        }
        
        // Iniciar auditoria
        $auditoria_id = $this->iniciar_auditoria('manual');
        
        if (!$auditoria_id) {
            wp_send_json_error(array('message' => 'Erro ao iniciar auditoria'));
            return;
        }
        
        wp_send_json_success(array('auditoria_id' => $auditoria_id));
    }
    
    /**
     * AJAX: Obter resultados da auditoria
     */
    public function ajax_obter_resultados_auditoria() {
        // Verificar nonce e permissões
        check_ajax_referer('auditoria_seguranca_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada'));
            return;
        }
        
        $auditoria_id = isset($_POST['auditoria_id']) ? intval($_POST['auditoria_id']) : 0;
        
        if (!$auditoria_id) {
            wp_send_json_error(array('message' => 'ID de auditoria inválido'));
            return;
        }
        
        global $wpdb;
        
        // Obter informações da auditoria
        $auditoria = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->tabela_auditorias} WHERE id = %d",
            $auditoria_id
        ));
        
        if (!$auditoria) {
            wp_send_json_error(array('message' => 'Auditoria não encontrada'));
            return;
        }
        
        // Obter vulnerabilidades
        $vulnerabilidades = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d ORDER BY severidade ASC",
            $auditoria_id
        ));
        
        wp_send_json_success(array(
            'auditoria' => $auditoria,
            'vulnerabilidades' => $vulnerabilidades
        ));
    }
    
    /**
     * AJAX: Obter detalhes da vulnerabilidade
     */
    public function ajax_obter_detalhes_vulnerabilidade() {
        // Verificar nonce e permissões
        check_ajax_referer('auditoria_seguranca_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada'));
            return;
        }
        
        $vulnerabilidade_id = isset($_POST['vulnerabilidade_id']) ? intval($_POST['vulnerabilidade_id']) : 0;
        
        if (!$vulnerabilidade_id) {
            wp_send_json_error(array('message' => 'ID de vulnerabilidade inválido'));
            return;
        }
        
        global $wpdb;
        
        // Obter detalhes da vulnerabilidade
        $vulnerabilidade = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->tabela_vulnerabilidades} WHERE id = %d",
            $vulnerabilidade_id
        ));
        
        if (!$vulnerabilidade) {
            wp_send_json_error(array('message' => 'Vulnerabilidade não encontrada'));
            return;
        }
        
        wp_send_json_success($vulnerabilidade);
    }
    
    /**
     * AJAX: Marcar vulnerabilidade como resolvida
     */
    public function ajax_marcar_vulnerabilidade_resolvida() {
        // Verificar nonce e permissões
        check_ajax_referer('auditoria_seguranca_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada'));
            return;
        }
        
        $vulnerabilidade_id = isset($_POST['vulnerabilidade_id']) ? intval($_POST['vulnerabilidade_id']) : 0;
        
        if (!$vulnerabilidade_id) {
            wp_send_json_error(array('message' => 'ID de vulnerabilidade inválido'));
            return;
        }
        
        global $wpdb;
        
        // Atualizar status da vulnerabilidade
        $resultado = $wpdb->update(
            $this->tabela_vulnerabilidades,
            array(
                'status' => 'resolvido',
                'data_resolucao' => current_time('mysql')
            ),
            array('id' => $vulnerabilidade_id),
            array('%s', '%s'),
            array('%d')
        );
        
        if ($resultado === false) {
            wp_send_json_error(array('message' => 'Erro ao atualizar vulnerabilidade'));
            return;
        }
        
        wp_send_json_success(array('message' => 'Vulnerabilidade marcada como resolvida'));
    }
    
    /**
     * Executar auditoria automática (via cron)
     */
    public function executar_auditoria_automatica() {
        $this->iniciar_auditoria('automatica');
    }
    
    /**
     * Iniciar auditoria
     */
    private function iniciar_auditoria($tipo = 'manual') {
        global $wpdb;
        
        // Obter usuário atual
        $usuario = 'Sistema (Cron)';
        if ($tipo === 'manual') {
            $usuario_atual = wp_get_current_user();
            $usuario = $usuario_atual->user_login;
        }
        
        // Registrar início da auditoria
        $wpdb->insert(
            $this->tabela_auditorias,
            array(
                'timestamp' => current_time('mysql'),
                'tipo' => $tipo,
                'status' => 'em_andamento',
                'pontuacao_seguranca' => 0,
                'total_vulnerabilidades' => 0,
                'alta_severidade' => 0,
                'media_severidade' => 0,
                'baixa_severidade' => 0,
                'info_severidade' => 0,
                'duracao' => 0,
                'iniciado_por' => $usuario
            ),
            array('%s', '%s', '%s', '%d', '%d', '%d', '%d', '%d', '%d', '%d', '%s')
        );
        
        $auditoria_id = $wpdb->insert_id;
        
        if (!$auditoria_id) {
            return false;
        }
        
        // Iniciar tempo de execução
        $tempo_inicio = microtime(true);
        
        // Executar verificações
        $this->executar_verificacoes($auditoria_id);
        
        // Calcular tempo de execução
        $tempo_fim = microtime(true);
        $duracao = round($tempo_fim - $tempo_inicio);
        
        // Contar vulnerabilidades
        $total_vulnerabilidades = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d",
            $auditoria_id
        ));
        
        $alta_severidade = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d AND severidade = 'alta'",
            $auditoria_id
        ));
        
        $media_severidade = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d AND severidade = 'media'",
            $auditoria_id
        ));
        
        $baixa_severidade = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d AND severidade = 'baixa'",
            $auditoria_id
        ));
        
        $info_severidade = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d AND severidade = 'info'",
            $auditoria_id
        ));
        
        // Calcular pontuação de segurança (100 - penalidades)
        $pontuacao = 100;
        $pontuacao -= $alta_severidade * 15; // -15 pontos por vulnerabilidade alta
        $pontuacao -= $media_severidade * 5; // -5 pontos por vulnerabilidade média
        $pontuacao -= $baixa_severidade * 1; // -1 ponto por vulnerabilidade baixa
        
        // Garantir que a pontuação não seja negativa
        $pontuacao = max(0, $pontuacao);
        
        // Atualizar auditoria com resultados
        $wpdb->update(
            $this->tabela_auditorias,
            array(
                'status' => 'concluida',
                'pontuacao_seguranca' => $pontuacao,
                'total_vulnerabilidades' => $total_vulnerabilidades,
                'alta_severidade' => $alta_severidade,
                'media_severidade' => $media_severidade,
                'baixa_severidade' => $baixa_severidade,
                'info_severidade' => $info_severidade,
                'duracao' => $duracao
            ),
            array('id' => $auditoria_id),
            array('%s', '%d', '%d', '%d', '%d', '%d', '%d', '%d'),
            array('%d')
        );
        
        // Enviar notificação por e-mail se configurado
        $configuracoes = get_option('auditoria_seguranca_config', array());
        if (isset($configuracoes['notificar_email']) && $configuracoes['notificar_email']) {
            $this->enviar_notificacao_email($auditoria_id);
        }
        
        return $auditoria_id;
    }
    
    /**
     * Executar verificações de segurança
     */
    private function executar_verificacoes($auditoria_id) {
        // Obter configurações
        $configuracoes = get_option('auditoria_seguranca_config', array());
        
        // Verificar plugins
        if (isset($configuracoes['verificar_plugins']) && $configuracoes['verificar_plugins']) {
            $this->verificar_plugins($auditoria_id);
        }
        
        // Verificar temas
        if (isset($configuracoes['verificar_temas']) && $configuracoes['verificar_temas']) {
            $this->verificar_temas($auditoria_id);
        }
        
        // Verificar usuários
        if (isset($configuracoes['verificar_usuarios']) && $configuracoes['verificar_usuarios']) {
            $this->verificar_usuarios($auditoria_id);
        }
        
        // Verificar permissões
        if (isset($configuracoes['verificar_permissoes']) && $configuracoes['verificar_permissoes']) {
            $this->verificar_permissoes($auditoria_id);
        }
        
        // Verificar arquivos
        if (isset($configuracoes['verificar_arquivos']) && $configuracoes['verificar_arquivos']) {
            $this->verificar_arquivos($auditoria_id);
        }
        
        // Verificar banco de dados
        if (isset($configuracoes['verificar_banco_dados']) && $configuracoes['verificar_banco_dados']) {
            $this->verificar_banco_dados($auditoria_id);
        }
        
        // Verificações adicionais
        $this->verificar_configuracao_wp($auditoria_id);
        $this->verificar_headers_seguranca($auditoria_id);
        $this->verificar_ssl($auditoria_id);
        $this->verificar_versao_php($auditoria_id);
    }
    
    /**
     * Verificar plugins
     */
    private function verificar_plugins($auditoria_id) {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        
        $plugins = get_plugins();
        $atualizacoes = get_site_transient('update_plugins');
        
        foreach ($plugins as $plugin_file => $plugin_data) {
            // Verificar se o plugin está ativo
            $ativo = is_plugin_active($plugin_file);
            
            // Verificar se há atualizações disponíveis
            $atualizacao_disponivel = isset($atualizacoes->response[$plugin_file]);
            
            if ($atualizacao_disponivel && $ativo) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'plugin_desatualizado',
                    "Plugin desatualizado: {$plugin_data['Name']}",
                    "O plugin {$plugin_data['Name']} (versão {$plugin_data['Version']}) está ativo e possui uma atualização disponível. Plugins desatualizados podem conter vulnerabilidades de segurança conhecidas.",
                    'media',
                    "Plugin: {$plugin_data['Name']}\nArquivo: {$plugin_file}\nVersão atual: {$plugin_data['Version']}",
                    "Atualize o plugin para a versão mais recente através do painel administrativo do WordPress."
                );
            } elseif ($atualizacao_disponivel) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'plugin_desatualizado',
                    "Plugin desatualizado: {$plugin_data['Name']}",
                    "O plugin {$plugin_data['Name']} (versão {$plugin_data['Version']}) possui uma atualização disponível. Plugins desatualizados podem conter vulnerabilidades de segurança conhecidas.",
                    'baixa',
                    "Plugin: {$plugin_data['Name']}\nArquivo: {$plugin_file}\nVersão atual: {$plugin_data['Version']}",
                    "Atualize o plugin para a versão mais recente através do painel administrativo do WordPress."
                );
            }
            
            // Verificar plugins abandonados (sem atualizações por mais de 2 anos)
            if ($ativo && isset($plugin_data['Last Updated'])) {
                $ultima_atualizacao = strtotime($plugin_data['Last Updated']);
                $dois_anos_atras = strtotime('-2 years');
                
                if ($ultima_atualizacao < $dois_anos_atras) {
                    $this->registrar_vulnerabilidade(
                        $auditoria_id,
                        'plugin_abandonado',
                        "Plugin abandonado: {$plugin_data['Name']}",
                        "O plugin {$plugin_data['Name']} não recebe atualizações há mais de 2 anos. Plugins abandonados podem conter vulnerabilidades de segurança não corrigidas.",
                        'media',
                        "Plugin: {$plugin_data['Name']}\nArquivo: {$plugin_file}\nÚltima atualização: {$plugin_data['Last Updated']}",
                        "Considere substituir este plugin por uma alternativa mantida ativamente ou entre em contato com o desenvolvedor para verificar o status do projeto."
                    );
                }
            }
        }
    }
    
    /**
     * Verificar temas
     */
    private function verificar_temas($auditoria_id) {
        $temas = wp_get_themes();
        $atualizacoes = get_site_transient('update_themes');
        $tema_atual = wp_get_theme();
        
        foreach ($temas as $tema_slug => $tema) {
            // Verificar se é o tema ativo
            $ativo = ($tema->get_stylesheet() == $tema_atual->get_stylesheet());
            
            // Verificar se há atualizações disponíveis
            $atualizacao_disponivel = isset($atualizacoes->response[$tema_slug]);
            
            if ($atualizacao_disponivel && $ativo) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'tema_desatualizado',
                    "Tema desatualizado: {$tema->get('Name')}",
                    "O tema ativo {$tema->get('Name')} (versão {$tema->get('Version')}) possui uma atualização disponível. Temas desatualizados podem conter vulnerabilidades de segurança conhecidas.",
                    'media',
                    "Tema: {$tema->get('Name')}\nVersão atual: {$tema->get('Version')}",
                    "Atualize o tema para a versão mais recente através do painel administrativo do WordPress."
                );
            } elseif ($atualizacao_disponivel) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'tema_desatualizado',
                    "Tema desatualizado: {$tema->get('Name')}",
                    "O tema {$tema->get('Name')} (versão {$tema->get('Version')}) possui uma atualização disponível. Temas desatualizados podem conter vulnerabilidades de segurança conhecidas.",
                    'baixa',
                    "Tema: {$tema->get('Name')}\nVersão atual: {$tema->get('Version')}",
                    "Atualize o tema para a versão mais recente através do painel administrativo do WordPress."
                );
            }
        }
        
        // Verificar tema filho
        if ($tema_atual->parent()) {
            $tema_pai = $tema_atual->parent();
            $atualizacao_disponivel = isset($atualizacoes->response[$tema_pai->get_stylesheet()]);
            
            if ($atualizacao_disponivel) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'tema_pai_desatualizado',
                    "Tema pai desatualizado: {$tema_pai->get('Name')}",
                    "O tema pai {$tema_pai->get('Name')} (versão {$tema_pai->get('Version')}) do tema filho ativo possui uma atualização disponível. Temas desatualizados podem conter vulnerabilidades de segurança conhecidas.",
                    'media',
                    "Tema pai: {$tema_pai->get('Name')}\nVersão atual: {$tema_pai->get('Version')}",
                    "Atualize o tema pai para a versão mais recente através do painel administrativo do WordPress."
                );
            }
        }
    }
    
    /**
     * Verificar usuários
     */
    private function verificar_usuarios($auditoria_id) {
        // Obter todos os usuários administradores
        $administradores = get_users(array('role' => 'administrator'));
        
        // Verificar nomes de usuário óbvios
        $nomes_obvios = array('admin', 'administrator', 'administrador');
        
        foreach ($administradores as $admin) {
            // Verificar nome de usuário óbvio
            if (in_array(strtolower($admin->user_login), $nomes_obvios)) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'usuario_obvio',
                    "Nome de usuário administrador óbvio",
                    "Foi encontrado um usuário administrador com nome de usuário óbvio ({$admin->user_login}). Isso facilita ataques de força bruta.",
                    'alta',
                    "Usuário: {$admin->user_login}\nID: {$admin->ID}",
                    "Crie um novo usuário administrador com um nome de usuário não óbvio e exclua este usuário após transferir o conteúdo."
                );
            }
            
            // Verificar e-mail padrão
            if ($admin->user_email == get_option('admin_email')) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'email_padrao',
                    "E-mail de administrador padrão",
                    "Um usuário administrador está usando o e-mail padrão do site. Isso pode facilitar ataques de força bruta.",
                    'media',
                    "Usuário: {$admin->user_login}\nE-mail: {$admin->user_email}",
                    "Altere o e-mail do administrador para um endereço diferente do e-mail padrão do site."
                );
            }
        }
        
        // Verificar usuários com mesmo nível de privilégio
        if (count($administradores) > 3) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'muitos_administradores',
                "Muitos usuários administradores",
                "Foram encontrados {$administradores} usuários com privilégios de administrador. Ter muitos administradores aumenta a superfície de ataque.",
                'media',
                "Total de administradores: " . count($administradores),
                "Revise a lista de administradores e reduza ao mínimo necessário. Considere usar funções com menos privilégios para usuários que não precisam de acesso total."
            );
        }
    }
    
    /**
     * Verificar permissões de arquivos e diretórios
     */
    private function verificar_permissoes($auditoria_id) {
        // Verificar permissões do wp-config.php
        $wp_config_path = ABSPATH . 'wp-config.php';
        if (file_exists($wp_config_path)) {
            $perms = substr(sprintf('%o', fileperms($wp_config_path)), -4);
            
            if ($perms > '0644') {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'permissao_wp_config',
                    "Permissões inseguras no wp-config.php",
                    "O arquivo wp-config.php tem permissões muito abertas ($perms). Este arquivo contém informações sensíveis e deve ter permissões restritas.",
                    'alta',
                    "Arquivo: wp-config.php\nPermissões atuais: $perms",
                    "Altere as permissões do arquivo wp-config.php para 0600 ou 0644 no máximo."
                );
            }
        }
        
        // Verificar permissões do diretório uploads
        $uploads_dir = wp_upload_dir();
        $uploads_path = $uploads_dir['basedir'];
        
        if (file_exists($uploads_path)) {
            $perms = substr(sprintf('%o', fileperms($uploads_path)), -4);
            
            if ($perms > '0755') {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'permissao_uploads',
                    "Permissões inseguras no diretório de uploads",
                    "O diretório de uploads tem permissões muito abertas ($perms). Permissões excessivas podem permitir a execução de arquivos maliciosos.",
                    'media',
                    "Diretório: {$uploads_path}\nPermissões atuais: $perms",
                    "Altere as permissões do diretório de uploads para 0755 no máximo."
                );
            }
        }
        
        // Verificar permissões do diretório plugins
        $plugins_path = WP_PLUGIN_DIR;
        
        if (file_exists($plugins_path)) {
            $perms = substr(sprintf('%o', fileperms($plugins_path)), -4);
            
            if ($perms > '0755') {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'permissao_plugins',
                    "Permissões inseguras no diretório de plugins",
                    "O diretório de plugins tem permissões muito abertas ($perms). Permissões excessivas podem permitir a modificação não autorizada de plugins.",
                    'media',
                    "Diretório: {$plugins_path}\nPermissões atuais: $perms",
                    "Altere as permissões do diretório de plugins para 0755 no máximo."
                );
            }
        }
        
        // Verificar permissões do diretório temas
        $themes_path = get_theme_root();
        
        if (file_exists($themes_path)) {
            $perms = substr(sprintf('%o', fileperms($themes_path)), -4);
            
            if ($perms > '0755') {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'permissao_temas',
                    "Permissões inseguras no diretório de temas",
                    "O diretório de temas tem permissões muito abertas ($perms). Permissões excessivas podem permitir a modificação não autorizada de temas.",
                    'media',
                    "Diretório: {$themes_path}\nPermissões atuais: $perms",
                    "Altere as permissões do diretório de temas para 0755 no máximo."
                );
            }
        }
    }
    
    /**
     * Verificar integridade de arquivos do core
     */
    private function verificar_arquivos($auditoria_id) {
        global $wp_version;
        
        // Verificar se a função de verificação de arquivos está disponível
        if (!function_exists('get_core_checksums')) {
            require_once ABSPATH . 'wp-admin/includes/update.php';
        }
        
        // Obter checksums do core do WordPress
        $checksums = get_core_checksums($wp_version, get_locale());
        
        if (!$checksums) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'checksums_indisponiveis',
                "Não foi possível verificar a integridade dos arquivos do core",
                "Não foi possível obter os checksums para a versão atual do WordPress ($wp_version). Isso impede a verificação da integridade dos arquivos do core.",
                'media',
                "Versão do WordPress: $wp_version\nLocale: " . get_locale(),
                "Verifique se o site pode se comunicar com api.wordpress.org para obter os checksums. Se o problema persistir, considere reinstalar o WordPress."
            );
            return;
        }
        
        // Arquivos modificados
        $arquivos_modificados = array();
        $arquivos_ausentes = array();
        
        // Verificar cada arquivo do core
        foreach ($checksums as $file => $checksum) {
            $file_path = ABSPATH . $file;
            
            // Verificar se o arquivo existe
            if (!file_exists($file_path)) {
                $arquivos_ausentes[] = $file;
                continue;
            }
            
            // Verificar checksum
            $file_checksum = md5_file($file_path);
            if ($file_checksum !== $checksum) {
                $arquivos_modificados[] = $file;
            }
        }
        
        // Registrar vulnerabilidade se houver arquivos modificados
        if (!empty($arquivos_modificados)) {
            // Limitar a lista para não sobrecarregar o banco de dados
            $arquivos_lista = array_slice($arquivos_modificados, 0, 10);
            $total_modificados = count($arquivos_modificados);
            
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'arquivos_core_modificados',
                "Arquivos do core do WordPress modificados",
                "Foram encontrados $total_modificados arquivos do core do WordPress que foram modificados. Isso pode indicar uma invasão ou modificações manuais inadequadas.",
                'alta',
                "Total de arquivos modificados: $total_modificados\nExemplos: " . implode(", ", $arquivos_lista) . ($total_modificados > 10 ? " e mais..." : ""),
                "Restaure os arquivos originais do WordPress reinstalando a versão atual ou restaurando de um backup confiável."
            );
        }
        
        // Registrar vulnerabilidade se houver arquivos ausentes
        if (!empty($arquivos_ausentes)) {
            // Limitar a lista para não sobrecarregar o banco de dados
            $arquivos_lista = array_slice($arquivos_ausentes, 0, 10);
            $total_ausentes = count($arquivos_ausentes);
            
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'arquivos_core_ausentes',
                "Arquivos do core do WordPress ausentes",
                "Foram encontrados $total_ausentes arquivos do core do WordPress que estão ausentes. Isso pode causar mau funcionamento ou indicar uma invasão.",
                'media',
                "Total de arquivos ausentes: $total_ausentes\nExemplos: " . implode(", ", $arquivos_lista) . ($total_ausentes > 10 ? " e mais..." : ""),
                "Restaure os arquivos ausentes reinstalando a versão atual do WordPress ou restaurando de um backup confiável."
            );
        }
    }
    
    /**
     * Verificar segurança do banco de dados
     */
    private function verificar_banco_dados($auditoria_id) {
        global $wpdb;
        
        // Verificar prefixo de tabelas padrão
        if ($wpdb->prefix === 'wp_') {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'prefixo_tabelas_padrao',
                "Prefixo de tabelas padrão",
                "O site está usando o prefixo de tabelas padrão ('wp_'). Isso facilita ataques automatizados de injeção SQL.",
                'media',
                "Prefixo atual: {$wpdb->prefix}",
                "Altere o prefixo das tabelas no arquivo wp-config.php e renomeie as tabelas no banco de dados. Existem plugins que podem ajudar nessa tarefa."
            );
        }
        
        // Verificar usuário do banco de dados com privilégios excessivos
        $resultado = $wpdb->get_row("SHOW GRANTS FOR CURRENT_USER()");
        
        if ($resultado) {
            $grants = reset($resultado);
            
            if (strpos($grants, 'ALL PRIVILEGES') !== false && strpos($grants, 'ON *.*') !== false) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'privilegios_bd_excessivos',
                    "Privilégios excessivos do usuário do banco de dados",
                    "O usuário do banco de dados tem privilégios administrativos completos (ALL PRIVILEGES). Isso viola o princípio do menor privilégio e aumenta o risco em caso de comprometimento.",
                    'alta',
                    "Privilégios atuais: $grants",
                    "Crie um usuário de banco de dados com privilégios limitados apenas às operações necessárias (SELECT, INSERT, UPDATE, DELETE) e apenas no banco de dados do WordPress."
                );
            }
        }
    }
    
    /**
     * Verificar configuração do WordPress
     */
    private function verificar_configuracao_wp($auditoria_id) {
        // Verificar modo de depuração
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'debug_ativado',
                "Modo de depuração ativado",
                "O modo de depuração do WordPress está ativado em ambiente de produção. Isso pode expor informações sensíveis a visitantes.",
                'media',
                "Configuração: WP_DEBUG está definido como true no wp-config.php",
                "Desative o modo de depuração em ambiente de produção definindo WP_DEBUG como false no arquivo wp-config.php."
            );
        }
        
        // Verificar exibição de erros
        if (defined('WP_DEBUG_DISPLAY') && WP_DEBUG_DISPLAY) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'debug_display_ativado',
                "Exibição de erros de depuração ativada",
                "A exibição de erros de depuração está ativada. Isso pode expor informações sensíveis a visitantes.",
                'media',
                "Configuração: WP_DEBUG_DISPLAY está definido como true no wp-config.php",
                "Desative a exibição de erros de depuração definindo WP_DEBUG_DISPLAY como false no arquivo wp-config.php."
            );
        }
        
        // Verificar versão do WordPress
        global $wp_version;
        $versoes = get_core_updates();
        
        if (!empty($versoes) && $versoes[0]->response == 'upgrade') {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'wordpress_desatualizado',
                "WordPress desatualizado",
                "O WordPress está desatualizado. A versão atual é $wp_version, mas há uma atualização disponível. Versões desatualizadas podem conter vulnerabilidades de segurança conhecidas.",
                'alta',
                "Versão atual: $wp_version\nVersão disponível: {$versoes[0]->version}",
                "Atualize o WordPress para a versão mais recente através do painel administrativo."
            );
        }
        
        // Verificar se a API REST está exposta sem proteção
        $rest_url = get_rest_url();
        if ($rest_url && !get_option('blog_public')) {
            // Verificar se há alguma proteção na API REST
            $plugins_ativos = get_option('active_plugins');
            $tem_protecao_rest = false;
            
            $plugins_protecao = array(
                'disable-json-api/disable-json-api.php',
                'disable-wp-rest-api/disable-wp-rest-api.php',
                'jwt-authentication-for-wp-rest-api/jwt-auth.php'
            );
            
            foreach ($plugins_protecao as $plugin) {
                if (in_array($plugin, $plugins_ativos)) {
                    $tem_protecao_rest = true;
                    break;
                }
            }
            
            if (!$tem_protecao_rest) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'rest_api_desprotegida',
                    "API REST desprotegida",
                    "A API REST do WordPress está acessível publicamente sem proteção adequada. Isso pode expor informações sobre usuários, posts e outros dados do site.",
                    'media',
                    "URL da API REST: $rest_url",
                    "Instale um plugin para proteger a API REST ou implemente autenticação personalizada para endpoints sensíveis."
                );
            }
        }
        
        // Verificar se o arquivo readme.html existe
        if (file_exists(ABSPATH . 'readme.html')) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'arquivo_readme_exposto',
                "Arquivo readme.html exposto",
                "O arquivo readme.html está presente na raiz do site. Este arquivo revela a versão do WordPress instalada, o que pode ajudar atacantes.",
                'baixa',
                "Arquivo: readme.html",
                "Remova o arquivo readme.html da raiz do site ou bloqueie o acesso a ele via .htaccess."
            );
        }
    }
    
    /**
     * Verificar headers de segurança
     */
    private function verificar_headers_seguranca($auditoria_id) {
        // Obter URL do site
        $site_url = get_site_url();
        
        // Fazer requisição para o site
        $response = wp_remote_get($site_url, array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            return;
        }
        
        $headers = wp_remote_retrieve_headers($response);
        
        // Verificar X-Frame-Options
        if (!isset($headers['x-frame-options'])) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'sem_x_frame_options',
                "Header X-Frame-Options ausente",
                "O header X-Frame-Options não está configurado. Isso pode permitir ataques de clickjacking, onde seu site é carregado em um iframe em outro site malicioso.",
                'media',
                "Header ausente: X-Frame-Options",
                "Adicione o header X-Frame-Options com valor 'SAMEORIGIN' no arquivo .htaccess ou na configuração do servidor web."
            );
        }
        
        // Verificar X-Content-Type-Options
        if (!isset($headers['x-content-type-options'])) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'sem_x_content_type_options',
                "Header X-Content-Type-Options ausente",
                "O header X-Content-Type-Options não está configurado. Isso pode permitir ataques de MIME-sniffing.",
                'baixa',
                "Header ausente: X-Content-Type-Options",
                "Adicione o header X-Content-Type-Options com valor 'nosniff' no arquivo .htaccess ou na configuração do servidor web."
            );
        }
        
        // Verificar X-XSS-Protection
        if (!isset($headers['x-xss-protection'])) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'sem_x_xss_protection',
                "Header X-XSS-Protection ausente",
                "O header X-XSS-Protection não está configurado. Isso pode facilitar ataques de Cross-Site Scripting (XSS) em navegadores mais antigos.",
                'baixa',
                "Header ausente: X-XSS-Protection",
                "Adicione o header X-XSS-Protection com valor '1; mode=block' no arquivo .htaccess ou na configuração do servidor web."
            );
        }
        
        // Verificar Content-Security-Policy
        if (!isset($headers['content-security-policy'])) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'sem_content_security_policy',
                "Header Content-Security-Policy ausente",
                "O header Content-Security-Policy não está configurado. Este header ajuda a prevenir ataques de injeção de conteúdo, como XSS.",
                'media',
                "Header ausente: Content-Security-Policy",
                "Implemente uma política de segurança de conteúdo (CSP) adequada para o seu site. Comece com uma política básica e expanda conforme necessário."
            );
        }
        
        // Verificar Strict-Transport-Security (HSTS)
        if (strpos($site_url, 'https://') === 0 && !isset($headers['strict-transport-security'])) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'sem_hsts',
                "Header Strict-Transport-Security ausente",
                "O site usa HTTPS, mas o header Strict-Transport-Security (HSTS) não está configurado. Isso pode permitir ataques de downgrade para HTTP.",
                'media',
                "Header ausente: Strict-Transport-Security",
                "Adicione o header Strict-Transport-Security com valor 'max-age=31536000; includeSubDomains' no arquivo .htaccess ou na configuração do servidor web."
            );
        }
    }
    
    /**
     * Verificar configuração SSL
     */
    private function verificar_ssl($auditoria_id) {
        // Verificar se o site usa HTTPS
        $site_url = get_site_url();
        
        if (strpos($site_url, 'https://') !== 0) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'sem_https',
                "Site não usa HTTPS",
                "O site não está configurado para usar HTTPS. Isso pode comprometer a segurança das comunicações e dados dos usuários.",
                'alta',
                "URL atual: $site_url",
                "Configure um certificado SSL válido e force o uso de HTTPS para todo o site. Atualize as URLs no banco de dados após a configuração."
            );
            return;
        }
        
        // Verificar redirecionamento de HTTP para HTTPS
        $http_url = str_replace('https://', 'http://', $site_url);
        
        $response = wp_remote_get($http_url, array(
            'timeout' => 10,
            'sslverify' => false,
            'redirection' => 0
        ));
        
        if (!is_wp_error($response)) {
            $code = wp_remote_retrieve_response_code($response);
            
            if ($code < 300 || $code >= 400) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'sem_redirecionamento_https',
                    "Sem redirecionamento para HTTPS",
                    "O site não redireciona automaticamente de HTTP para HTTPS. Isso pode permitir que usuários acessem o site de forma insegura.",
                    'media',
                    "Código de resposta HTTP: $code",
                    "Configure um redirecionamento permanente (301) de HTTP para HTTPS no arquivo .htaccess ou na configuração do servidor web."
                );
            }
        }
        
        // Verificar certificado SSL
        $ssl_info = openssl_x509_parse(openssl_x509_read(file_get_contents("ssl://" . parse_url($site_url, PHP_URL_HOST) . ":443")));
        
        if ($ssl_info) {
            // Verificar data de expiração
            $expira_em = $ssl_info['validTo_time_t'];
            $dias_restantes = ceil(($expira_em - time()) / 86400);
            
            if ($dias_restantes <= 30) {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'certificado_ssl_expirando',
                    "Certificado SSL próximo da expiração",
                    "O certificado SSL do site expirará em $dias_restantes dias. Um certificado expirado causará avisos de segurança para os visitantes.",
                    $dias_restantes <= 7 ? 'alta' : 'media',
                    "Data de expiração: " . date('d/m/Y', $expira_em) . "\nDias restantes: $dias_restantes",
                    "Renove o certificado SSL antes da data de expiração para evitar interrupções no serviço."
                );
            }
            
            // Verificar algoritmo de assinatura
            if (isset($ssl_info['signatureTypeSN']) && $ssl_info['signatureTypeSN'] === 'RSA-SHA1') {
                $this->registrar_vulnerabilidade(
                    $auditoria_id,
                    'certificado_ssl_fraco',
                    "Certificado SSL usa algoritmo de assinatura fraco",
                    "O certificado SSL do site usa o algoritmo de assinatura SHA-1, que é considerado inseguro.",
                    'media',
                    "Algoritmo de assinatura: {$ssl_info['signatureTypeSN']}",
                    "Obtenha um novo certificado SSL que use um algoritmo de assinatura mais forte, como SHA-256."
                );
            }
        }
    }
    
    /**
     * Verificar versão do PHP
     */
    private function verificar_versao_php($auditoria_id) {
        $versao_php = phpversion();
        $versao_minima = '7.4';
        
        if (version_compare($versao_php, $versao_minima, '<')) {
            $this->registrar_vulnerabilidade(
                $auditoria_id,
                'php_desatualizado',
                "Versão do PHP desatualizada",
                "O site está rodando em uma versão desatualizada do PHP ($versao_php). Versões antigas do PHP podem conter vulnerabilidades de segurança conhecidas e não recebem mais atualizações de segurança.",
                'alta',
                "Versão atual: $versao_php\nVersão mínima recomendada: $versao_minima",
                "Atualize para uma versão do PHP que ainda receba suporte e atualizações de segurança. Entre em contato com seu provedor de hospedagem para solicitar a atualização."
            );
        }
    }
    
    /**
     * Registrar vulnerabilidade
     */
    private function registrar_vulnerabilidade($auditoria_id, $tipo, $titulo, $descricao, $severidade, $localizacao, $recomendacao) {
        global $wpdb;
        
        $wpdb->insert(
            $this->tabela_vulnerabilidades,
            array(
                'auditoria_id' => $auditoria_id,
                'tipo' => $tipo,
                'titulo' => $titulo,
                'descricao' => $descricao,
                'severidade' => $severidade,
                'localizacao' => $localizacao,
                'recomendacao' => $recomendacao,
                'status' => 'pendente',
                'data_identificacao' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
        );
    }
    
    /**
     * Enviar notificação por e-mail
     */
    private function enviar_notificacao_email($auditoria_id) {
        global $wpdb;
        
        // Obter informações da auditoria
        $auditoria = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->tabela_auditorias} WHERE id = %d",
            $auditoria_id
        ));
        
        if (!$auditoria) {
            return false;
        }
        
        // Obter configurações
        $configuracoes = get_option('auditoria_seguranca_config', array());
        $email = isset($configuracoes['email_notificacao']) ? $configuracoes['email_notificacao'] : get_option('admin_email');
        
        // Contar vulnerabilidades por severidade
        $alta_severidade = $auditoria->alta_severidade;
        $media_severidade = $auditoria->media_severidade;
        $baixa_severidade = $auditoria->baixa_severidade;
        $info_severidade = $auditoria->info_severidade;
        $total_vulnerabilidades = $auditoria->total_vulnerabilidades;
        
        // Construir assunto do e-mail
        $assunto = "[{$_SERVER['HTTP_HOST']}] Relatório de Auditoria de Segurança";
        
        // Construir corpo do e-mail
        $corpo = "<h2>Relatório de Auditoria de Segurança</h2>";
        $corpo .= "<p>Uma auditoria de segurança foi concluída em " . date('d/m/Y H:i', strtotime($auditoria->timestamp)) . ".</p>";
        
        $corpo .= "<h3>Resumo</h3>";
        $corpo .= "<p>Pontuação de Segurança: <strong>{$auditoria->pontuacao_seguranca}/100</strong></p>";
        $corpo .= "<p>Total de Vulnerabilidades: <strong>$total_vulnerabilidades</strong></p>";
        $corpo .= "<ul>";
        $corpo .= "<li>Alta Severidade: <strong>$alta_severidade</strong></li>";
        $corpo .= "<li>Média Severidade: <strong>$media_severidade</strong></li>";
        $corpo .= "<li>Baixa Severidade: <strong>$baixa_severidade</strong></li>";
        $corpo .= "<li>Informativa: <strong>$info_severidade</strong></li>";
        $corpo .= "</ul>";
        
        // Adicionar link para o painel
        $corpo .= "<p><a href='" . admin_url('admin.php?page=auditoria-vulnerabilidades&auditoria_id=' . $auditoria_id) . "'>Ver detalhes no painel administrativo</a></p>";
        
        // Adicionar vulnerabilidades de alta severidade
        if ($alta_severidade > 0) {
            $vulnerabilidades = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$this->tabela_vulnerabilidades} WHERE auditoria_id = %d AND severidade = 'alta' ORDER BY id ASC",
                $auditoria_id
            ));
            
            $corpo .= "<h3>Vulnerabilidades de Alta Severidade</h3>";
            $corpo .= "<ul>";
            
            foreach ($vulnerabilidades as $vulnerabilidade) {
                $corpo .= "<li><strong>{$vulnerabilidade->titulo}</strong> - {$vulnerabilidade->descricao}</li>";
            }
            
            $corpo .= "</ul>";
        }
        
        // Enviar e-mail
        $headers = array('Content-Type: text/html; charset=UTF-8');
        
        return wp_mail($email, $assunto, $corpo, $headers);
    }
    
    /**
     * Obter classe CSS para pontuação de segurança
     */
    private function obter_classe_pontuacao($pontuacao) {
        if ($pontuacao >= 90) {
            return 'excelente';
        } elseif ($pontuacao >= 70) {
            return 'boa';
        } elseif ($pontuacao >= 50) {
            return 'media';
        } else {
            return 'ruim';
        }
    }
}

// Inicializar o plugin
$acucaradas_auditoria = new AcucaradasAuditoria();