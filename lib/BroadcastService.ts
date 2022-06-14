import { connection as WebSocketConnection } from 'websocket'
import { BroadcastServer } from './BroadcastServer'
import { BroadcastClient } from './BroadcastClient'
import { CONNECTION_EVENTS } from './utils/constants'

export interface BrodcastServiceConfiguration {
  nodesUrls: string[]
  maxConnectionAttemps: number
  serverPort: number
  serverHost: string
  serverAllowOrigin: (origin: string) => boolean
}

export const defaultConfiguration: BrodcastServiceConfiguration = {
  nodesUrls: ['ws://127.0.0.1:8080'],
  maxConnectionAttemps: 3,
  serverPort: 8080,
  serverHost: '127.0.0.1',
  serverAllowOrigin: (origin) => true
}

export class BroadcastService {
  protected configuration: BrodcastServiceConfiguration
  protected server: BroadcastServer
  protected client: BroadcastClient

  constructor(configuration: Partial<BrodcastServiceConfiguration>) {
    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }

    this.server = new BroadcastServer({
      port: this.configuration.serverPort,
      host: this.configuration.serverHost,
      allowOrigin: this.configuration.serverAllowOrigin,
    })

    this.client = new BroadcastClient({
      urls: this.configuration.nodesUrls,
      maxAttemps: this.configuration.maxConnectionAttemps,
    })
  }

  /**
   * Initialize connection
   */
  public async initialize() {
    this.server.on(CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)
    this.server.on(CONNECTION_EVENTS.CLOSE, this.handleNodesConnectionsChange)
    this.server.on(CONNECTION_EVENTS.OPEN, this.handleNodesConnectionsChange)
    this.client.on(CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)

    await this.server.initialize()
    await this.client.initialize()
  }

  /**
   * get all connections
   */
  /*public getConnections(): WebSocketConnection[] {
    return this.server.getConnections().concat([this.client.getConnection()])
  }*/

  /**
   * Send data
   */
  protected emit(data: any, sender?: WebSocketConnection) {
    this.server.send(data, sender)
    if (this.client.getConnection() !== sender) {
      this.client.send(data)
    }
  }

  /**
   * Send data
   */
  /*protected response(data: any, sender?: WebSocketConnection) {
    this.server.send(data, sender)
    if (this.client.getConnection() !== sender) {
      this.client.send(data)
    }
  }*/

  /**
   * Message received
   */
  protected handleIncommingMessage = (message: any, connection: WebSocketConnection) => {
    /*if (message.NEW_NODE) {
      this.nodesList = arrayUnique([...this.nodesList, message.NEW_NODE])
      console.log(this.id, this.nodesList)

      if (!arrayIsSame(this.nodesList, message.RESPONDERS)) {
        this.emit({
          ...message,
          RESPONDERS: arrayUnique([...message.RESPONDERS, this.id])
        }, connection)
      }
    }*/

    // welcome
    /*if (Array.isArray(message?.NODES_LIST)) {
      this.nodesList = arrayUnique([...this.nodesList, ...message.NODES_LIST])
      console.log(this.id, this.nodesList, message.RESPONDERS)

      // proxy it, if responders is not same as list of nodes
      if (!arrayIsSame(this.nodesList, message.RESPONDERS)) {
        this.emit({
          NODES_LIST: this.nodesList,
          RESPONDERS: arrayUnique([...message.RESPONDERS, this.id])
        })
      }
    }*/
  }

  /**
   * On new connection or closed some
   */
  protected handleNodesConnectionsChange = (connection: WebSocketConnection) => {
  }
}
