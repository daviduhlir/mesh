"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = exports.defaultConfiguration = void 0;
const BroadcastServer_1 = require("./BroadcastServer");
const BroadcastClient_1 = require("./BroadcastClient");
const constants_1 = require("./utils/constants");
exports.defaultConfiguration = {
    nodesUrls: ['ws://127.0.0.1:8080'],
    maxConnectionAttemps: 3,
    serverPort: 8080,
    serverHost: '127.0.0.1',
    serverAllowOrigin: (origin) => true
};
class BroadcastService {
    constructor(configuration) {
        this.handleIncommingMessage = (message, connection) => {
        };
        this.handleNodesConnectionsChange = (connection) => {
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.server = new BroadcastServer_1.BroadcastServer({
            port: this.configuration.serverPort,
            host: this.configuration.serverHost,
            allowOrigin: this.configuration.serverAllowOrigin,
        });
        this.client = new BroadcastClient_1.BroadcastClient({
            urls: this.configuration.nodesUrls,
            maxAttemps: this.configuration.maxConnectionAttemps,
        });
    }
    async initialize() {
        this.server.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage);
        this.server.on(constants_1.CONNECTION_EVENTS.CLOSE, this.handleNodesConnectionsChange);
        this.server.on(constants_1.CONNECTION_EVENTS.OPEN, this.handleNodesConnectionsChange);
        this.client.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage);
        await this.server.initialize();
        await this.client.initialize();
    }
    emit(data, sender) {
        this.server.send(data, sender);
        if (this.client.getConnection() !== sender) {
            this.client.send(data);
        }
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map