import { BroadcastServer } from './BroadcastServer'
import { BroadcastClient } from './BroadcastClient'
import { CONNECTION_EVENTS } from './utils/constants'
import { arrayUnique, randomHash } from './utils'
import { Connection } from './Connection'
import { EventEmitter } from 'events'

export const BROADCAST_EVENTS = {
  MESSAGE: 'MESSAGE'
}

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

export class BroadcastService extends EventEmitter {
  protected configuration: BrodcastServiceConfiguration
  protected server: BroadcastServer
  protected client: BroadcastClient
  protected nodesList: string[] = []

  protected id// readonly id: string = randomHash()

  constructor(configuration: Partial<BrodcastServiceConfiguration>) {
    super()

    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }
    this.id = configuration.serverPort // TODO remove it after debug

    this.server = new BroadcastServer(this.id, {
      port: this.configuration.serverPort,
      host: this.configuration.serverHost,
      allowOrigin: this.configuration.serverAllowOrigin,
    })

    this.client = new BroadcastClient(this.id, {
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
    this.server.on(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange)
    this.client.on(CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)
    this.client.on(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange)

    await this.server.initialize()
    await this.client.initialize()

    this.updateNodesList()
  }

  /**
   * get all connections
   */
  public getConnections(): Connection[] {
    return this.server.getConnections()
      .concat([this.client.getConnection()])
      .filter(Boolean)
      .filter((value, index, self) => self.findIndex(i => i.id === value.id) === index)
  }

  /**
   * Get list of nodes
   */
  public async getNodesList(): Promise<string[]> {
    return this.nodesList
  }

  /**
   * Broadcast message
   */
  public broadcast(message: any) {
    this.broadcastInternalMessage({
      DATA_MESSAGE: message,
    })
  }

  /**
   * On new connection or closed some
   */
  protected handleNodesConnectionsChange = async (connection: Connection) => {
    this.updateNodesList()
    this.broadcastInternalMessage({
      UPDATE_NODE_LIST: true
    })
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = async (connection: Connection, message: any) => {
    if (message.MESSAGE_LIST_NODES) {
      connection.send({
        MESSAGE_ID_RESULT: message.MESSAGE_ID,
        LIST: arrayUnique([...message.LIST, ...(await this.listAllConnections(connection.id))]),
      })
    } if (message.BROADCAST_MESSAGE) {
      if ((message.TARGET_NODES_LIST as string[]).includes(this.id)) {

        if (message.DATA_MESSAGE) {
          console.log(this.id, 'Received', message)
          this.emit(BROADCAST_EVENTS.MESSAGE, message.DATA_MESSAGE)
        } else {
          this.handleInternalMessage(message)
        }

        this.sendToAll({
          ...message,
          TARGET_NODES_LIST: message.TARGET_NODES_LIST.filter(t => t!== this.id)
        }, connection.id)
      }
    } else {
      // TODO anything else!
    }
  }

  protected handleInternalMessage(message: any) {
    if (message.UPDATE_NODE_LIST) {
      this.updateNodesList()
    }
  }

  /**
   * Broadcast message
   */
   public broadcastInternalMessage(message: any) {
    this.sendToAll({
      TARGET_NODES_LIST: this.nodesList,
      ...message,
    })
  }

  /************************************
   *
   * Broadcast utils
   *
   ************************************/

  /**
   * List single connection
   */
   protected async sendWithResult(connection: Connection, message: any) {
    const MESSAGE_ID = randomHash()
    return new Promise((resolve: (response: any) => void, reject: (error) => void) => {

      const handleMessage = (_: Connection, message: any) => {
        if (message.MESSAGE_ID_RESULT === MESSAGE_ID) {
          connection.removeListener(CONNECTION_EVENTS.MESSAGE, handleMessage)
          resolve(message)
        }
      }

      connection.addListener(CONNECTION_EVENTS.MESSAGE, handleMessage)
      connection.send({
        MESSAGE_ID,
        ...message,
      })
    })
  }

  protected sendToAll(message: any, excludedId?: string) {
    const allConnections = this.getConnections().filter(c => c?.id && c?.id !== excludedId)
    for(const listConnection of allConnections) {
      listConnection.send({
        BROADCAST_MESSAGE: true,
        ...message,
      })
    }
  }

  /************************************
   *
   * Listing utils
   *
   ************************************/

  /**
   * Get list of nodes from all my connectors
   */
  protected async listAllConnections(excludedId?: string) {
    let list = []
    const allConnections = this.getConnections().filter(c => c?.id && c?.id !== excludedId)
    for(const listConnection of allConnections) {
      list = arrayUnique([...list, ...(await this.listConnection(listConnection))])
    }
    return list
  }

  /**
   * List single connection
   */
  protected async listConnection(connection: Connection) {
    const result = await this.sendWithResult(connection, {
      MESSAGE_LIST_NODES: true,
      LIST: [...this.getConnections().map(c => c.id), this.id],
    })
    return result.LIST
  }

  /**
   * Update nodes list by listing in net
   */
  protected async updateNodesList() {
    this.nodesList = await this.listAllConnections()
  }
}
