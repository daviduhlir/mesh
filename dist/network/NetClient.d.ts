/// <reference types="node" />
import { client as WebSocketClient } from 'websocket';
import { EventEmitter } from 'events';
import { Connection } from './Connection';
import { NodeUrlDef } from '../utils/configuration';
export interface ClientConfiguration {
    urls: NodeUrlDef[];
    maxAttemps: number;
}
export declare const defaultConfiguration: ClientConfiguration;
export declare class NetClient extends EventEmitter {
    readonly id: any;
    protected wsClient: WebSocketClient;
    protected configuration: ClientConfiguration;
    protected currentConnection: Connection;
    protected connectionAttemp: {
        attempNumber: number;
        urlIndex: number;
    };
    constructor(id: any, configuration: Partial<ClientConfiguration>);
    getConnection(): Connection;
    initialize(): Promise<void>;
    get isConnected(): boolean;
    close(): void;
    send(data: any): void;
    protected resetConnection(): Promise<void>;
    protected connect(requestedUrl: NodeUrlDef): Promise<Connection>;
    protected handleOnConnectionError: (connection: Connection, message: any) => void;
    protected handleOnConnectionClose: (connection: Connection) => void;
    protected handleOnMessage: (connection: Connection, message: any) => void;
    protected handleHandshakeComplete: (connection: Connection) => void;
}
