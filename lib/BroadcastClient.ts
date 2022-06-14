import { client as WebSocketClient, connection as WebSocketConnection } from 'websocket'
import { EventEmitter } from 'events'
import { CONNECTION_EVENTS } from './utils/constants'
import { randomHash } from './utils'

export interface ClientConfiguration {
  urls: string[]
  maxAttemps: number
}

export const defaultConfiguration: ClientConfiguration = {
  urls: [],
  maxAttemps: 3,
}

export class BroadcastClient extends EventEmitter {
  protected wsClient: WebSocketClient
  protected configuration: ClientConfiguration
  protected currentConnection: WebSocketConnection
  protected connectionAttemp = {
    attempNumber: 0,
    urlIndex: 0,
  }

  public readonly id = randomHash()

  constructor(configuration: Partial<ClientConfiguration>) {
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
   public getConnection(): WebSocketConnection {
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
    if (this.isConnected) {
      this.currentConnection.sendUTF(JSON.stringify(data))
    }
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

    console.log('SENDING_HANDSHAKE', this.id)
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

    this.currentConnection = await (new Promise((resolve: (connection: WebSocketConnection) => void, reject: (error) => void) => {
      const handleOnConnect = (connection: WebSocketConnection) => {
        this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
        this.wsClient.removeListener('connect', handleOnConnect)
        resolve(connection)
      }

      const handleOnConnectionFailed = (error: Error) => {
        this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
        this.wsClient.removeListener('connect', handleOnConnect)
        reject(error)
      }

      this.wsClient.addListener('connectFailed', handleOnConnectionFailed);
      this.wsClient.addListener('connect', handleOnConnect)

      this.wsClient.connect(requestedUrl, 'echo-protocol')
    }))

    this.currentConnection.on('error', this.handleOnConnectionError)
    this.currentConnection.on('close', this.handleOnConnectionClose)
    this.currentConnection.on('message', this.handleOnMessage)

    this.emit(CONNECTION_EVENTS.OPEN, this.currentConnection)
    return this.currentConnection
  }

  /**
   * On connection error -> will retry to connect
   */
  protected handleOnConnectionError = (message) => {
    this.resetConnection()
  }

  /**
   * Connection was closed
   */
  protected handleOnConnectionClose = () => {
    // TODO connection closed... it's finished
    this.close()
  }

  /**
   * Message handler
   */
  protected handleOnMessage = (message) => {
    if (message.type === 'utf8') {
      try {
        this.emit(CONNECTION_EVENTS.MESSAGE, JSON.parse(message.utf8Data), this.currentConnection)
      } catch(e) {
        // TODO what to do if message is not parsable?
      }
    }
    else if (message.type === 'binary') {
      // TODO can't handle this type of data for this moment
    }
  }

}
