import { EventEmitter } from 'events';
import * as http from 'http';
import WebSocket, { WebSocketServer as WSServer } from 'ws';

/**
 * Constantes de estado do WebSocket (compatível com ws)
 */
const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/**
 * Servidor WebSocket para comunicação em tempo real
 */
export class WebSocketServer extends EventEmitter {
  private server: WSServer;
  private readonly port: number;

  constructor(port: number) {
    super();
    this.port = port;
    this.server = new WSServer({ port });
    this.setupEventListeners();
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`WebSocket server started on port ${this.port}`);
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private setupEventListeners(): void {
    this.server.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      console.log(`New connection from ${req.socket.remoteAddress}`);

      ws.on('message', (message) => {
        this.emit('message', message.toString(), ws);
      });

      ws.on('close', () => {
        console.log(`Disconnected: ${req.socket.remoteAddress}`);
        this.emit('disconnect', ws);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error: ${error.message}`);
        this.emit('error', error, ws);
      });

      this.emit('connection', ws, req);
    });

    this.server.on('error', (error: Error) => {
      console.error(`Server error: ${error.message}`);
      this.emit('error', error);
    });

    this.server.on('listening', () => {
      console.log(`Server listening on port ${this.port}`);
      this.emit('listening');
    });
  }

  public broadcast(message: string | object): void {
    const data = typeof message === 'string' ? message : JSON.stringify(message);

    this.server.clients.forEach((client: WebSocket) => {
      if (client.readyState === WS_READY_STATE.OPEN) {
        client.send(data);
      }
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Server closed');
        resolve();
      });
    });
  }

  public getConnectionCount(): number {
    return this.server.clients.size;
  }
}