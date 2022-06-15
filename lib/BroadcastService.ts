import { BroadcastServer } from './BroadcastServer'
import { BroadcastClient } from './BroadcastClient'
import { CONNECTION_EVENTS } from './utils/constants'
import { arrayUnique, randomHash } from './utils'
import { Connection } from './Connection'
import { EventEmitter } from 'events'

export const BROADCAST_EVENTS = {
  MESSAGE: 'MESSAGE'
}

export interface BroadcastServiceConfiguration {
  nodesUrls: string[]
  maxConnectionAttemps: number
  serverPort: number
  serverHost: string
  serverAllowOrigin: (origin: string) => boolean
}

export const defaultConfiguration: BroadcastServiceConfiguration = {
  nodesUrls: ['ws://127.0.0.1:8080'],
  maxConnectionAttemps: 3,
  serverPort: 8080,
  serverHost: '127.0.0.1',
  serverAllowOrigin: (origin) => true
}

export class BroadcastService extends EventEmitter {
  protected configuration: BroadcastServiceConfiguration
  protected server: BroadcastServer
  protected client: BroadcastClient
  protected nodesList: string[] = []

  protected id//readonly id: string = randomHash()

  constructor(configuration: Partial<BroadcastServiceConfiguration>) {
    super()

    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }

    this.id = this.configuration.serverPort

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
   * Get current configuration
   */
  public getConfiguration(): BroadcastServiceConfiguration {
    return this.configuration
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

  /************************************
   *
   * Public interface
   *
   ************************************/

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

  /************************************
   *
   * Handle messages and events
   *
   ************************************/

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
   * Broadcast message
   */
  public broadcastInternalMessage(message: any) {
    this.sendToAll({
      TARGET_NODES_LIST: this.nodesList,
      ...message,
    })
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = async (connection: Connection, message: any) => {
    // just for sure, if message is back in same service
    if (message.MESSAGE_LIST_NODES) {
      if (message.ORIGINAL_SENDER === this.id) {
        return
      }

      connection.send({
        ORIGINAL_SENDER: message.ORIGINAL_SENDER,
        MESSAGE_ID_RESULT: message.MESSAGE_ID,
        LIST: arrayUnique([...message.LIST, ...(await this.listAllConnections(message.ORIGINAL_SENDER, [connection.id, message.ORIGINAL_SENDER]))]),
      })
    } if (message.BROADCAST_MESSAGE) {
      if ((message.TARGET_NODES_LIST as string[]).includes(this.id)) {

        if (message.DATA_MESSAGE) {
          this.emit(BROADCAST_EVENTS.MESSAGE, message.DATA_MESSAGE)
        } else {
          this.handleInternalMessage(connection, message)
        }

        this.sendToAll({
          ...message,
          TARGET_NODES_LIST: message.TARGET_NODES_LIST.filter(t => t!== this.id)
        }, [connection.id, message.ORIGINAL_SENDER])
      }
    } else {
      // TODO anything else!
    }
  }

  /**
   * Internal messages routings
   */
  protected handleInternalMessage(connection: Connection, message: any) {
    if (message.UPDATE_NODE_LIST) {
      this.updateNodesList()
    }
  }

  /************************************
   *
   * Broadcast utils
   *
   ************************************/

  /**
   * Send message and wait for result
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

  /**
   * Send message to all
   */
  protected sendToAll(message: any, excludedIds?: string[]) {
    const allConnections = this.getConnections().filter(c => c?.id && !excludedIds?.includes(c?.id))
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
  protected async listAllConnections(originalSender: string, excludedIds?: string[]) {
    let list = []
    const allConnections = this.getConnections().filter(c => c?.id && !excludedIds?.includes(c?.id))
    for(const listConnection of allConnections) {

      const result = await this.sendWithResult(listConnection, {
        MESSAGE_LIST_NODES: true,
        ORIGINAL_SENDER: originalSender,
        LIST: [...this.getConnections().map(c => c.id), this.id],
      })

      list = arrayUnique([...list, ...result.LIST])
    }
    return list
  }

  /**
   * Update nodes list by listing in net
   */
  protected async updateNodesList() {
    this.nodesList = await this.listAllConnections(this.id)
  }
}
