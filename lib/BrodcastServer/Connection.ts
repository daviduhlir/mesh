import { connection as WebSocketConnection } from 'websocket'
import { EventEmitter } from 'events'
import { SERVER_CONNECTION_EVENTS } from './constants';

export class Connection extends EventEmitter {
  constructor(
    public readonly connection: WebSocketConnection,
  ) {
    super()
    connection.on('message', this.onMessage);
    connection.on('close', this.onClose);
  }

  public send(data: any) {
    this.connection.sendUTF(JSON.stringify(data))
  }

  public destroy() {
    this.removeAllListeners()
  }

  protected onMessage = (message) => {
    if (message.type === 'utf8') {
      try {
        this.emit(SERVER_CONNECTION_EVENTS.MESSAGE, this, JSON.parse(message.utf8Data))
      } catch(e) {
        // TODO what to do if message is not parsable?
      }
    }
  }

  protected onClose = () => {
    console.log(`Mesh Peer ${this.connection.remoteAddress} disconnected`);
    this.emit(SERVER_CONNECTION_EVENTS.CLOSE, this)
    this.destroy()
  }
}
