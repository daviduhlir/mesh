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
    protected routes: string[][];
    protected id: any;
    constructor(configuration: Partial<BroadcastServiceConfiguration>);
    getConfiguration(): BroadcastServiceConfiguration;
    initialize(): Promise<void>;
    getConnections(): Connection[];
    getNodesList(): Promise<string[]>;
    broadcast(data: any): void;
    protected handleNodesConnectionsChange: (connection: Connection) => Promise<void>;
    protected handleIncommingMessage: (connection: Connection, message: any) => Promise<void>;
    protected sendWithResult(targetRoute: string[], type: string, data: any): Promise<any>;
    protected send(targetRoute: string[], type: string, data: any, messageId?: string): Promise<void>;
    protected updateNodesList(): Promise<void>;
}
