/// <reference types="node" />
import { server as WebSocketServer, request as WebSocketRequest, connection as WebSocketConnection } from 'websocket';
import * as http from 'http';
import { EventEmitter } from 'events';
export interface ServerConfiguration {
    port: number;
    host: string;
    allowOrigin: (origin: string) => boolean;
}
export declare const defaultConfiguration: ServerConfiguration;
export declare class BroadcastServer extends EventEmitter {
    protected httpServer: http.Server;
    protected wsServer: WebSocketServer;
    protected configuration: ServerConfiguration;
    protected children: {
        connection: WebSocketConnection;
        id: string;
    }[];
    constructor(configuration: Partial<ServerConfiguration>);
    initialize(): Promise<void>;
    send(data: any, sender?: WebSocketConnection): void;
    protected init(): Promise<void>;
    protected initHttpServer(): Promise<void>;
    protected initWsServer(): Promise<void>;
    protected handleIncommingConnection: (request: WebSocketRequest) => void;
    protected handleIncommingMessage: (connection: WebSocketConnection, message: any) => void;
    protected handleConnectionClose: (connection: WebSocketConnection) => void;
}
