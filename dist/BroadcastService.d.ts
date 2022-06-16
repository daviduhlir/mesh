/// <reference types="node" />
import { NetServer } from './NetServer';
import { NetClient } from './NetClient';
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
    protected server: NetServer;
    protected client: NetClient;
    protected routes: string[][];
    protected id: any;
    constructor(configuration: Partial<BroadcastServiceConfiguration>);
    getConfiguration(): BroadcastServiceConfiguration;
    initialize(): Promise<void>;
    getConnections(): Connection[];
    getNodesList(): Promise<string[]>;
    broadcast(data: any): void;
    protected handleNodesConnectionsChange: (connection: Connection) => Promise<void>;
    protected handleRoutingIncommingMessage: (connection: Connection, message: any) => Promise<void>;
    protected handleIncommingMessage(connection: Connection, message: any): Promise<void>;
    protected sendWithResult(targetRoute: string[], type: string, data: any): Promise<any>;
    protected send(targetRoute: string[], type: string, data: any, messageId?: string): Promise<void>;
    protected updateNodesList(): Promise<void>;
}
