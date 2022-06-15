/// <reference types="node" />
import { BroadcastServer } from './BroadcastServer';
import { BroadcastClient } from './BroadcastClient';
import { Connection } from './Connection';
import { EventEmitter } from 'events';
export declare const BROADCAST_EVENTS: {
    MESSAGE: string;
};
export interface BroadcastServiceConfiguration {
    nodesUrls: string[];
    maxConnectionAttemps: number;
    serverPort: number;
    serverHost: string;
    serverAllowOrigin: (origin: string) => boolean;
}
export declare const defaultConfiguration: BroadcastServiceConfiguration;
export declare class BroadcastService extends EventEmitter {
    protected configuration: BroadcastServiceConfiguration;
    protected server: BroadcastServer;
    protected client: BroadcastClient;
    protected nodesList: string[];
    protected readonly id: string;
    constructor(configuration: Partial<BroadcastServiceConfiguration>);
    getConfiguration(): BroadcastServiceConfiguration;
    initialize(): Promise<void>;
    getConnections(): Connection[];
    getNodesList(): Promise<string[]>;
    broadcast(message: any): void;
    protected handleNodesConnectionsChange: (connection: Connection) => Promise<void>;
    protected handleIncommingMessage: (connection: Connection, message: any) => Promise<void>;
    protected handleInternalMessage(message: any): void;
    broadcastInternalMessage(message: any): void;
    protected sendWithResult(connection: Connection, message: any): Promise<any>;
    protected sendToAll(message: any, excludedId?: string): void;
    protected listAllConnections(excludedId?: string): Promise<any[]>;
    protected listConnection(connection: Connection): Promise<any>;
    protected updateNodesList(): Promise<void>;
}
