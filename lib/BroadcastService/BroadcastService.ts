import { BrodcastServer } from "../BrodcastServer/BrodcastServer"
import { BroadcastClient } from "../BroadcastClient/BroadcastClient"
import { SERVER_CONNECTION_EVENTS } from "../BrodcastServer/constants"
import { CLIENT_CONNECTION_EVENTS } from "../BroadcastClient/constants"

export interface BrodcastServiceConfiguration {
  nodesUrls: string[]
  maxConnectionAttemps: number
  serverPort: number
  serverHost: string
  serverAllowOrigin: (origin: string) => boolean
}

export const defaultConfiguration: BrodcastServiceConfiguration = {
  nodesUrls: ['ws://127.0.0.1:8080/'],
  maxConnectionAttemps: 3,
  serverPort: 8080,
  serverHost: '127.0.0.1',
  serverAllowOrigin: (origin) => true
}

export class BrodcastService {
  protected configuration: BrodcastServiceConfiguration
  protected server: BrodcastServer
  protected client: BroadcastClient

  constructor(configuration: Partial<BrodcastServiceConfiguration>) {
    this.configuration = {
      ...defaultConfiguration,
      ...configuration,
    }

    this.server = new BrodcastServer({
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
    await this.server.initialize()
    await this.client.initialize()

    this.server.on(SERVER_CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)
    this.client.on(CLIENT_CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage)
  }

  /**
   * Send data
   */
  public send(data: any) {
  }

  /**
   * Message received
   */
  protected handleIncommingMessage = (message: any) => {

  }
}
