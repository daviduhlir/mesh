"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = exports.defaultConfiguration = exports.MESSAGE_TYPE = exports.BROADCAST_EVENTS = void 0;
const NetServer_1 = require("./network/NetServer");
const NetClient_1 = require("./network/NetClient");
const constants_1 = require("./utils/constants");
const utils_1 = require("./utils/utils");
const events_1 = require("events");
const cluster = require("cluster");
const ipc_method_1 = require("@david.uhlir/ipc-method");
exports.BROADCAST_EVENTS = {
    MESSAGE: 'MESSAGE',
    NETWORK_CHANGE: 'NETWORK_CHANGE',
    NODE_IDENTIFICATION: 'NODE_IDENTIFICATION',
};
exports.MESSAGE_TYPE = {
    BROADCAST: 'BROADCAST',
    TRACE_PROBE: 'TRACE_PROBE',
    REGISTER_NODE: 'REGISTER_NODE',
    MESSAGE_RETURN: 'MESSAGE_RETURN',
};
const IPC_MESSAGE_ACTIONS = {
    GET_NODES_LIST: 'GET_NODES_LIST',
    GET_NODES_NAMES: 'GET_NODES_NAMES',
    SEND_TO_NODE: 'SEND_TO_NODE',
    BROADCAST: 'BROADCAST',
};
exports.defaultConfiguration = {
    nodesUrls: ['default@ws://127.0.0.1:8080'],
    maxConnectionAttemps: 3,
    serverPort: 8080,
    serverHost: '127.0.0.1',
    serverSecret: 'default',
    serverAllowOrigin: (origin) => true
};
class BroadcastService extends events_1.EventEmitter {
    constructor(configuration) {
        super();
        this.id = utils_1.randomHash();
        this.waitedResponses = [];
        this.routes = [];
        this.nodeNames = {};
        this.handleNodesConnectionsChange = async (connection) => {
            this.updateNodesList();
            this.emit(exports.BROADCAST_EVENTS.NETWORK_CHANGE, connection);
        };
        this.handleRoutingIncommingMessage = async (connection, message) => {
            if (message.ROUTE?.length) {
                if (message.MESSAGE_ID) {
                    try {
                        connection.send({
                            MESSAGE_ID: message.MESSAGE_ID,
                            TYPE: exports.MESSAGE_TYPE.MESSAGE_RETURN,
                            RESULT: await this.sendWithResult(message.ROUTE, message.TYPE, message.DATA),
                        });
                    }
                    catch (e) {
                        connection.send({
                            MESSAGE_ID: message.MESSAGE_ID,
                            TYPE: exports.MESSAGE_TYPE.MESSAGE_RETURN,
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
        this.emitBroadcast = async (data, sender) => {
            this.emit(exports.BROADCAST_EVENTS.MESSAGE, data, {
                SENDER: sender,
                sendBack: (data) => this.sendToNode(sender, data),
            });
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.configurationHash = utils_1.hash(JSON.stringify(this.configuration));
        if (cluster.isMaster) {
            this.server = new NetServer_1.NetServer(this.id, {
                port: this.configuration.serverPort,
                host: this.configuration.serverHost,
                secret: this.configuration.serverSecret,
                allowOrigin: this.configuration.serverAllowOrigin,
            });
            this.client = new NetClient_1.NetClient(this.id, {
                urls: this.configuration.nodesUrls,
                maxAttemps: this.configuration.maxConnectionAttemps,
            });
            this.ipcMethod = new ipc_method_1.IpcMethodHandler(['MESH_NETWORK', this.configurationHash], {
                [IPC_MESSAGE_ACTIONS.BROADCAST]: this.broadcast.bind(this),
                [IPC_MESSAGE_ACTIONS.GET_NODES_LIST]: this.getNodesList.bind(this),
                [IPC_MESSAGE_ACTIONS.GET_NODES_NAMES]: this.getNamedNodes.bind(this),
                [IPC_MESSAGE_ACTIONS.SEND_TO_NODE]: this.sendToNode.bind(this),
            });
        }
        else {
            this.ipcMethod = new ipc_method_1.IpcMethodHandler(['MESH_NETWORK', this.configurationHash], {
                [IPC_MESSAGE_ACTIONS.BROADCAST]: this.emitBroadcast.bind(this),
            });
        }
    }
    getConfiguration() {
        return this.configuration;
    }
    async initialize() {
        if (cluster.isMaster) {
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
    }
    async getNodesList() {
        if (cluster.isMaster) {
            return this.routes.map(r => r[r.length - 1]);
        }
        else {
            return (await this.ipcMethod.callWithResult(IPC_MESSAGE_ACTIONS.GET_NODES_LIST)).firstResult;
        }
    }
    async getNamedNodes() {
        if (cluster.isMaster) {
            return Object.keys(this.nodeNames).reduce((acc, id) => ({
                ...acc,
                [this.nodeNames[id]]: [...(acc[this.nodeNames[id]] || []), id]
            }), {});
        }
        else {
            return (await this.ipcMethod.callWithResult(IPC_MESSAGE_ACTIONS.GET_NODES_NAMES)).firstResult;
        }
    }
    async broadcast(data) {
        if (cluster.isMaster) {
            for (const route of this.routes) {
                this.send(route, exports.MESSAGE_TYPE.BROADCAST, data);
            }
        }
        else {
            return (await this.ipcMethod.callWithResult(IPC_MESSAGE_ACTIONS.BROADCAST, data)).firstResult;
        }
    }
    async sendToNode(identificator, data) {
        if (cluster.isMaster) {
            const knownNamesIds = Object.keys(this.nodeNames);
            const foundInNameId = knownNamesIds.find(id => this.nodeNames[id] === identificator);
            const lookupId = foundInNameId || identificator;
            const route = this.routes.find(r => r[r.length - 1] === lookupId);
            if (!route) {
                throw new Error(`Route to target ${identificator} not found.`);
            }
            this.send(route, exports.MESSAGE_TYPE.BROADCAST, data);
        }
        else {
            return (await this.ipcMethod.callWithResult(IPC_MESSAGE_ACTIONS.SEND_TO_NODE, identificator, data)).firstResult;
        }
    }
    async getConnections() {
        return this.server.getConnections()
            .concat([this.client.getConnection()])
            .filter(Boolean)
            .filter((value, index, self) => self.findIndex(i => i.id === value.id) === index);
    }
    async handleIncommingMessage(connection, message) {
        if (message.TYPE === exports.MESSAGE_TYPE.TRACE_PROBE) {
            connection.send({
                MESSAGE_ID: message.MESSAGE_ID,
                TYPE: exports.MESSAGE_TYPE.MESSAGE_RETURN,
                RESULT: (await this.getConnections()).filter(c => c.id !== connection.id).map(c => c.id),
            });
        }
        else if (message.TYPE === exports.MESSAGE_TYPE.BROADCAST) {
            this.emitBroadcast(message.DATA, message.SENDER);
            this.ipcMethod.call(IPC_MESSAGE_ACTIONS.BROADCAST, message.DATA, message.SENDER);
        }
        else if (message.TYPE === exports.MESSAGE_TYPE.REGISTER_NODE) {
            this.nodeNames[message.DATA.NODE_ID] = message.DATA.NAME;
            this.emit(exports.BROADCAST_EVENTS.NODE_IDENTIFICATION);
        }
        else if (message.TYPE === exports.MESSAGE_TYPE.MESSAGE_RETURN && message.MESSAGE_ID) {
            const foundItem = this.waitedResponses.find(item => item.messageId === message.MESSAGE_ID);
            if (foundItem) {
                foundItem.resolve(message);
            }
        }
    }
    async sendWithResult(targetRoute, type, data) {
        const firstRoute = targetRoute[0];
        const connection = (await this.getConnections()).find(c => c.id === firstRoute);
        if (!connection) {
            throw new Error(`Route to ${firstRoute} not found on node ${this.id}`);
        }
        const messageId = utils_1.randomHash();
        return new Promise((resolve, reject) => {
            this.waitedResponses.push({
                resolve: (message) => {
                    this.waitedResponses = this.waitedResponses.filter(i => !(i.messageId === messageId));
                    if (message.ERROR) {
                        reject(message.ERROR);
                    }
                    else {
                        resolve(message.RESULT);
                    }
                },
                reject: () => {
                    this.waitedResponses = this.waitedResponses.filter(i => !(i.messageId === messageId));
                    resolve(new Error(`Call was rejected, process probably died during call, or rejection was called.`));
                },
                messageId,
            });
            this.send(targetRoute, type, data, messageId);
        });
    }
    async send(targetRoute, type, data, messageId) {
        const route = [...targetRoute];
        const firstRoute = route.shift();
        const connection = (await this.getConnections()).find(c => c.id === firstRoute);
        if (!connection) {
            throw new Error(`Route to ${firstRoute} not found on node ${this.id}`);
        }
        connection.send({
            MESSAGE_ID: messageId,
            TYPE: type,
            SENDER: this.id,
            ROUTE: route,
            DATA: data,
        });
    }
    async updateNodesList() {
        this.routes = (await this.getConnections()).filter(c => !!c.id).map(c => [c.id]);
        for (let i = 0; i < this.routes.length; i++) {
            const testingRoute = this.routes[i];
            let result;
            try {
                result = await this.sendWithResult(testingRoute, exports.MESSAGE_TYPE.TRACE_PROBE, {});
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
                this.send(route, exports.MESSAGE_TYPE.REGISTER_NODE, {
                    NODE_ID: this.id,
                    NAME: this.configuration.nodeName,
                });
            }
        }
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map