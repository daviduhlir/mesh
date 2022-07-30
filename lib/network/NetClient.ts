import { client as WebSocketClient, connection as WebSocketConnection } from 'websocket'
import { EventEmitter } from 'events'
import { CONNECTION_EVENTS } from '../utils/constants'
import { Connection } from './Connection'

export interface ClientConfiguration {
  urls: string[]
  maxAttemps: number
}

export const defaultConfiguration: ClientConfiguration = {
  urls: [],
  maxAttemps: 3,
}

export class NetClient extends EventEmitter {
  protected wsClient: WebSocketClient
  protected configuration: ClientConfiguration
  protected currentConnection: Connection
  protected connectionAttemp = {
    attempNumber: 0,
    urlIndex: 0,
  }

  constructor(public readonly id, configuration: Partial<ClientConfiguration>) {
    super()
    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }
    this.wsClient = new WebSocketClient()
  }

  /**
   * get connection
   */
   public getConnection(): Connection {
    return this.currentConnection
  }

  /**
   * Initialize connection
   */
  public async initialize() {
    await this.resetConnection()
  }

  /**
   * Check if we are connected
   */
  public get isConnected(): boolean {
    return this.currentConnection?.connected
  }

  /**
   * Close this connection
   */
  public close() {
    if (this.currentConnection) {
      this.currentConnection.removeAllListeners()
    }
    if (this.currentConnection?.connected) {
      this.currentConnection.close()
    }
    this.currentConnection = null
  }

  /**
   * Send data
   */
  public send(data: any) {
    return this.currentConnection.send(data)
  }

  /**
   * Reset connection, try all urls in configuration
   */
  protected async resetConnection() {
    this.close()
    this.connectionAttemp.attempNumber = 0

    if (!this.configuration.urls.length) {
      return
    }

    await (new Promise((resolve: (value) => void, reject: (error) => void) => {
      const tryConnection = async () => {
        try {
          const connection = await this.connect(this.configuration.urls[this.connectionAttemp.urlIndex])
          resolve(connection)
        } catch(e) {
          this.connectionAttemp.attempNumber++
          if (this.connectionAttemp.attempNumber > this.configuration.maxAttemps) {
            this.connectionAttemp.urlIndex = this.connectionAttemp.urlIndex + 1 % this.configuration.urls.length
          }
          setTimeout(() => tryConnection(), 1000)
        }
      }

      tryConnection()
    }))

    this.send({
      MESH_HANDSHAKE: this.id,
    })
  }

  /**
   * Connect to specific URL
   */
  protected async connect(requestedUrl: string) {
    if (this.isConnected) {
      this.close()
    }

    const secret = requestedUrl.indexOf('@') === -1 ? '' : requestedUrl.split('@')[0]
    const url = requestedUrl.indexOf('@') === -1 ? requestedUrl : requestedUrl.split('@')[1]

    this.currentConnection = await (new Promise((resolve: (connection: Connection) => void, reject: (error) => void) => {
      const handleOnConnect = (connection: WebSocketConnection) => {
        const newConnection = new Connection(connection)

        this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
        this.wsClient.removeListener('connect', handleOnConnect)
        resolve(newConnection)
      }

      const handleOnConnectionFailed = (error: Error) => {
        this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
        this.wsClient.removeListener('connect', handleOnConnect)
        reject(error)
      }

      this.wsClient.addListener('connectFailed', handleOnConnectionFailed);
      this.wsClient.addListener('connect', handleOnConnect)

      this.wsClient.connect(url, 'echo-protocol', undefined, {
        'net-secret': secret,
      })
    }))

    this.currentConnection.on(CONNECTION_EVENTS.ERROR, this.handleOnConnectionError)
    this.currentConnection.on(CONNECTION_EVENTS.CLOSE, this.handleOnConnectionClose)
    this.currentConnection.on(CONNECTION_EVENTS.MESSAGE, this.handleOnMessage)
    this.currentConnection.on(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleHandshakeComplete)

    this.emit(CONNECTION_EVENTS.OPEN, this.currentConnection)
    return this.currentConnection
  }

  /**
   * On connection error -> will retry to connect
   */
  protected handleOnConnectionError = (connection: Connection, message: any) => {
    this.resetConnection()
  }

  /**
   * Connection was closed
   */
  protected handleOnConnectionClose = (connection: Connection) => {
    this.resetConnection()
  }

  /**
   * Message handler
   */
  protected handleOnMessage = (connection: Connection, message: any) => {
    this.emit(CONNECTION_EVENTS.MESSAGE, connection, message)
  }

  /**
   * Handshake handler
   */
  protected handleHandshakeComplete = (connection: Connection) => {
    this.emit(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, connection)
  }

}
