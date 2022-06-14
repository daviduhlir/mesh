import { server as WebSocketServer, request as WebSocketRequest, connection as WebSocketConnection } from 'websocket'
import * as http from 'http'
import { promisify } from 'util'
import { EventEmitter } from 'events'
import { CONNECTION_EVENTS } from './utils/constants'

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
  protected children: {connection: WebSocketConnection; id: string;}[] = []

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
  public send(data: any, sender?: WebSocketConnection) {
    const dataStringify = JSON.stringify(data)
    for(const child of this.children) {
      if (child.connection === sender) {
        continue;
      }
      child.connection.sendUTF(dataStringify)
    }
  }

  /**
   * Get handshaken ID by connection ref
   */
  public getIdByConnection(connection: WebSocketConnection) {
    return this.children.find(c => c.connection === connection)?.id
  }

  /**
   * get all connections
   */
  /*public getConnections(): WebSocketConnection[] {
    return this.connections
  }*/

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

    const connection = request.accept('echo-protocol', request.origin)

    connection.on('message', this.handleIncommingMessage.bind(this, connection))
    connection.on('close', this.handleConnectionClose.bind(this, connection))

    this.emit(CONNECTION_EVENTS.OPEN, connection)
    this.children.push({connection, id: null})
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = (connection: WebSocketConnection, message: any) => {
    if (message.type === 'utf8') {
      try {
        const data = JSON.parse(message.utf8Data)
        if (data.MESH_HANDSHAKE) {
          const found = this.children.find(c => c.connection === connection)
          if (found) {
            found.id = data.MESH_HANDSHAKE
          }

          if (this.children.every(c => c.id !== null)) {
            console.log('HANDSHAKE_COMPLETE', `${this.configuration.host}:${this.configuration.port}`, this.children.map(c => c.id))
          }
        } else {
          this.emit(CONNECTION_EVENTS.MESSAGE, data, connection)
        }
      } catch(e) {
        // TODO what to do if message is not parsable?
      }
    }
  }

  /**
   * Client disconnected
   */
  protected handleConnectionClose = (connection: WebSocketConnection) => {
    this.emit(CONNECTION_EVENTS.CLOSE, connection)
    this.children = this.children.filter(c => c.connection !== connection)
  }
}