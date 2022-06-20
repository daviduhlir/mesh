/// <reference types="node" />
import { NetServer } from './network/NetServer';
import { NetClient } from './network/NetClient';
import { Connection } from './network/Connection';
import { EventEmitter } from 'events';
export declare const BROADCAST_EVENTS: {
    MESSAGE: string;
    NETWORK_CHANGE: string;
    NODE_IDENTIFICATION: string;
};
export declare const MESSAGE_TYPE: {
    BROADCAST: string;
    TRACE_PROBE: string;
    REGISTER_NODE: string;
};
export interface BroadcastMessageMeta {
    SENDER: string;
    sendBack: (data: any) => void;
}
export interface BroadcastServiceConfiguration {
    nodeName?: string;
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
    protected nodeNames: {
        [id: string]: string;
    };
    readonly id: string;
    protected configurationHash: string;
    constructor(configuration: Partial<BroadcastServiceConfiguration>);
    getConfiguration(): BroadcastServiceConfiguration;
    initialize(): Promise<void>;
    getNodesList(): Promise<string[]>;
    getNamedNodes(): Promise<{
        [id: string]: string;
    }>;
    broadcast(data: any): Promise<unknown>;
    sendToNode(identificator: string, data: any): Promise<unknown>;
    getConnections(): Promise<Connection[]>;
    protected handleNodesConnectionsChange: (connection: Connection) => Promise<void>;
    protected handleRoutingIncommingMessage: (connection: Connection, message: any) => Promise<void>;
    protected handleIncommingMessage(connection: Connection, message: any): Promise<void>;
    protected sendWithResult(targetRoute: string[], type: string, data: any): Promise<any>;
    protected send(targetRoute: string[], type: string, data: any, messageId?: string): Promise<void>;
    protected updateNodesList(): Promise<void>;
    protected reattachIpcMessageHandlers(): void;
    protected masterIncomingIpcMessage: (message: any) => Promise<void>;
    protected workerIncomingIpcMessage: (message: any) => Promise<void>;
    protected sendIpcActionToMaster<T>(action: string, params?: any): Promise<T>;
    protected sendIpcActionToWorkers(action: string, params?: any): void;
}
