import { NetServer } from './network/NetServer'
import { NetClient } from './network/NetClient'
import { CONNECTION_EVENTS } from './utils/constants'
import { hash, randomHash } from './utils/utils'
import { Connection } from './network/Connection'
import { EventEmitter } from 'events'
import * as cluster from 'cluster'
import { IpcMethodHandler } from '@david.uhlir/ipc-method'
import { NodeUrlDef } from './utils/configuration'

export const BROADCAST_EVENTS = {
  MESSAGE: 'MESSAGE',
  NETWORK_CHANGE: 'NETWORK_CHANGE',
  NODE_IDENTIFICATION: 'NODE_IDENTIFICATION',
}

export const MESSAGE_TYPE = {
  BROADCAST: 'BROADCAST',
  TRACE_PROBE: 'TRACE_PROBE',
  REGISTER_NODE: 'REGISTER_NODE',
  MESSAGE_RETURN: 'MESSAGE_RETURN',
}

const IPC_MESSAGE_ACTIONS = {
  GET_NODES_LIST: 'GET_NODES_LIST',
  GET_NODES_NAMES: 'GET_NODES_NAMES',
  SEND_TO_NODE: 'SEND_TO_NODE',
  BROADCAST: 'BROADCAST',
}

export interface BroadcastMessageMeta {
  SENDER: string,
  sendBack: (data: any) => void
}

export interface BroadcastServiceConfiguration {
  nodeName?: string
  nodesUrls: NodeUrlDef[]
  maxConnectionAttemps: number
  serverPort: number
  serverHost: string
  serverSecret: string
  serverAllowOrigin: (origin: string) => boolean
}

export const defaultConfiguration: BroadcastServiceConfiguration = {
  nodesUrls: ['default@ws://127.0.0.1:8080'],
  maxConnectionAttemps: 3,
  serverPort: 8080,
  serverHost: '127.0.0.1',
  serverSecret: 'default',
  serverAllowOrigin: (origin) => true
}

export interface MessageCallWaiter {
  reject: (error: any) => void
  resolve: (message: any) => void
  messageId: string
}

export class BroadcastService extends EventEmitter {
  public readonly id: string = randomHash()
  protected waitedResponses: MessageCallWaiter[] = []

  protected configuration: BroadcastServiceConfiguration
  protected server: NetServer
  protected client: NetClient
  protected routes: string[][] = []
  protected nodeNames: {[id: string]: string} = {}

  protected configurationHash: string
  protected ipcMethod: IpcMethodHandler

  constructor(configuration: Partial<BroadcastServiceConfiguration>) {
    super()

    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }

    this.configurationHash = hash(JSON.stringify(this.configuration))

