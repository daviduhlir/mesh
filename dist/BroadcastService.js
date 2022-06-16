"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = exports.defaultConfiguration = exports.BROADCAST_EVENTS = void 0;
const NetServer_1 = require("./network/NetServer");
const NetClient_1 = require("./network/NetClient");
const constants_1 = require("./utils/constants");
const utils_1 = require("./utils/utils");
const events_1 = require("events");
exports.BROADCAST_EVENTS = {
    MESSAGE: 'MESSAGE',
    NETWORK_CHANGE: 'NETWORK_CHANGE',
    NODE_IDENTIFICATION: 'NODE_IDENTIFICATION',
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
        this.nodeNames = {};
        this.id = utils_1.randomHash();
        this.handleNodesConnectionsChange = async (connection) => {
            this.updateNodesList();
            this.emit(exports.BROADCAST_EVENTS.NETWORK_CHANGE);
        };
        this.handleRoutingIncommingMessage = async (connection, message) => {
            if (message.ROUTE?.length) {
                if (message.MESSAGE_ID) {
                    try {
                        connection.send({
                            MESSAGE_ID: message.MESSAGE_ID,
                            MESSAGE_RETURN: true,
                            RESULT: await this.sendWithResult(message.ROUTE, message.TYPE, message.DATA),
                        });
                    }
                    catch (e) {
                        connection.send({
                            MESSAGE_ID: message.MESSAGE_ID,
                            MESSAGE_RETURN: true,
                            ERROR: e.toString(),
                        });
                    }
                }
                else {
                    try {
                        this.send(message.ROUTE, message.TYPE, message.DATA);
                    }
                    catch (e) { }
                }
            }
            else {
                this.handleIncommingMessage(connection, message);
            }
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.server = new NetServer_1.NetServer(this.id, {
            port: this.configuration.serverPort,
            host: this.configuration.serverHost,
            allowOrigin: this.configuration.serverAllowOrigin,
        });
        this.client = new NetClient_1.NetClient(this.id, {
            urls: this.configuration.nodesUrls,
            maxAttemps: this.configuration.maxConnectionAttemps,
        });
    }
    getConfiguration() {
        return this.configuration;
    }
    async initialize() {
        this.server.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleRoutingIncommingMessage);
        this.client.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleRoutingIncommingMessage);
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
    getNodesList() {
        return this.routes.map(r => r[r.length - 1]);
    }
    getNamedNodes() {
        return Object.keys(this.nodeNames).reduce((acc, id) => ({
            ...acc,
            [this.nodeNames[id]]: [...(acc[this.nodeNames[id]] || []), id]
        }), {});
    }
    broadcast(data) {
        for (const route of this.routes) {
            this.send(route, 'BROADCAST', data);
        }
    }
    broadcastToNode(identificator, data) {
        const knownNamesIds = Object.keys(this.nodeNames);
        const foundInNameId = knownNamesIds.find(id => this.nodeNames[id] === identificator);
        const lookupId = foundInNameId || identificator;
        const route = this.routes.find(r => r[r.length - 1] === lookupId);
        if (!route) {
            throw new Error(`Route to target ${identificator} not found.`);
        }
        this.send(route, 'BROADCAST', data);
    }
    async handleIncommingMessage(connection, message) {
        if (message.TYPE === 'TRACE_PROBE') {
            connection.send({
                MESSAGE_ID: message.MESSAGE_ID,
                MESSAGE_RETURN: true,
                RESULT: this.getConnections().filter(c => c.id !== connection.id).map(c => c.id),
            });
        }
        else if (message.TYPE === 'BROADCAST') {
            this.emit(exports.BROADCAST_EVENTS.MESSAGE, message.DATA);
        }
        else if (message.TYPE === 'REGISTER_NODE') {
            this.nodeNames[message.DATA.NODE_ID] = message.DATA.NAME;
            this.emit(exports.BROADCAST_EVENTS.NODE_IDENTIFICATION);
        }
    }
    async sendWithResult(targetRoute, type, data) {
        const route = [...targetRoute];
        const firstRoute = route.shift();
        const connection = this.getConnections().find(c => c.id === firstRoute);
        if (!connection) {
            throw new Error(`Route to ${firstRoute} not found on node ${this.id}`);
        }
        const messageId = utils_1.randomHash();
        return new Promise((resolve, reject) => {
            const handleMessage = (_, message) => {
                if (message.MESSAGE_ID === messageId && message.MESSAGE_RETURN) {
                    connection.removeListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
                    if (message.ERROR) {
                        reject(message.ERROR);
                    }
                    else {
                        resolve(message.RESULT);
                    }
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
            throw new Error(`Route to ${firstRoute} not found on node ${this.id}`);
        }
        connection.send({
            MESSAGE_ID: messageId,
            TYPE: type,
            ROUTE: route,
            DATA: data,
        });
    }
    async updateNodesList() {
        this.routes = this.getConnections().filter(c => !!c.id).map(c => [c.id]);
        for (let i = 0; i < this.routes.length; i++) {
            const testingRoute = this.routes[i];
            let result;
            try {
                result = await this.sendWithResult(testingRoute, 'TRACE_PROBE', {});
            }
            catch (e) { }
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
        if (this.configuration.nodeName) {
            for (const route of this.routes) {
                this.send(route, 'REGISTER_NODE', {
                    NODE_ID: this.id,
                    NAME: this.configuration.nodeName,
                });
            }
        }
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map