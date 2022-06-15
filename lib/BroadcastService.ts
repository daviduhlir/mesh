import { BroadcastServer } from './BroadcastServer'
import { BroadcastClient } from './BroadcastClient'
import { CONNECTION_EVENTS } from './utils/constants'
import { randomHash } from './utils'
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
  protected routes: string[][] = []

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
    return this.routes.map(r => r[r.length - 1])
  }

  /**
   * Broadcast message
   */
  public broadcast(data: any) {
    for(const route of this.routes) {
      this.send(route, 'BROADCAST', data)
    }
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
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = async (connection: Connection, message: any) => {
    if (message.ROUTE?.length) {

      if (message.MESSAGE_ID) {
        connection.send({
          MESSAGE_RESULT_ID: message.MESSAGE_ID,
          RESULT: await this.sendWithResult(message.ROUTE, message.TYPE, message.DATA),
        })
      } else {
        this.send(message.ROUTE, message.TYPE, message.DATA)
      }
    } else {
      if (message.TYPE === 'TRACE_PROBE') {
        connection.send({
          MESSAGE_RESULT_ID: message.MESSAGE_ID,
          RESULT: this.getConnections().filter(c => c.id !== connection.id).map(c => c.id),
        })
      } else if (message.TYPE === 'BROADCAST') {
        this.emit(BROADCAST_EVENTS.MESSAGE, message.DATA)
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
    const messageId = randomHash()
    const route = [...targetRoute]
    const firstRoute = route.shift()
    const connection = this.getConnections().find(c => c.id === firstRoute)
    if (!connection) {
      return
    }

    return new Promise((resolve: (response: any) => void, reject: (error) => void) => {
      const handleMessage = (_: Connection, message: any) => {
        if (message.MESSAGE_RESULT_ID === messageId) {
          connection.removeListener(CONNECTION_EVENTS.MESSAGE, handleMessage)
          resolve(message.RESULT)
        }
      }

      connection.addListener(CONNECTION_EVENTS.MESSAGE, handleMessage)
      this.send(targetRoute, type, data, messageId)
    })
  }

  protected async send(targetRoute: string[], type: string, data: any, messageId?: string) {
    const route = [...targetRoute]
    const firstRoute = route.shift()
    const connection = this.getConnections().find(c => c.id === firstRoute)
    if (!connection) {
      return
    }

    connection.send({
      MESSAGE_ID: messageId,
      TYPE: type,
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
    this.routes = this.getConnections().map(c => [c.id])

    for(let i = 0; i < this.routes.length; i++) {
      const testingRoute = this.routes[i]
      const result = await this.sendWithResult(testingRoute, 'TRACE_PROBE', {})

      if (!result) {
        continue
      }

      for(const next of result) {
        const newRoute = [...testingRoute, next]

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
  }
}