    if (cluster.isMaster) {
      this.server = new NetServer(this.id, {
        port: this.configuration.serverPort,
        host: this.configuration.serverHost,
        secret: this.configuration.serverSecret,
        allowOrigin: this.configuration.serverAllowOrigin,
      })

      this.client = new NetClient(this.id, {
        urls: this.configuration.nodesUrls,
        maxAttemps: this.configuration.maxConnectionAttemps,
      })

      this.ipcMethod = new IpcMethodHandler(['MESH_NETWORK', this.configurationHash], {
        [IPC_MESSAGE_ACTIONS.BROADCAST]: this.broadcast.bind(this),
        [IPC_MESSAGE_ACTIONS.GET_NODES_LIST]: this.getNodesList.bind(this),
        [IPC_MESSAGE_ACTIONS.GET_NODES_NAMES]: this.getNamedNodes.bind(this),
        [IPC_MESSAGE_ACTIONS.SEND_TO_NODE]: this.sendToNode.bind(this),
      })

    } else {
      this.ipcMethod = new IpcMethodHandler(['MESH_NETWORK', this.configurationHash], {
        [IPC_MESSAGE_ACTIONS.BROADCAST]: this.emitBroadcast.bind(this),
      })
    }
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
    if (cluster.isMaster) {
      this.server.on(CONNECTION_EVENTS.MESSAGE, this.handleRoutingIncommingMessage)
      this.client.on(CONNECTION_EVENTS.MESSAGE, this.handleRoutingIncommingMessage)

      this.server.on(CONNECTION_EVENTS.CLOSE, this.handleNodesConnectionsChange)
      this.server.on(CONNECTION_EVENTS.OPEN, this.handleNodesConnectionsChange)
      this.server.on(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange)
      this.client.on(CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange)

      await this.server.initialize()
      await this.client.initialize()

      this.updateNodesList()
    }
  }

  /************************************
   *
   * Public interface
   *
   ************************************/

  /**
   * Get list of nodes
   */
  public async getNodesList(): Promise<string[]> {
    if (cluster.isMaster) {
      return this.routes.map(r => r[r.length - 1])
    } else {
      return (await this.ipcMethod.callWithResult<string[]>(IPC_MESSAGE_ACTIONS.GET_NODES_LIST)).firstResult
    }
  }

  /**
   * Get names list
   */
  public async getNamedNodes(): Promise<{[id: string]: string}> {
    if (cluster.isMaster) {
      return Object.keys(this.nodeNames).reduce((acc, id) => ({
        ...acc,
        [this.nodeNames[id]]: [...(acc[this.nodeNames[id]] || []), id]
      }),{})
    } else {
      return (await this.ipcMethod.callWithResult<{[id: string]: string}>(IPC_MESSAGE_ACTIONS.GET_NODES_NAMES)).firstResult
    }
  }

  /**
   * Broadcast message
   */
  public async broadcast(data: any) {
    if (cluster.isMaster) {
      for(const route of this.routes) {
        this.send(route, MESSAGE_TYPE.BROADCAST, data)
      }
    } else {
      return (await this.ipcMethod.callWithResult<{[id: string]: string}>(IPC_MESSAGE_ACTIONS.BROADCAST, data)).firstResult
    }
  }

  /**
   * Send message to some node
   */
  public async sendToNode(identificator: string, data: any) {
    if (cluster.isMaster) {
      const knownNamesIds = Object.keys(this.nodeNames)
      const foundInNameId = knownNamesIds.find(id => this.nodeNames[id] === identificator)
      const lookupId = foundInNameId || identificator
      const route = this.routes.find(r => r[r.length - 1] === lookupId)

      if (!route) {
        throw new Error(`Route to target ${identificator} not found.`)
      }

      this.send(route, MESSAGE_TYPE.BROADCAST, data)
    } else {
      return (await this.ipcMethod.callWithResult<{[id: string]: string}>(IPC_MESSAGE_ACTIONS.SEND_TO_NODE, identificator, data)).firstResult
    }
  }

  /************************************
   *
   * Handle messages and events
   *
   ************************************/

  /**
   * get all connections
   */
   public async getConnections(): Promise<Connection[]> {
    return this.server.getConnections()
      .concat([this.client.getConnection()])
      .filter(Boolean)
      .filter((value, index, self) => self.findIndex(i => i.id === value.id) === index)
  }

  /**
   * On new connection or closed some
   */
  protected handleNodesConnectionsChange = async (connection: Connection) => {
    this.updateNodesList()
    this.emit(BROADCAST_EVENTS.NETWORK_CHANGE, connection)
  }

  /**
   * Message received
   */
  protected handleRoutingIncommingMessage = async (connection: Connection, message: any) => {
    if (message.ROUTE?.length) {
      // PROXY message
      if (message.MESSAGE_ID) {
        // with result
        try {
          connection.send({
            MESSAGE_ID: message.MESSAGE_ID,
            TYPE: MESSAGE_TYPE.MESSAGE_RETURN,
            RESULT: await this.sendWithResult(message.ROUTE, message.TYPE, message.DATA),
          })
        } catch(e) {
          connection.send({
            MESSAGE_ID: message.MESSAGE_ID,
            TYPE: MESSAGE_TYPE.MESSAGE_RETURN,
            ERROR: e.toString(),
          })
        }
      } else {
        // without result
        try {
          this.send(message.ROUTE, message.TYPE, message.DATA)
        } catch(e) {}
      }
    } else {
      this.handleIncommingMessage(connection, message)
    }
  }

  /**
   * Do some stuff with messages that have type
   */
  protected async handleIncommingMessage(connection: Connection, message: any) {
    // final message habdling
    if (message.TYPE === MESSAGE_TYPE.TRACE_PROBE) {

      connection.send({
        MESSAGE_ID: message.MESSAGE_ID,
        TYPE: MESSAGE_TYPE.MESSAGE_RETURN,
        RESULT: (await this.getConnections()).filter(c => c.id !== connection.id).map(c => c.id),
      })

    } else if (message.TYPE === MESSAGE_TYPE.BROADCAST) {

      this.emitBroadcast(message.DATA, message.SENDER)
      this.ipcMethod.call(IPC_MESSAGE_ACTIONS.BROADCAST, message.DATA, message.SENDER)

    } else if (message.TYPE === MESSAGE_TYPE.REGISTER_NODE) {

      this.nodeNames[message.DATA.NODE_ID] = message.DATA.NAME
      this.emit(BROADCAST_EVENTS.NODE_IDENTIFICATION)

    } else if (message.TYPE === MESSAGE_TYPE.MESSAGE_RETURN && message.MESSAGE_ID) {
      const foundItem = this.waitedResponses.find(item => item.messageId === message.MESSAGE_ID)
      if (foundItem) {
        foundItem.resolve(message)
      }
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
  protected async sendWithResult(targetRoute: string[], type: string, data: any) {
    const firstRoute = targetRoute[0]
    const connection = (await this.getConnections()).find(c => c.id === firstRoute)
    if (!connection) {
      throw new Error(`Route to ${firstRoute} not found on node ${this.id}`)
    }

    const messageId = randomHash()

    return new Promise((resolve: (response: any) => void, reject: (error) => void) => {
      this.waitedResponses.push({
        resolve: (message: any) => {
          this.waitedResponses = this.waitedResponses.filter(i => !(i.messageId === messageId))
          if (message.ERROR) {
            reject(message.ERROR)
          } else {
            resolve(message.RESULT)
          }
        },
        reject: () => {
          this.waitedResponses = this.waitedResponses.filter(i => !(i.messageId === messageId))
          resolve(new Error(`Call was rejected, process probably died during call, or rejection was called.`))
        },
        messageId,
      })

      this.send(targetRoute, type, data, messageId)
    })
  }

  /**
   * Send data without any results
   */
  protected async send(targetRoute: string[], type: string, data: any, messageId?: string) {
    const route = [...targetRoute]
    const firstRoute = route.shift()
    const connection = (await this.getConnections()).find(c => c.id === firstRoute)
    if (!connection) {
      throw new Error(`Route to ${firstRoute} not found on node ${this.id}`)
    }

    connection.send({
      MESSAGE_ID: messageId,
      TYPE: type,
      SENDER: this.id,
      ROUTE: route,
      DATA: data,
    })
  }

  /**
   * Emit broadcast event
   */
  protected emitBroadcast = async (data: any, sender: string) => {
    this.emit(BROADCAST_EVENTS.MESSAGE, data, {
      SENDER: sender,
      sendBack: (data) => this.sendToNode(sender, data),
    })
  }

  /************************************
   *
   * Listing utils
   *
   ************************************/

  /**
   * Update nodes list by listing in net
   */
  protected async updateNodesList() {
    this.routes = (await this.getConnections()).filter(c => !!c.id).map(c => [c.id])

    for(let i = 0; i < this.routes.length; i++) {
      const testingRoute = this.routes[i]
      let result
      try {
        result = await this.sendWithResult(testingRoute, MESSAGE_TYPE.TRACE_PROBE, {})
      } catch(e) {}

      if (!result) {
        continue
      }

      // result is list of connected nodes to connection
      for(const next of result) {
        const newRoute = [...testingRoute, next]

        // try to find route with same endings
        const foundSameTargetIndex = this.routes.findIndex(r => r[r.length - 1] === next)
        if (foundSameTargetIndex !== -1) {
          // optimization - apply shorter way
          if (newRoute.length < this.routes[foundSameTargetIndex].length) {
            this.routes[foundSameTargetIndex] = newRoute
          }
        } else {
          // new route
          this.routes.push(newRoute)
        }
      }
    }

    if (this.configuration.nodeName) {
      for(const route of this.routes) {
        this.send(route, MESSAGE_TYPE.REGISTER_NODE, {
          NODE_ID: this.id,
          NAME: this.configuration.nodeName,
        })
      }
    }
  }
}
