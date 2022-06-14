"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastServer = exports.defaultConfiguration = void 0;
const websocket_1 = require("websocket");
const http = require("http");
const events_1 = require("events");
const constants_1 = require("./utils/constants");
exports.defaultConfiguration = {
    port: 8080,
    host: '127.0.0.1',
    allowOrigin: (origin) => true
};
class BroadcastServer extends events_1.EventEmitter {
    constructor(configuration) {
        super();
        this.children = [];
        this.handleIncommingConnection = (request) => {
            if (!this.configuration.allowOrigin(request.origin)) {
                request.reject();
                console.log('Mesh Connection from origin ' + request.origin + ' rejected');
                return;
            }
            const connection = request.accept('echo-protocol', request.origin);
            connection.on('message', this.handleIncommingMessage.bind(this, connection));
            connection.on('close', this.handleConnectionClose.bind(this, connection));
            this.emit(constants_1.CONNECTION_EVENTS.OPEN, connection);
            this.children.push({ connection, id: null });
        };
        this.handleIncommingMessage = (connection, message) => {
            if (message.type === 'utf8') {
                try {
                    const data = JSON.parse(message.utf8Data);
                    if (data.MESH_HANDSHAKE) {
                        const found = this.children.find(c => c.connection === connection);
                        if (found) {
                            found.id = data.MESH_HANDSHAKE;
                        }
                        if (this.children.every(c => c.id !== null)) {
                            console.log('HANDSHAKE_COMPLETE', `${this.configuration.host}:${this.configuration.port}`, this.children.map(c => c.id));
                        }
                    }
                    else {
                        this.emit(constants_1.CONNECTION_EVENTS.MESSAGE, data, connection);
                    }
                }
                catch (e) {
                }
            }
        };
        this.handleConnectionClose = (connection) => {
            this.emit(constants_1.CONNECTION_EVENTS.CLOSE, connection);
            this.children = this.children.filter(c => c.connection !== connection);
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
    send(data, sender) {
        const dataStringify = JSON.stringify(data);
        for (const child of this.children) {
            if (child.connection === sender) {
                continue;
            }
            child.connection.sendUTF(dataStringify);
        }
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