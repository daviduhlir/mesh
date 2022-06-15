import { BroadcastServer } from './BroadcastServer';
import { BroadcastClient } from './BroadcastClient';
import { Connection } from './Connection';
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
    protected nodesList: string[];
    protected id: any;
    constructor(configuration: Partial<BrodcastServiceConfiguration>);
    initialize(): Promise<void>;
    getConnections(): Connection[];
    getNodesList(): Promise<string[]>;
    protected handleNodesConnectionsChange: (connection: Connection) => Promise<void>;
    protected handleIncommingMessage: (connection: Connection, message: any) => Promise<void>;
    protected listAllConnections(excludedId?: string): Promise<any[]>;
    protected listConnection(connection: Connection): Promise<any>;
    protected updateNodesList(): Promise<void>;
}
