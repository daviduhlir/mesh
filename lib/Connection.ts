import { connection as WebSocketConnection } from 'websocket'
import { EventEmitter } from 'events'
import { CONNECTION_EVENTS } from './utils/constants'

export class Connection extends EventEmitter {
  protected internalId: string

  constructor(
    public readonly connection: WebSocketConnection
  ) {
    super()
    connection.on('message', this.handleIncommingMessage)
    connection.on('error', (error) => this.emit(CONNECTION_EVENTS.ERROR, this, error))
    connection.on('close', () => this.emit(CONNECTION_EVENTS.CLOSE, this))
  }

  public get id(): string {
    return this.internalId
  }

  public handshake(id: string) {
    this.internalId = id
  }

  public get connected(): boolean {
    return this.connection?.connected
  }

  public close() {
    this.connection.removeAllListeners()
    return this.connection.close()
  }

  /**
   * Send data
   */
  public send(data: any) {
    if (this.connection.connected) {
      this.connection.sendUTF(JSON.stringify(data))
    }
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = (message: any) => {
    if (message.type === 'utf8') {
      try {
        const data = JSON.parse(message.utf8Data)
        // listen handshake!!
        if (data.MESH_HANDSHAKE) {
          this.handshake(data.MESH_HANDSHAKE)
          this.emit(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this)
        } else {
          this.emit(CONNECTION_EVENTS.MESSAGE, this, data)
        }
      } catch(e) {}
    }
  }
}
