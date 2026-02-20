/**
 * Declaração de tipo para o módulo ws
 */
declare module 'ws' {
  import { EventEmitter } from 'events';
  import * as http from 'http';
  import * as net from 'net';

  class WebSocket extends EventEmitter {
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;

    readyState: number;
    protocol: string;
    url: string;
    binaryType: string;
    bufferedAmount: number;

    constructor(address: string, protocols?: string | string[], options?: WebSocket.ClientOptions);

    close(code?: number, data?: string): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    send(data: any, options: { mask?: boolean; binary?: boolean }, cb?: (err?: Error) => void): void;
    terminate(): void;
  }

  namespace WebSocket {
    interface ClientOptions {
      protocol?: string;
      handshakeTimeout?: number;
      perMessageDeflate?: boolean | PerMessageDeflateOptions;
      localAddress?: string;
      protocolVersion?: number;
      headers?: { [key: string]: string };
      origin?: string;
      agent?: http.Agent;
      host?: string;
      family?: number;
      checkServerIdentity?(servername: string, cert: { subject: { CN: string } }): boolean;
      rejectUnauthorized?: boolean;
      maxPayload?: number;
    }

    interface PerMessageDeflateOptions {
      serverNoContextTakeover?: boolean;
      clientNoContextTakeover?: boolean;
      serverMaxWindowBits?: number;
      clientMaxWindowBits?: number;
      zlibDeflateOptions?: { level?: number; memLevel?: number; strategy?: number };
      zlibInflateOptions?: object;
      threshold?: number;
      concurrencyLimit?: number;
    }

    interface ServerOptions {
      host?: string;
      port?: number;
      backlog?: number;
      server?: http.Server;
      verifyClient?: VerifyClientCallbackSync | VerifyClientCallbackAsync;
      handleProtocols?: (protocols: string[], request: http.IncomingMessage) => string | false;
      path?: string;
      noServer?: boolean;
      clientTracking?: boolean;
      perMessageDeflate?: boolean | PerMessageDeflateOptions;
      maxPayload?: number;
    }

    interface AddressInfo {
      address: string;
      family: string;
      port: number;
    }

    interface VerifyClientCallbackSync {
      (info: { origin: string; secure: boolean; req: http.IncomingMessage }): boolean;
    }

    interface VerifyClientCallbackAsync {
      (info: { origin: string; secure: boolean; req: http.IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void): void;
    }

    type Data = string | Buffer | ArrayBuffer | Buffer[];

    class Server extends EventEmitter {
      options: ServerOptions;
      path: string;
      clients: Set<WebSocket>;

      constructor(options?: ServerOptions, callback?: () => void);
      constructor(port: number, callback?: () => void);
      constructor(host: string, port: number, callback?: () => void);

      address(): AddressInfo | string;
      close(cb?: (err?: Error) => void): void;
      handleUpgrade(request: http.IncomingMessage, socket: net.Socket, upgradeHead: Buffer, callback: (client: WebSocket, request: http.IncomingMessage) => void): void;
      shouldHandle(request: http.IncomingMessage): boolean;

      // Events
      on(event: 'connection', cb: (socket: WebSocket, request: http.IncomingMessage) => void): this;
      on(event: 'error', cb: (error: Error) => void): this;
      on(event: 'headers', cb: (headers: string[], request: http.IncomingMessage) => void): this;
      on(event: 'listening', cb: () => void): this;
      on(event: string, listener: (...args: any[]) => void): this;

      once(event: 'connection', cb: (socket: WebSocket, request: http.IncomingMessage) => void): this;
      once(event: 'error', cb: (error: Error) => void): this;
      once(event: 'headers', cb: (headers: string[], request: http.IncomingMessage) => void): this;
      once(event: 'listening', cb: () => void): this;
      once(event: string, listener: (...args: any[]) => void): this;

      off(event: string, listener: (...args: any[]) => void): this;

      get listening(): boolean;
    }
  }

  export = WebSocket;
}