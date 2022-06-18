import { NetServer } from './network/NetServer'
import { NetClient } from './network/NetClient'
import { CONNECTION_EVENTS } from './utils/constants'
import { randomHash } from './utils/utils'
import { Connection } from './network/Connection'
import { EventEmitter } from 'events'

export const BROADCAST_EVENTS = {
  MESSAGE: 'MESSAGE',
  NETWORK_CHANGE: 'NETWORK_CHANGE',
  NODE_IDENTIFICATION: 'NODE_IDENTIFICATION',
}

export const MESSAGE_TYPE = {
  BROADCAST: 'BROADCAST',
  TRACE_PROBE: 'TRACE_PROBE',
  REGISTER_NODE: 'REGISTER_NODE',
}

export interface BroadcastMessageMeta {
  SENDER: string,
  sendBack: (data: any) => void
}

export interface BroadcastServiceConfiguration {
  nodeName?: string
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
  protected server: NetServer
  protected client: NetClient
  protected routes: string[][] = []
  protected nodeNames: {[id: string]: string} = {}

  public readonly id: string = randomHash()

  constructor(configuration: Partial<BroadcastServiceConfiguration>) {
    super()

    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }

    // TODO this is only for testing - this.id = this.configuration.serverPort

    this.server = new NetServer(this.id, {
      port: this.configuration.serverPort,
      host: this.configuration.serverHost,
      allowOrigin: this.configuration.serverAllowOrigin,
    })

    this.client = new NetClient(this.id, {
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
  public getNodesList(): string[] {
    return this.routes.map(r => r[r.length - 1])
  }

  /**
   * Get names list
   */
  public getNamedNodes(): {[id: string]: string} {
    return Object.keys(this.nodeNames).reduce((acc, id) => ({
      ...acc,
      [this.nodeNames[id]]: [...(acc[this.nodeNames[id]] || []), id]
    }),{})
  }

  /**
   * Broadcast message
   */
  public broadcast(data: any) {
    for(const route of this.routes) {
      this.send(route, MESSAGE_TYPE.BROADCAST, data)
    }
  }

  /**
   * Send message to some node
   */
  public sendToNode(identificator: string, data: any) {
    const knownNamesIds = Object.keys(this.nodeNames)
    const foundInNameId = knownNamesIds.find(id => this.nodeNames[id] === identificator)
    const lookupId = foundInNameId || identificator
    const route = this.routes.find(r => r[r.length - 1] === lookupId)

    if (!route) {
      throw new Error(`Route to target ${identificator} not found.`)
    }

    this.send(route, MESSAGE_TYPE.BROADCAST, data)
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
            MESSAGE_RETURN: true,
            RESULT: await this.sendWithResult(message.ROUTE, message.TYPE, message.DATA),
          })
        } catch(e) {
          connection.send({
            MESSAGE_ID: message.MESSAGE_ID,
            MESSAGE_RETURN: true,
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
        MESSAGE_RETURN: true,
        RESULT: this.getConnections().filter(c => c.id !== connection.id).map(c => c.id),
      })

    } else if (message.TYPE === MESSAGE_TYPE.BROADCAST) {

      this.emit(BROADCAST_EVENTS.MESSAGE, message.DATA, {
        SENDER: message.SENDER,
        sendBack: (data) => this.sendToNode(message.SENDER, data),
      })

    } else if (message.TYPE === MESSAGE_TYPE.REGISTER_NODE) {

      this.nodeNames[message.DATA.NODE_ID] = message.DATA.NAME
      this.emit(BROADCAST_EVENTS.NODE_IDENTIFICATION)

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
    const route = [...targetRoute]
    const firstRoute = route.shift()
    const connection = this.getConnections().find(c => c.id === firstRoute)
    if (!connection) {
      throw new Error(`Route to ${firstRoute} not found on node ${this.id}`)
    }

    const messageId = randomHash()

    return new Promise((resolve: (response: any) => void, reject: (error) => void) => {
      const handleMessage = (_: Connection, message: any) => {
        if (message.MESSAGE_ID === messageId && message.MESSAGE_RETURN) {
          connection.removeListener(CONNECTION_EVENTS.MESSAGE, handleMessage)
          if (message.ERROR) {
            reject(message.ERROR)
          } else {
            resolve(message.RESULT)
          }
        }
      }

      connection.addListener(CONNECTION_EVENTS.MESSAGE, handleMessage)
      this.send(targetRoute, type, data, messageId)
    })
  }

  /**
   * Send data without any results
   */
  protected async send(targetRoute: string[], type: string, data: any, messageId?: string) {
    const route = [...targetRoute]
    const firstRoute = route.shift()
    const connection = this.getConnections().find(c => c.id === firstRoute)
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

  /************************************
   *
   * Listing utils
   *
   ************************************/

  /**
   * Update nodes list by listing in net
   */
  protected async updateNodesList() {
    this.routes = this.getConnections().filter(c => !!c.id).map(c => [c.id])

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
