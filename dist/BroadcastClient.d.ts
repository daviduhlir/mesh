/// <reference types="node" />
import { client as WebSocketClient, connection as WebSocketConnection } from 'websocket';
import { EventEmitter } from 'events';
export interface ClientConfiguration {
    urls: string[];
    maxAttemps: number;
}
export declare const defaultConfiguration: ClientConfiguration;
export declare class BroadcastClient extends EventEmitter {
    protected wsClient: WebSocketClient;
    protected configuration: ClientConfiguration;
    protected currentConnection: WebSocketConnection;
    protected connectionAttemp: {
        attempNumber: number;
        urlIndex: number;
    };
    readonly id: string;
    constructor(configuration: Partial<ClientConfiguration>);
    getConnection(): WebSocketConnection;
    initialize(): Promise<void>;
    get isConnected(): boolean;
    close(): void;
    send(data: any): void;
    protected resetConnection(): Promise<void>;
    protected connect(requestedUrl: string): Promise<WebSocketConnection>;
    protected handleOnConnectionError: (message: any) => void;
    protected handleOnConnectionClose: () => void;
    protected handleOnMessage: (message: any) => void;
}
