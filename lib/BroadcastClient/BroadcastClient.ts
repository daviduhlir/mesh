import { client as WebSocketClient, connection as WebSocketConnection } from 'websocket'
import { EventEmitter } from 'events'
import { CLIENT_CONNECTION_EVENTS } from './constants'

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

  constructor(configuration: Partial<ClientConfiguration>) {
    super()
    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }
    this.wsClient = new WebSocketClient()
    this.resetConnection()
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
    this.currentConnection.sendUTF(JSON.stringify(data))
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

    const tryConnection = async () => {
      try {
        await this.connect(this.configuration.urls[this.connectionAttemp.urlIndex])
      } catch(e) {
        this.connectionAttemp.attempNumber++
        if (this.connectionAttemp.attempNumber > this.configuration.maxAttemps) {
          this.connectionAttemp.urlIndex = this.connectionAttemp.attempNumber + 1 % this.configuration.urls.length
        }
        await tryConnection()
      }
    }

    await tryConnection()
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
        this.emit(CLIENT_CONNECTION_EVENTS.MESSAGE, JSON.parse(message.utf8Data))
      } catch(e) {
        // TODO what to do if message is not parsable?
      }
    }
    else if (message.type === 'binary') {
      // TODO can't handle this type of data for this moment
    }
  }

}
