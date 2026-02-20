/**
 * Gerenciador WebSocket para monitoramento em tempo real
 * VersÃ£o simplificada compatÃ­vel com React Native/Expo
 * Com mecanismos de timeout e fallback para evitar bloqueios
 */

import { LoggingService } from '../services/LoggingService';

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
 * Interface para estatÃ­sticas do WebSocketManager
 */
export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  queueSize: number;
}

/**
 * Gerenciador de conexÃµes WebSocket para monitoramento
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocketConnection> = new Map();
  private isServer: boolean = false;
  private heartbeatInterval: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private maxQueueSize: number = 1000;
  private initializationTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;
  private fallbackMode: boolean = false;
  private logger = LoggingService.getInstance();

  /**
   * Retorna estatÃ­sticas do WebSocketManager
   * @returns EstatÃ­sticas de conexÃµes e fila de mensagens
   */
  public getStats(): WebSocketStats {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections(),
      queueSize: this.messageQueue.length
    };
  }

  /**
   * Retorna o nÃºmero de conexÃµes ativas (que receberam ping recentemente)
   * @returns NÃºmero de conexÃµes ativas
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
  private connectionTimeoutMs: number = 10000; // 10 segundos para timeout de conexÃ£o
  private serverUrl: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectInterval: number = 5000; // 5 segundos entre tentativas de reconexÃ£o

  private constructor() {
    // Detectar se estamos em ambiente servidor ou cliente
    this.isServer = typeof window === 'undefined';
    
    // NÃ£o inicializar automaticamente - aguardar chamada explÃ­cita para initialize()
    // para permitir inicializaÃ§Ã£o assÃ­ncrona controlada
  }
  
  /**
   * Inicializa o WebSocketManager com proteÃ§Ã£o contra bloqueios
   * @param url URL opcional do servidor WebSocket
   * @returns Promise que resolve quando a inicializaÃ§Ã£o for concluÃ­da
   */
  public async initialize(url?: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Armazenar URL do servidor se fornecida
        if (url) {
          this.serverUrl = url;
        }
        
        // JÃ¡ inicializado? Retornar imediatamente
        if (this.isInitialized) {
          this.logger.debug('WebSocketManager jÃ¡ inicializado');
          resolve(true);
          return;
        }
        
        this.logger.info('Inicializando WebSocketManager...');
        
        // Limpar qualquer timeout existente
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
        }
        
        // Configurar timeout para evitar bloqueio na inicializaÃ§Ã£o
        this.initializationTimeout = setTimeout(() => {
          if (!this.isInitialized) {
            const error = new Error('Timeout ao inicializar WebSocketManager');
            this.initializationError = error;
            this.logger.warn('Timeout na inicializaÃ§Ã£o do WebSocketManager');
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
        
        // Limpar timeout se inicializaÃ§Ã£o bem-sucedida
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
          this.initializationTimeout = null;
        }
        
        this.logger.info('WebSocketManager inicializado com sucesso');
        resolve(true);
      } catch (error: any) {
        this.initializationError = error instanceof Error ? error : new Error(String(error));
        this.logger.error('Erro ao inicializar WebSocketManager', error);
        this.handleInitializationFailure();
        resolve(false);
      }
    });
  }
  
  /**
   * Lida com falha na inicializaÃ§Ã£o
   */
  private handleInitializationFailure(): void {
    // Limpar recursos que possam estar causando bloqueio
    this.cleanup();
    
    // Configurar estado mÃ­nimo para permitir que o app continue funcionando
    this.isInitialized = true; // Marcar como inicializado mesmo com erro
    this.fallbackMode = true;
    this.logger.warn('WebSocketManager operando em modo de fallback');
    
    // Tentar reconectar se nÃ£o excedeu o nÃºmero mÃ¡ximo de tentativas
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.serverUrl) {
      this.reconnectAttempts++;
      this.logger.info(`Tentativa de reconexÃ£o ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${this.reconnectInterval/1000}s...`);
      
      setTimeout(() => {
        this.initialize(this.serverUrl).then(success => {
          if (success) {
            this.logger.info('ReconexÃ£o bem-sucedida!');
            this.fallbackMode = false;
            this.reconnectAttempts = 0;
          }
        });
      }, this.reconnectInterval);
    }
  }
  
  /**
   * Verifica se o sistema estÃ¡ operando em modo de fallback
   */
  public isInFallbackMode(): boolean {
    return this.fallbackMode;
  }
  
  /**
   * ObtÃ©m o erro de inicializaÃ§Ã£o, se houver
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }
  
  // MÃ©todo legado removido para evitar duplicaÃ§Ã£o de cÃ³digo

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Adiciona uma conexÃ£o WebSocket com timeout e tratamento de erros
   */
  public addConnection(socket: WebSocket, subscriptions: string[] = []): string {
    try {
      // Verificar se o socket Ã© vÃ¡lido
      if (!socket) {
        throw new Error('Socket invÃ¡lido');
      }
      
      // Verificar se o sistema estÃ¡ inicializado
      if (!this.isInitialized) {
        this.logger.warn('Tentativa de adicionar conexÃ£o antes da inicializaÃ§Ã£o completa');
        // Continuar mesmo assim, mas com aviso
      }
      
      const id = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id,
        socket,
        lastPing: Date.now(),
        subscriptions: subscriptions.filter(sub => typeof sub === 'string'), // Garantir que sÃ£o strings vÃ¡lidas
      };

      this.connections.set(id, connection);

      // Configurar handlers da conexÃ£o com timeout
      this.setupConnectionHandlers(connection);

      this.logger.info(`Nova conexÃ£o WebSocket: ${id}`, { totalConnections: this.connections.size });

      // Configurar timeout para a conexÃ£o inicial
      const connectionTimeout = setTimeout(() => {
        if (this.connections.has(id) && socket.readyState !== WebSocket.OPEN) {
          this.logger.warn(`Timeout ao estabelecer conexÃ£o ${id}`);
          this.removeConnection(id);
        }
      }, this.connectionTimeoutMs);

      // Limpar timeout quando a conexÃ£o estiver aberta
      if (socket.readyState === WebSocket.OPEN) {
        clearTimeout(connectionTimeout);
        // Enviar dados iniciais
        this.sendInitialData(connection);
      } else {
        // Adicionar evento para quando a conexÃ£o abrir
        socket.addEventListener('open', () => {
          clearTimeout(connectionTimeout);
          // Enviar dados iniciais
          this.sendInitialData(connection);
        });
      }

      return id;
    } catch (error: any) {
      this.logger.error('Erro ao adicionar conexÃ£o WebSocket', error);
      // Retornar um ID temporÃ¡rio para evitar quebrar o fluxo do app
      return `error_${Date.now()}`;
    }
  }

  /**
   * Remove uma conexÃ£o WebSocket
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.close();
        }
      } catch (error: any) {
        this.logger.error('Erro ao fechar conexÃ£o', error);
      }

      this.connections.delete(connectionId);
      this.logger.info(`ConexÃ£o removida: ${connectionId}`);
    }
  }

  /**
   * Envia mensagem para uma conexÃ£o especÃ­fica com tratamento de erros
   */
  public sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    try {
      // Verificar se o sistema estÃ¡ inicializado
      if (!this.isInitialized) {
        this.logger.warn('Tentativa de enviar mensagem antes da inicializaÃ§Ã£o completa');
        // Adicionar Ã  fila para envio posterior
        this.queueMessage(message);
        return false;
      }
      
      // Verificar se a conexÃ£o existe
      const connection = this.connections.get(connectionId);
      if (!connection) {
        // Adicionar Ã  fila para envio posterior quando a conexÃ£o estiver disponÃ­vel
        this.queueMessage(message);
        return false;
      }
      
      // Verificar estado da conexÃ£o
      if (connection.socket.readyState !== WebSocket.OPEN) {
        this.logger.warn(`ConexÃ£o ${connectionId} nÃ£o estÃ¡ aberta`, { state: connection.socket.readyState });
        // Adicionar Ã  fila para envio posterior
        this.queueMessage(message);
        return false;
      }

      // Tentar enviar a mensagem com timeout
      return this.sendMessage(connection, message);
    } catch (error: any) {
      this.logger.error('Erro ao enviar mensagem para conexÃ£o', error);
      // Adicionar Ã  fila para tentativa posterior
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Transmite mensagem para todas as conexÃµes com tratamento de erros
   * @param message Mensagem a ser transmitida
   * @param filter Filtro opcional para selecionar conexÃµes especÃ­ficas
   * @param options OpÃ§Ãµes adicionais para o broadcast
   * @returns NÃºmero de mensagens enviadas com sucesso
   */
  public broadcast(
    message: WebSocketMessage,
    filter?: (connection: WebSocketConnection) => boolean,
    options: { skipQueue?: boolean, priority?: boolean } = {}
  ): number {
    try {
      // Verificar se o sistema estÃ¡ inicializado
      if (!this.isInitialized) {
        this.logger.warn('Tentativa de broadcast antes da inicializaÃ§Ã£o completa');
        // Adicionar Ã  fila para envio posterior, a menos que skipQueue seja true
        if (!options.skipQueue) {
          this.queueMessage(message);
        }
        return 0;
      }
      
      // Se estiver em modo de fallback, apenas enfileirar a mensagem
      if (this.fallbackMode && !options.priority) {
        this.logger.debug('Broadcast em modo de fallback, mensagem enfileirada');
        if (!options.skipQueue) {
          this.queueMessage(message);
        }
        return 0;
      }
      
      // Se nÃ£o houver conexÃµes, apenas enfileirar a mensagem
      if (this.connections.size === 0) {
        if (!options.skipQueue) {
          this.queueMessage(message);
        }
        return 0;
      }
      
      let sentCount = 0;
      let errors = 0;

      // Usar Promise.allSettled para nÃ£o bloquear em caso de erro em uma conexÃ£o
      const promises = Array.from(this.connections.entries()).map(([id, connection]) => {
        return new Promise<void>(resolve => {
          try {
            if (!filter || filter(connection)) {
              // Verificar estado da conexÃ£o
              if (connection.socket.readyState === WebSocket.OPEN) {
                if (this.sendMessage(connection, message)) {
                  sentCount++;
                } else {
                  errors++;
                }
              } else {
                // ConexÃ£o nÃ£o estÃ¡ aberta
                errors++;
              }
            }
          } catch (error: any) {
            this.logger.error(`Erro no broadcast para conexÃ£o ${id}`, error);
            errors++;
          }
          resolve();
        });
      });

      // Executar todas as promessas com timeout para nÃ£o bloquear
      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(resolve, 2000); // 2 segundos de timeout para broadcast
      });
      
      Promise.race([
        Promise.allSettled(promises),
        timeoutPromise
      ]).then(() => {
        if (errors > 0) {
          this.logger.warn(`Broadcast completado com ${errors} erros`, { sentCount });
        }
      });

      return sentCount;
    } catch (error: any) {
      this.logger.error('Erro ao fazer broadcast', error);
      // Adicionar Ã  fila para tentativa posterior
      if (!options.skipQueue) {
        this.queueMessage(message);
      }
      return 0;
    }
  }

  /**
   * Transmite para conexÃµes com inscriÃ§Ãµes especÃ­ficas
   */
  public broadcastToSubscribers(message: WebSocketMessage, subscription: string): number {
    return this.broadcast(message, connection => connection.subscriptions.includes(subscription));
  }

  /**
   * Adiciona mensagem Ã  fila (para quando nÃ£o hÃ¡ conexÃµes ativas)
   */
  public queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);

    // Limitar tamanho da fila
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue.shift(); // Remove a mensagem mais antiga
    }
  }

  /**
   * Processa fila de mensagens para novas conexÃµes
   */
  private processMessageQueue(connection: WebSocketConnection): void {
    // Enviar Ãºltimas 10 mensagens da fila para nova conexÃ£o
    const recentMessages = this.messageQueue.slice(-10);

    recentMessages.forEach(message => {
      this.sendMessage(connection, {
        ...message,
        type: `queued_${message.type}`,
      });
    });
  }

  /**
   * Configura handlers para uma conexÃ£o
   */
  private setupConnectionHandlers(connection: WebSocketConnection): void {
    const { socket, id } = connection;

    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(connection, message);
      } catch (error: any) {
        this.logger.error(`Erro ao processar mensagem de ${id}`, error);
      }
    };

    socket.onclose = () => {
      this.logger.info(`ConexÃ£o fechada: ${id}`);
      this.removeConnection(id);
    };

    socket.onerror = error => {
      this.logger.error(`Erro na conexÃ£o ${id}`, error);
      this.removeConnection(id);
    };
  }

  /**
   * Manipula mensagens recebidas
   */
  private handleMessage(connection: WebSocketConnection, message: any): void {
    if (!connection || !message) {
      this.logger.warn('Mensagem ou conexÃ£o invÃ¡lida');
      return;
    }
    
    const { id } = connection;
    
    // Atualizar timestamp do Ãºltimo ping para qualquer mensagem recebida
    connection.lastPing = Date.now();

    // Verificar se a mensagem tem um tipo vÃ¡lido
    if (!message.type || typeof message.type !== 'string') {
      this.logger.warn(`Mensagem sem tipo vÃ¡lido de ${id}`);
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
          // Filtrar apenas strings vÃ¡lidas
          const validSubscriptions = message.subscriptions.filter(
            (sub: any) => typeof sub === 'string'
          );
          
          connection.subscriptions = [
            ...new Set([...connection.subscriptions, ...validSubscriptions]),
          ];
          this.logger.info(`${id} se inscreveu em:`, { validSubscriptions });
        }
        break;

      case 'unsubscribe':
        if (message.subscriptions && Array.isArray(message.subscriptions)) {
          connection.subscriptions = connection.subscriptions.filter(
            sub => !message.subscriptions.includes(sub)
          );
          this.logger.info(`${id} cancelou inscriÃ§Ã£o em:`, { subscriptions: message.subscriptions });
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
        this.logger.warn(`Tipo de mensagem desconhecido de ${id}:`, { type: message.type });
    }
  }

  /**
   * Envia dados iniciais para nova conexÃ£o
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
   * Envia mensagem para uma conexÃ£o
   */
  private sendMessage(connection: WebSocketConnection, message: WebSocketMessage): boolean {
    if (!connection || !connection.socket) {
      this.logger.warn('Tentativa de enviar mensagem para conexÃ£o invÃ¡lida');
      return false;
    }
    
    try {
      // Verificar se a conexÃ£o estÃ¡ aberta
      if (connection.socket.readyState === WebSocket.OPEN) {
        // Garantir que a mensagem tenha um timestamp
        if (!message.timestamp) {
          message.timestamp = Date.now();
        }
        
        // Enviar a mensagem como JSON
        connection.socket.send(JSON.stringify(message));
        return true;
      } else {
        // ConexÃ£o nÃ£o estÃ¡ aberta
        this.logger.warn(`ConexÃ£o ${connection.id} nÃ£o estÃ¡ aberta`, { state: connection.socket.readyState });
        return false;
      }
    } catch (error: any) {
      this.logger.error(`Erro ao enviar mensagem para ${connection.id}`, error);
      // Remover conexÃ£o com problema
      this.removeConnection(connection.id);
      return false;
    }
  }

  /**
   * Inicia heartbeat para verificar conexÃµes
   */
  private startHeartbeat(): void {
    // Evita iniciar mÃºltiplos intervalos
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 segundos

      this.connections.forEach((connection, id) => {
        if (now - connection.lastPing > timeout) {
          this.logger.info(`Timeout da conexÃ£o ${id}`);
          this.removeConnection(id);
        }
      });
    }, 15000); // Verifica a cada 15 segundos
  }

  /**
   * Gera ID Ãºnico para conexÃ£o
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ObtÃ©m estatÃ­sticas das conexÃµes
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
   * Verifica a saÃºde do WebSocketManager
   * @returns Objeto com informaÃ§Ãµes sobre a saÃºde do sistema
   */
  public checkHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    details: string;
    canRecover: boolean;
  } {
    // Sistema nÃ£o inicializado Ã© considerado crÃ­tico
    if (!this.isInitialized) {
      return {
        status: 'critical',
        details: 'Sistema nÃ£o inicializado',
        canRecover: true
      };
    }
    
    // Em modo de fallback Ã© considerado degradado
    if (this.fallbackMode) {
      return {
        status: 'degraded',
        details: `Operando em modo de fallback. Tentativas de reconexÃ£o: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        canRecover: this.reconnectAttempts < this.maxReconnectAttempts
      };
    }
    
    // Verificar se hÃ¡ conexÃµes ativas
    const stats = this.getConnectionStats();
    if (stats.activeConnections === 0 && !this.isServer) {
      return {
        status: 'degraded',
        details: 'Sem conexÃµes ativas',
        canRecover: true
      };
    }
    
    // Sistema saudÃ¡vel
    return {
      status: 'healthy',
      details: `${stats.activeConnections} conexÃµes ativas, ${stats.queuedMessages} mensagens na fila`,
      canRecover: true
    };
  }
  
  /**
   * Tenta reconectar o sistema
   * @returns Promise que resolve para true se a reconexÃ£o for bem-sucedida
   */
  public async tryReconnect(): Promise<boolean> {
    if (!this.serverUrl) {
      this.logger.error('Não é possível reconectar: URL do servidor não definida');
      return false;
    }
    
    this.logger.info('Tentando reconectar ao servidor...');
    
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
    // Limpar timeout de inicializaÃ§Ã£o se existir
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
    
    // Limpar intervalo de heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Fechar todas as conexÃµes
    if (this.connections) {
      this.connections.forEach((_connection, id) => {
        this.removeConnection(id);
      });
    }

    // Limpar fila de mensagens se nÃ£o for para preservar
    if (!preserveQueue) {
      this.messageQueue = [];
    }
    
    this.logger.info('Recursos do WebSocketManager liberados');
  }
}

// InstÃ¢ncia singleton
export const webSocketManager = WebSocketManager.getInstance();

