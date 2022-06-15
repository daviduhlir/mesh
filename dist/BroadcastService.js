"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = exports.defaultConfiguration = exports.BROADCAST_EVENTS = void 0;
const BroadcastServer_1 = require("./BroadcastServer");
const BroadcastClient_1 = require("./BroadcastClient");
const constants_1 = require("./utils/constants");
const utils_1 = require("./utils");
const events_1 = require("events");
exports.BROADCAST_EVENTS = {
    MESSAGE: 'MESSAGE'
};
exports.defaultConfiguration = {
    nodesUrls: ['ws://127.0.0.1:8080'],
    maxConnectionAttemps: 3,
    serverPort: 8080,
    serverHost: '127.0.0.1',
    serverAllowOrigin: (origin) => true
};
class BroadcastService extends events_1.EventEmitter {
    constructor(configuration) {
        super();
        this.routes = [];
        this.id = utils_1.randomHash();
        this.handleNodesConnectionsChange = async (connection) => {
            this.updateNodesList();
        };
        this.handleIncommingMessage = async (connection, message) => {
            if (message.ROUTE?.length) {
                if (message.MESSAGE_ID) {
                    connection.send({
                        MESSAGE_RESULT_ID: message.MESSAGE_ID,
                        RESULT: await this.sendWithResult(message.ROUTE, message.TYPE, message.DATA),
                    });
                }
                else {
                    this.send(message.ROUTE, message.TYPE, message.DATA);
                }
            }
            else {
                if (message.TYPE === 'TRACE_PROBE') {
                    connection.send({
                        MESSAGE_RESULT_ID: message.MESSAGE_ID,
                        RESULT: this.getConnections().filter(c => c.id !== connection.id).map(c => c.id),
                    });
                }
                else if (message.TYPE === 'BROADCAST') {
                    this.emit(exports.BROADCAST_EVENTS.MESSAGE, message.DATA);
                }
            }
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.server = new BroadcastServer_1.BroadcastServer(this.id, {
            port: this.configuration.serverPort,
            host: this.configuration.serverHost,
            allowOrigin: this.configuration.serverAllowOrigin,
        });
        this.client = new BroadcastClient_1.BroadcastClient(this.id, {
            urls: this.configuration.nodesUrls,
            maxAttemps: this.configuration.maxConnectionAttemps,
        });
    }
    getConfiguration() {
        return this.configuration;
    }
    async initialize() {
        this.server.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage);
        this.client.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage);
        this.server.on(constants_1.CONNECTION_EVENTS.CLOSE, this.handleNodesConnectionsChange);
        this.server.on(constants_1.CONNECTION_EVENTS.OPEN, this.handleNodesConnectionsChange);
        this.server.on(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange);
        this.client.on(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange);
        await this.server.initialize();
        await this.client.initialize();
        this.updateNodesList();
    }
    getConnections() {
        return this.server.getConnections()
            .concat([this.client.getConnection()])
            .filter(Boolean)
            .filter((value, index, self) => self.findIndex(i => i.id === value.id) === index);
    }
    async getNodesList() {
        return this.routes.map(r => r[r.length - 1]);
    }
    broadcast(data) {
        for (const route of this.routes) {
            this.send(route, 'BROADCAST', data);
        }
    }
    async sendWithResult(targetRoute, type, data) {
        const messageId = utils_1.randomHash();
        const route = [...targetRoute];
        const firstRoute = route.shift();
        const connection = this.getConnections().find(c => c.id === firstRoute);
        if (!connection) {
            return;
        }
        return new Promise((resolve, reject) => {
            const handleMessage = (_, message) => {
                if (message.MESSAGE_RESULT_ID === messageId) {
                    connection.removeListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
                    resolve(message.RESULT);
                }
            };
            connection.addListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
            this.send(targetRoute, type, data, messageId);
        });
    }
    async send(targetRoute, type, data, messageId) {
        const route = [...targetRoute];
        const firstRoute = route.shift();
        const connection = this.getConnections().find(c => c.id === firstRoute);
        if (!connection) {
            return;
        }
        connection.send({
            MESSAGE_ID: messageId,
            TYPE: type,
            ROUTE: route,
            DATA: data,
        });
    }
    async updateNodesList() {
        this.routes = this.getConnections().map(c => [c.id]);
        for (let i = 0; i < this.routes.length; i++) {
            const testingRoute = this.routes[i];
            const result = await this.sendWithResult(testingRoute, 'TRACE_PROBE', {});
            if (!result) {
                continue;
            }
            for (const next of result) {
                const newRoute = [...testingRoute, next];
                const foundSameTargetIndex = this.routes.findIndex(r => r[r.length - 1] === next);
                if (foundSameTargetIndex !== -1) {
                    if (newRoute.length < this.routes[foundSameTargetIndex].length) {
                        this.routes[foundSameTargetIndex] = newRoute;
                    }
                }
                else {
                    this.routes.push(newRoute);
                }
            }
        }
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map