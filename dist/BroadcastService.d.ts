import { connection as WebSocketConnection } from 'websocket';
import { BroadcastServer } from './BroadcastServer';
import { BroadcastClient } from './BroadcastClient';
export interface BrodcastServiceConfiguration {
    nodesUrls: string[];
    maxConnectionAttemps: number;
    serverPort: number;
    serverHost: string;
    serverAllowOrigin: (origin: string) => boolean;
}
export declare const defaultConfiguration: BrodcastServiceConfiguration;
export declare class BroadcastService {
    protected configuration: BrodcastServiceConfiguration;
    protected server: BroadcastServer;
    protected client: BroadcastClient;
    constructor(configuration: Partial<BrodcastServiceConfiguration>);
    initialize(): Promise<void>;
    protected emit(data: any, sender?: WebSocketConnection): void;
    protected handleIncommingMessage: (message: any, connection: WebSocketConnection) => void;
    protected handleNodesConnectionsChange: (connection: WebSocketConnection) => void;
}
