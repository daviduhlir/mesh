/// <reference types="node" />
import { server as WebSocketServer, request as WebSocketRequest } from 'websocket';
import * as http from 'http';
import { EventEmitter } from 'events';
import { Connection } from './Connection';
export interface ServerConfiguration {
    port: number;
    host: string;
    allowOrigin: (origin: string) => boolean;
}
export declare const defaultConfiguration: ServerConfiguration;
export declare class BroadcastServer extends EventEmitter {
    readonly id: any;
    protected httpServer: http.Server;
    protected wsServer: WebSocketServer;
    protected configuration: ServerConfiguration;
    protected children: Connection[];
    constructor(id: any, configuration: Partial<ServerConfiguration>);
    initialize(): Promise<void>;
    getConnections(): Connection[];
    protected init(): Promise<void>;
    protected initHttpServer(): Promise<void>;
    protected initWsServer(): Promise<void>;
    protected handleIncommingConnection: (request: WebSocketRequest) => void;
    protected handleIncommingMessage: (connection: Connection, data: any) => void;
    protected handleConnectionClose: (connection: Connection) => void;
    protected handleHandshakeDone: (connection: Connection) => void;
}
