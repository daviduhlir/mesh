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

  public send(data: any, type: 'utf8' | 'binary' = 'utf8') {
    if (type === 'utf8') {
      this.connection.sendUTF(data);
    }
    else if (type === 'binary') {
      this.connection.sendBytes(data);
    }
  }

  public destroy() {
    this.removeAllListeners()
  }

  protected onMessage = (message) => {
    this.emit(SERVER_CONNECTION_EVENTS.MESSAGE, this, message)
  }

  protected onClose = () => {
    console.log(`Mesh Peer ${this.connection.remoteAddress} disconnected`);
    this.emit(SERVER_CONNECTION_EVENTS.CLOSE, this)
    this.destroy()
  }
}
