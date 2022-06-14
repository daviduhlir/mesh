import { server as WebSocketServer, request as WebSocketRequest } from 'websocket'
import * as http from 'http'
import { promisify } from 'util'
import { Connection } from './Connection'
import { EventEmitter } from 'events'
import { SERVER_CONNECTION_EVENTS } from './constants'

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

export class BrodcastServer extends EventEmitter {
  protected httpServer: http.Server
  protected wsServer: WebSocketServer
  protected configuration: ServerConfiguration
  protected connections: Connection[] = []

  constructor(configuration: Partial<ServerConfiguration>) {
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
   * Send data
   */
  public send(data: any) {
    for(const connection of this.connections) {
      connection.send(data)
    }
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
    await promisify<number, string>(this.httpServer.listen)(this.configuration.port, this.configuration.host)
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

    const connection = request.accept('echo-protocol', request.origin)

    const handler = new Connection(connection)
    handler.on(SERVER_CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)
    handler.on(SERVER_CONNECTION_EVENTS.CLOSE, this.handleConnectionClose)

    this.emit(SERVER_CONNECTION_EVENTS.NEW_CONNECTION, handler)

    this.connections.push(handler)
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = (connection: Connection, data: any) => {
    this.emit(SERVER_CONNECTION_EVENTS.MESSAGE, data)
  }

  /**
   * Client disconnected
   */
  protected handleConnectionClose = (connection: Connection) => {
    this.emit(SERVER_CONNECTION_EVENTS.CLOSE, connection)
    this.connections = this.connections.filter(c => c !== connection)
  }
}