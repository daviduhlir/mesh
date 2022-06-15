"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastServer = exports.defaultConfiguration = void 0;
const websocket_1 = require("websocket");
const http = require("http");
const events_1 = require("events");
const constants_1 = require("./utils/constants");
const Connection_1 = require("./Connection");
exports.defaultConfiguration = {
    port: 8080,
    host: '127.0.0.1',
    allowOrigin: (origin) => true
};
class BroadcastServer extends events_1.EventEmitter {
    constructor(id, configuration) {
        super();
        this.id = id;
        this.children = [];
        this.handleIncommingConnection = (request) => {
            if (!this.configuration.allowOrigin(request.origin)) {
                request.reject();
                console.log('Mesh Connection from origin ' + request.origin + ' rejected');
                return;
            }
            const connection = new Connection_1.Connection(request.accept('echo-protocol', request.origin));
            connection.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage);
            connection.on(constants_1.CONNECTION_EVENTS.CLOSE, this.handleConnectionClose);
            connection.on(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleHandshakeDone);
            this.children.push(connection);
            this.emit(constants_1.CONNECTION_EVENTS.OPEN);
            connection.send({
                MESH_HANDSHAKE: this.id,
            });
        };
        this.handleIncommingMessage = (connection, data) => {
            this.emit(constants_1.CONNECTION_EVENTS.MESSAGE, connection, data);
        };
        this.handleConnectionClose = (connection) => {
            this.emit(constants_1.CONNECTION_EVENTS.CLOSE, connection);
            this.children = this.children.filter(c => c !== connection);
        };
        this.handleHandshakeDone = (connection) => {
            if (this.children.every(c => c?.id)) {
                this.emit(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE);
            }
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
    }
    async initialize() {
        await this.initHttpServer();
        await this.initWsServer();
    }
    getConnections() {
        return this.children;
    }
    async init() {
        await this.initHttpServer();
        await this.initWsServer();
    }
    async initHttpServer() {
        this.httpServer = http.createServer((request, response) => {
            response.writeHead(404);
            response.end();
        });
        await (new Promise((resolve, reject) => {
            this.httpServer.listen(this.configuration.port, this.configuration.host, () => resolve(null));
        }));
        console.log(`Mesh Server is listening on port ${this.configuration.host}:${this.configuration.port}`);
    }
    async initWsServer() {
        this.wsServer = new websocket_1.server({
            httpServer: this.httpServer,
            autoAcceptConnections: false
        });
        this.wsServer.on('request', this.handleIncommingConnection);
    }
}
exports.BroadcastServer = BroadcastServer;
//# sourceMappingURL=BroadcastServer.js.map