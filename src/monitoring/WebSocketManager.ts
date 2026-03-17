/**
 * Gerenciador WebSocket para monitoramento em tempo real
 * Versão simplificada compatível com React Native/Expo
 * Com mecanismos de timeout e fallback para evitar bloqueios
 */

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  lastPing: number;
  subscriptions: string[];
}

/**
 * Interface para estatísticas do WebSocketManager
 */
export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  queueSize: number;
}

/**
 * Gerenciador de conexões WebSocket para monitoramento
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocketConnection> = new Map();
  private isServer: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private maxQueueSize: number = 1000;
  private initializationTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;
  private fallbackMode: boolean = false;

  /**
   * Retorna estatísticas do WebSocketManager
   * @returns Estatísticas de conexões e fila de mensagens
   */
  public getStats(): WebSocketStats {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections(),
      queueSize: this.messageQueue.length
    };
  }

  /**
   * Retorna o número de conexões ativas (que receberam ping recentemente)
   * @returns Número de conexões ativas
   */
  private getActiveConnections(): number {
    const now = Date.now();
    const activeTimeout = 30000; // 30 segundos
    
    let activeCount = 0;
    this.connections.forEach(conn => {
      if (now - conn.lastPing < activeTimeout) {
        activeCount++;
      }
    });
    
    return activeCount;
  }
  private connectionTimeoutMs: number = 10000; // 10 segundos para timeout de conexão
  private serverUrl: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectInterval: number = 5000; // 5 segundos entre tentativas de reconexão

  private constructor() {
    // Detectar se estamos em ambiente servidor ou cliente
    this.isServer = typeof window === 'undefined';
    
    // Não inicializar automaticamente - aguardar chamada explícita para initialize()
    // para permitir inicialização assíncrona controlada
  }
  
  /**
   * Inicializa o WebSocketManager com proteção contra bloqueios
   * @param url URL opcional do servidor WebSocket
   * @returns Promise que resolve quando a inicialização for concluída
   */
  public async initialize(url?: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Armazenar URL do servidor se fornecida
        if (url) {
          this.serverUrl = url;
        }
        
        // Já inicializado? Retornar imediatamente
        if (this.isInitialized) {
          console.log('🔄 WebSocketManager já inicializado');
          resolve(true);
          return;
        }
        
        console.log('🚀 Inicializando WebSocketManager...');
        
        // Limpar qualquer timeout existente
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
        }
        
        // Configurar timeout para evitar bloqueio na inicialização
        this.initializationTimeout = setTimeout(() => {
          if (!this.isInitialized) {
            const error = new Error('Timeout ao inicializar WebSocketManager');
            this.initializationError = error;
            console.error('⚠️ Timeout na inicialização do WebSocketManager');
            // Continuar com funcionalidade limitada
            this.handleInitializationFailure();
            resolve(false);
          }
        }, this.connectionTimeoutMs);
        
        // Iniciar heartbeat
        this.startHeartbeat();
        
        // Marcar como inicializado
        this.isInitialized = true;
        this.fallbackMode = false;
        this.initializationError = null;
        
        // Limpar timeout se inicialização bem-sucedida
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
          this.initializationTimeout = null;
        }
        
        console.log('✅ WebSocketManager inicializado com sucesso');
        resolve(true);
      } catch (error) {
        this.initializationError = error instanceof Error ? error : new Error(String(error));
        console.error('❌ Erro ao inicializar WebSocketManager:', error);
        this.handleInitializationFailure();
        resolve(false);
      }
    });
  }
  
  /**
   * Lida com falha na inicialização
   */
  private handleInitializationFailure(): void {
    // Limpar recursos que possam estar causando bloqueio
    this.cleanup();
    
    // Configurar estado mínimo para permitir que o app continue funcionando
    this.isInitialized = true; // Marcar como inicializado mesmo com erro
    this.fallbackMode = true;
    console.log('⚠️ WebSocketManager operando em modo de fallback');
    
    // Tentar reconectar se não excedeu o número máximo de tentativas
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.serverUrl) {
      this.reconnectAttempts++;
      console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${this.reconnectInterval/1000}s...`);
      
      setTimeout(() => {
        this.initialize(this.serverUrl).then(success => {
          if (success) {
            console.log('✅ Reconexão bem-sucedida!');
            this.fallbackMode = false;
            this.reconnectAttempts = 0;
          }
        });
      }, this.reconnectInterval);
    }
  }
  
  /**
   * Verifica se o sistema está operando em modo de fallback
   */
  public isInFallbackMode(): boolean {
    return this.fallbackMode;
  }
  
  /**
   * Obtém o erro de inicialização, se houver
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }
  
  // Método legado removido para evitar duplicação de código

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Adiciona uma conexão WebSocket com timeout e tratamento de erros
   */
  public addConnection(socket: WebSocket, subscriptions: string[] = []): string {
    try {
      // Verificar se o socket é válido
      if (!socket) {
        throw new Error('Socket inválido');
      }
      
      // Verificar se o sistema está inicializado
      if (!this.isInitialized) {
        console.warn('⚠️ Tentativa de adicionar conexão antes da inicialização completa');
        // Continuar mesmo assim, mas com aviso
      }
      
      const id = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id,
        socket,
        lastPing: Date.now(),
        subscriptions: subscriptions.filter(sub => typeof sub === 'string'), // Garantir que são strings válidas
      };

      this.connections.set(id, connection);

      // Configurar handlers da conexão com timeout
      this.setupConnectionHandlers(connection);

      console.log(`🔗 Nova conexão WebSocket: ${id} (Total: ${this.connections.size})`);

      // Configurar timeout para a conexão inicial
      const connectionTimeout = setTimeout(() => {
        if (this.connections.has(id) && socket.readyState !== WebSocket.OPEN) {
          console.warn(`⚠️ Timeout ao estabelecer conexão ${id}`);
          this.removeConnection(id);
        }
      }, this.connectionTimeoutMs);

      // Limpar timeout quando a conexão estiver aberta
      if (socket.readyState === WebSocket.OPEN) {
        clearTimeout(connectionTimeout);
        // Enviar dados iniciais
        this.sendInitialData(connection);
      } else {
        // Adicionar evento para quando a conexão abrir
        socket.addEventListener('open', () => {
          clearTimeout(connectionTimeout);
          // Enviar dados iniciais
          this.sendInitialData(connection);
        });
      }

      return id;
    } catch (error) {
      console.error('❌ Erro ao adicionar conexão WebSocket:', error);
      // Retornar um ID temporário para evitar quebrar o fluxo do app
      return `error_${Date.now()}`;
    }
  }

  /**
   * Remove uma conexão WebSocket
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.close();
        }
      } catch (error) {
        console.error('Erro ao fechar conexão:', error);
      }

      this.connections.delete(connectionId);
      console.log(`🔌 Conexão removida: ${connectionId}`);
    }
  }

  /**
   * Envia mensagem para uma conexão específica com tratamento de erros
   */
  public sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    try {
      // Verificar se o sistema está inicializado
      if (!this.isInitialized) {
        console.warn('⚠️ Tentativa de enviar mensagem antes da inicialização completa');
        // Adicionar à fila para envio posterior
        this.queueMessage(message);
        return false;
      }
      
      // Verificar se a conexão existe
      const connection = this.connections.get(connectionId);
      if (!connection) {
        // Adicionar à fila para envio posterior quando a conexão estiver disponível
        this.queueMessage(message);
        return false;
      }
      
      // Verificar estado da conexão
      if (connection.socket.readyState !== WebSocket.OPEN) {
        console.warn(`⚠️ Conexão ${connectionId} não está aberta (estado: ${connection.socket.readyState})`);
        // Adicionar à fila para envio posterior
        this.queueMessage(message);
        return false;
      }

      // Tentar enviar a mensagem com timeout
      return this.sendMessage(connection, message);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem para conexão:', error);
      // Adicionar à fila para tentativa posterior
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Transmite mensagem para todas as conexões com tratamento de erros
   * @param message Mensagem a ser transmitida
   * @param filter Filtro opcional para selecionar conexões específicas
   * @param options Opções adicionais para o broadcast
   * @returns Número de mensagens enviadas com sucesso
   */
  public broadcast(
    message: WebSocketMessage,
    filter?: (connection: WebSocketConnection) => boolean,
    options: { skipQueue?: boolean, priority?: boolean } = {}
  ): number {
    try {
      // Verificar se o sistema está inicializado
      if (!this.isInitialized) {
        console.warn('⚠️ Tentativa de broadcast antes da inicialização completa');
        // Adicionar à fila para envio posterior, a menos que skipQueue seja true
        if (!options.skipQueue) {
          this.queueMessage(message);
        }
        return 0;
      }
      
      // Se estiver em modo de fallback, apenas enfileirar a mensagem
      if (this.fallbackMode && !options.priority) {
        console.log('ℹ️ Broadcast em modo de fallback, mensagem enfileirada');
        if (!options.skipQueue) {
          this.queueMessage(message);
        }
        return 0;
      }
      
      // Se não houver conexões, apenas enfileirar a mensagem
      if (this.connections.size === 0) {
        if (!options.skipQueue) {
          this.queueMessage(message);
        }
        return 0;
      }
      
      let sentCount = 0;
      let errors = 0;

      // Usar Promise.allSettled para não bloquear em caso de erro em uma conexão
      const promises = Array.from(this.connections.entries()).map(([id, connection]) => {
        return new Promise<void>(resolve => {
          try {
            if (!filter || filter(connection)) {
              // Verificar estado da conexão
              if (connection.socket.readyState === WebSocket.OPEN) {
                if (this.sendMessage(connection, message)) {
                  sentCount++;
                } else {
                  errors++;
                }
              } else {
                // Conexão não está aberta
                errors++;
              }
            }
          } catch (error) {
            console.error(`❌ Erro no broadcast para conexão ${id}:`, error);
            errors++;
          }
          resolve();
        });
      });

      // Executar todas as promessas com timeout para não bloquear
      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(resolve, 2000); // 2 segundos de timeout para broadcast
      });
      
      Promise.race([
        Promise.allSettled(promises),
        timeoutPromise
      ]).then(() => {
        if (errors > 0) {
          console.warn(`⚠️ Broadcast completado com ${errors} erros. Mensagens enviadas: ${sentCount}`);
        }
      });

      return sentCount;
    } catch (error) {
      console.error('❌ Erro ao fazer broadcast:', error);
      // Adicionar à fila para tentativa posterior
      if (!options.skipQueue) {
        this.queueMessage(message);
      }
      return 0;
    }
  }

  /**
   * Transmite para conexões com inscrições específicas
   */
  public broadcastToSubscribers(message: WebSocketMessage, subscription: string): number {
    return this.broadcast(message, connection => connection.subscriptions.includes(subscription));
  }

  /**
   * Adiciona mensagem à fila (para quando não há conexões ativas)
   */
  public queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);

    // Limitar tamanho da fila
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue.shift(); // Remove a mensagem mais antiga
    }
  }

  /**
   * Processa fila de mensagens para novas conexões
   */
  private processMessageQueue(connection: WebSocketConnection): void {
    // Enviar últimas 10 mensagens da fila para nova conexão
    const recentMessages = this.messageQueue.slice(-10);

    recentMessages.forEach(message => {
      this.sendMessage(connection, {
        ...message,
        type: `queued_${message.type}`,
      });
    });
  }

  /**
   * Configura handlers para uma conexão
   */
  private setupConnectionHandlers(connection: WebSocketConnection): void {
    const { socket, id } = connection;

    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(connection, message);
      } catch (error) {
        console.error(`Erro ao processar mensagem de ${id}:`, error);
      }
    };

    socket.onclose = () => {
      console.log(`🔌 Conexão fechada: ${id}`);
      this.removeConnection(id);
    };

    socket.onerror = error => {
      console.error(`❌ Erro na conexão ${id}:`, error);
      this.removeConnection(id);
    };
  }

  /**
   * Manipula mensagens recebidas
   */
  private handleMessage(connection: WebSocketConnection, message: any): void {
    if (!connection || !message) {
      console.warn('⚠️ Mensagem ou conexão inválida');
      return;
    }
    
    const { id } = connection;
    
    // Atualizar timestamp do último ping para qualquer mensagem recebida
    connection.lastPing = Date.now();

    // Verificar se a mensagem tem um tipo válido
    if (!message.type || typeof message.type !== 'string') {
      console.warn(`⚠️ Mensagem sem tipo válido de ${id}`);
      return;
    }

    switch (message.type) {
      case 'ping':
        this.sendMessage(connection, {
          type: 'pong',
          timestamp: Date.now(),
        });
        break;

      case 'subscribe':
        if (message.subscriptions && Array.isArray(message.subscriptions)) {
          // Filtrar apenas strings válidas
          const validSubscriptions = message.subscriptions.filter(
            (sub: any) => typeof sub === 'string'
          );
          
          connection.subscriptions = Array.from(
            new Set([...connection.subscriptions, ...validSubscriptions])
          );
          console.log(`📋 ${id} se inscreveu em:`, validSubscriptions);
        }
        break;

      case 'unsubscribe':
        if (message.subscriptions && Array.isArray(message.subscriptions)) {
          connection.subscriptions = connection.subscriptions.filter(
            sub => !message.subscriptions.includes(sub)
          );
          console.log(`📋 ${id} cancelou inscrição em:`, message.subscriptions);
        }
        break;

      case 'acknowledge_alert':
        // Repassar para o sistema de monitoramento
        if (message.alertId) {
          this.broadcast({
            type: 'alert_acknowledged',
            data: { alertId: message.alertId, acknowledgedBy: id },
            timestamp: Date.now(),
          });
        }
        break;

      default:
        console.warn(`⚠️ Tipo de mensagem desconhecido de ${id}:`, message.type);
    }
  }

  /**
   * Envia dados iniciais para nova conexão
   */
  private sendInitialData(connection: WebSocketConnection): void {
    // Enviar mensagem de boas-vindas
    this.sendMessage(connection, {
      type: 'welcome',
      data: {
        connectionId: connection.id,
        serverTime: Date.now(),
        availableSubscriptions: [
          'metrics',
          'alerts',
          'system_health',
          'search_trends',
          'performance',
        ],
      },
      timestamp: Date.now(),
    });

    // Processar fila de mensagens
    this.processMessageQueue(connection);
  }

  /**
   * Envia mensagem para uma conexão
   */
  private sendMessage(connection: WebSocketConnection, message: WebSocketMessage): boolean {
    if (!connection || !connection.socket) {
      console.warn('⚠️ Tentativa de enviar mensagem para conexão inválida');
      return false;
    }
    
    try {
      // Verificar se a conexão está aberta
      if (connection.socket.readyState === WebSocket.OPEN) {
        // Garantir que a mensagem tenha um timestamp
        if (!message.timestamp) {
          message.timestamp = Date.now();
        }
        
        // Enviar a mensagem como JSON
        connection.socket.send(JSON.stringify(message));
        return true;
      } else {
        // Conexão não está aberta
        console.warn(`⚠️ Conexão ${connection.id} não está aberta (estado: ${connection.socket.readyState})`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem para ${connection.id}:`, error);
      // Remover conexão com problema
      this.removeConnection(connection.id);
      return false;
    }
  }

  /**
   * Inicia heartbeat para verificar conexões
   */
  private startHeartbeat(): void {
    // Evita iniciar múltiplos intervalos
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 segundos

      this.connections.forEach((connection, id) => {
        if (now - connection.lastPing > timeout) {
          console.log(`⏰ Timeout da conexão ${id}`);
          this.removeConnection(id);
        }
      });
    }, 15000); // Verifica a cada 15 segundos
  }

  /**
   * Gera ID único para conexão
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas das conexões
   */
  public getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    queuedMessages: number;
    subscriptionStats: Record<string, number>;
    fallbackMode: boolean;
    reconnectAttempts: number;
    hasError: boolean;
    lastError?: string;
  } {
    const subscriptionStats: Record<string, number> = {};

    this.connections.forEach(connection => {
      connection.subscriptions.forEach(sub => {
        subscriptionStats[sub] = (subscriptionStats[sub] || 0) + 1;
      });
    });

    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        conn => conn.socket && conn.socket.readyState === WebSocket.OPEN
      ).length,
      queuedMessages: this.messageQueue.length,
      subscriptionStats,
      fallbackMode: this.fallbackMode,
      reconnectAttempts: this.reconnectAttempts,
      hasError: this.initializationError !== null,
      lastError: this.initializationError?.message
    };
  }
  
  /**
   * Verifica a saúde do WebSocketManager
   * @returns Objeto com informações sobre a saúde do sistema
   */
  public checkHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    details: string;
    canRecover: boolean;
  } {
    // Sistema não inicializado é considerado crítico
    if (!this.isInitialized) {
      return {
        status: 'critical',
        details: 'Sistema não inicializado',
        canRecover: true
      };
    }
    
    // Em modo de fallback é considerado degradado
    if (this.fallbackMode) {
      return {
        status: 'degraded',
        details: `Operando em modo de fallback. Tentativas de reconexão: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        canRecover: this.reconnectAttempts < this.maxReconnectAttempts
      };
    }
    
    // Verificar se há conexões ativas
    const stats = this.getConnectionStats();
    if (stats.activeConnections === 0 && !this.isServer) {
      return {
        status: 'degraded',
        details: 'Sem conexões ativas',
        canRecover: true
      };
    }
    
    // Sistema saudável
    return {
      status: 'healthy',
      details: `${stats.activeConnections} conexões ativas, ${stats.queuedMessages} mensagens na fila`,
      canRecover: true
    };
  }
  
  /**
   * Tenta reconectar o sistema
   * @returns Promise que resolve para true se a reconexão for bem-sucedida
   */
  public async tryReconnect(): Promise<boolean> {
    if (!this.serverUrl) {
      console.error('❌ Não é possível reconectar: URL do servidor não definida');
      return false;
    }
    
    console.log('🔄 Tentando reconectar ao servidor...');
    
    // Resetar estado
    this.cleanup();
    this.isInitialized = false;
    this.fallbackMode = false;
    this.initializationError = null;
    
    // Tentar inicializar novamente
    return this.initialize(this.serverUrl);
  }

  /**
   * Limpa recursos
   * @param preserveQueue Se true, preserva a fila de mensagens
   */
  public cleanup(preserveQueue: boolean = false): void {
    // Limpar timeout de inicialização se existir
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
    
    // Limpar intervalo de heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Fechar todas as conexões
    if (this.connections) {
      this.connections.forEach((_connection, id) => {
        this.removeConnection(id);
      });
    }

    // Limpar fila de mensagens se não for para preservar
    if (!preserveQueue) {
      this.messageQueue = [];
    }
    
    console.log('🧹 Recursos do WebSocketManager liberados');
  }
}

// Instância singleton
export const webSocketManager = WebSocketManager.getInstance();
