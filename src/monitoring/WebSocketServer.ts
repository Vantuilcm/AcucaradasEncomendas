import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import * as http from 'http';

/**
 * Servidor WebSocket para comunicação em tempo real
 */
export class WebSocketServer extends EventEmitter {
  private server: WebSocket.Server;
  private readonly port: number; // Porta é mantida para referência e logging

  /**
   * Cria uma nova instância do servidor WebSocket
   * @param port Porta para o servidor escutar
   */
  constructor(port: number) {
    super();
    this.port = port;
    this.server = new WebSocket.Server({ port });
    this.setupEventListeners();
  }

  /**
   * Inicia o servidor WebSocket e retorna uma Promise que resolve quando o servidor estiver pronto
   * @returns Promise que resolve quando o servidor estiver pronto
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Se o servidor já estiver ouvindo, resolve imediatamente
        if (this.server.listening) {
          console.log(`WebSocket server already listening on port ${this.port}`);
          resolve();
          return;
        }

        // Configura um listener de evento único para 'listening'
        this.server.once('listening', () => {
          console.log(`WebSocket server listening on port ${this.port}`);
          resolve();
        });

        // Configura um listener de evento único para 'error'
        this.server.once('error', (error: Error) => {
          console.error(`WebSocket server error: ${error.message}`);
          reject(error);
        });
        
        // Definir um timeout para evitar bloqueio indefinido
        const timeout = setTimeout(() => {
          reject(new Error(`WebSocket server start timeout on port ${this.port}`));
        }, 5000); // 5 segundos de timeout
        
        // Limpar o timeout quando a Promise for resolvida ou rejeitada
        this.once('listening', () => clearTimeout(timeout));
        this.once('error', () => clearTimeout(timeout));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Configura os listeners de eventos para o servidor WebSocket
   */
  private setupEventListeners(): void {
    this.server.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
      
      ws.on('message', (message: WebSocket.Data) => {
        this.emit('message', message, ws);
      });

      ws.on('close', () => {
        console.log(`WebSocket connection closed from ${req.socket.remoteAddress}`);
        this.emit('disconnect', ws);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error: ${error.message}`);
        this.emit('error', error, ws);
      });

      this.emit('connection', ws, req);
    });

    this.server.on('error', (error: Error) => {
      console.error(`WebSocket server error: ${error.message}`);
      this.emit('error', error);
    });

    this.server.on('listening', () => {
      console.log(`WebSocket server listening on port ${this.port}`);
      this.emit('listening');
    });
  }

  /**
   * Envia uma mensagem para todos os clientes conectados
   * @param message Mensagem a ser enviada
   */
  public broadcast(message: string | object): void {
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Fecha o servidor WebSocket
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }

  /**
   * Retorna o número de clientes conectados
   */
  public getConnectionCount(): number {
    return this.server.clients.size;
  }
}