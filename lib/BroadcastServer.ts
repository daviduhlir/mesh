import { server as WebSocketServer, request as WebSocketRequest } from 'websocket'
import * as http from 'http'
import { EventEmitter } from 'events'
import { CONNECTION_EVENTS } from './utils/constants'
import { Connection } from './Connection'

export interface ServerConfiguration {
  port: number
  host: string
  allowOrigin: (origin: string) => boolean
}

export const defaultConfiguration: ServerConfiguration = {
  port: 8080,
  host: '127.0.0.1',
  allowOrigin: (origin) => true
}

export class BroadcastServer extends EventEmitter {
  protected httpServer: http.Server
  protected wsServer: WebSocketServer
  protected configuration: ServerConfiguration
  protected children: Connection[] = []

  constructor(public readonly id, configuration: Partial<ServerConfiguration>) {
    super()
    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }
  }

  /**
   * Initialize connection
   */
  public async initialize() {
    await this.initHttpServer()
    await this.initWsServer()
  }

  /**
   * Get all connections
   */
  public getConnections(): Connection[] {
    return this.children
  }

  /**
   * Init all server things
   */
  protected async init() {
    await this.initHttpServer()
    await this.initWsServer()
  }

  /**
   * Init HTTP listener
   */
  protected async initHttpServer() {
    this.httpServer = http.createServer((request, response) => {
      response.writeHead(404);
      response.end();
    });

    await (new Promise((resolve: (value) => void, reject: (error) => void) => {
      this.httpServer.listen(this.configuration.port, this.configuration.host, () => resolve(null))
    }))

    console.log(`Mesh Server is listening on port ${this.configuration.host}:${this.configuration.port}`)
  }

  /**
   * Init WS listener
   */
  protected async initWsServer() {
    this.wsServer = new WebSocketServer({
      httpServer: this.httpServer,
      autoAcceptConnections: false
    });
    this.wsServer.on('request', this.handleIncommingConnection)
  }

  /**
   * New client connected
   */
  protected handleIncommingConnection = (request: WebSocketRequest) => {
    if (!this.configuration.allowOrigin(request.origin)) {
      request.reject()
      console.log('Mesh Connection from origin ' + request.origin + ' rejected')
      return;
    }

    const connection = new Connection(request.accept('echo-protocol', request.origin))
    connection.on(CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)
    connection.on(CONNECTION_EVENTS.CLOSE, this.handleConnectionClose)
    connection.on(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleHandshakeDone)
    this.children.push(connection)

    this.emit(CONNECTION_EVENTS.OPEN)

    connection.send({
      MESH_HANDSHAKE: this.id,
    })
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = (connection: Connection, data: any) => {
    this.emit(CONNECTION_EVENTS.MESSAGE, connection, data)
  }

  /**
   * Client disconnected
   */
  protected handleConnectionClose = (connection: Connection) => {
    this.emit(CONNECTION_EVENTS.CLOSE, connection)
    this.children = this.children.filter(c => c !== connection)
  }

  /**
   * Client disconnected
   */
  protected handleHandshakeDone = (connection: Connection) => {
    if (this.children.every(c => c?.id)) {
      this.emit(CONNECTION_EVENTS.HANDSHAKE_COMPLETE)
    }
  }
}