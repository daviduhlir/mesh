/// <reference types="node" />
import { connection as WebSocketConnection } from 'websocket';
import { EventEmitter } from 'events';
export declare class Connection extends EventEmitter {
    readonly connection: WebSocketConnection;
    protected internalId: string;
    constructor(connection: WebSocketConnection);
    get id(): string;
    handshake(id: string): void;
    get connected(): boolean;
    close(): void;
    send(data: any): void;
    protected handleIncommingMessage: (message: any) => void;
}
