"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = exports.defaultConfiguration = exports.MESSAGE_TYPE = exports.BROADCAST_EVENTS = void 0;
const NetServer_1 = require("./network/NetServer");
const NetClient_1 = require("./network/NetClient");
const constants_1 = require("./utils/constants");
const utils_1 = require("./utils/utils");
const events_1 = require("events");
const clutser_1 = require("./utils/clutser");
exports.BROADCAST_EVENTS = {
    MESSAGE: 'MESSAGE',
    NETWORK_CHANGE: 'NETWORK_CHANGE',
    NODE_IDENTIFICATION: 'NODE_IDENTIFICATION',
};
exports.MESSAGE_TYPE = {
    BROADCAST: 'BROADCAST',
    TRACE_PROBE: 'TRACE_PROBE',
    REGISTER_NODE: 'REGISTER_NODE',
};
const IPC_MESSAGE_ACTIONS = {
    GET_NODES_LIST: 'GET_NODES_LIST',
    GET_NODES_NAMES: 'GET_NODES_NAMES',
    SEND_TO_NODE: 'SEND_TO_NODE',
    BROADCAST: 'BROADCAST',
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
            this.emit(exports.BROADCAST_EVENTS.NETWORK_CHANGE, connection);
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
        this.masterIncomingIpcMessage = async (message) => {
            if (message?.MESH_INTERNAL_MASTER_ACTION && message?.SERVICE_HASH === this.configurationHash) {
                const sender = clutser_1.default.workers[message.WORKER];
                let results = null;
                if (message.MESH_INTERNAL_MASTER_ACTION === IPC_MESSAGE_ACTIONS.BROADCAST) {
                    results = await this.broadcast(message.params.data);
                }
                else if (message.MESH_INTERNAL_MASTER_ACTION === IPC_MESSAGE_ACTIONS.GET_NODES_LIST) {
                    results = await this.getNodesList();
                }
                else if (message.MESH_INTERNAL_MASTER_ACTION === IPC_MESSAGE_ACTIONS.GET_NODES_NAMES) {
                    results = await this.getNamedNodes();
                }
                else if (message.MESH_INTERNAL_MASTER_ACTION === IPC_MESSAGE_ACTIONS.SEND_TO_NODE) {
                    results = await this.sendToNode(message.params.identificator, message.params.data);
                }
                else {
                    throw new Error(`BRoadcast service IPC failed, action ${message.MESH_INTERNAL_MASTER_ACTION} was not found.`);
                }
                sender.send({
                    MESH_INTERNAL_MASTER_ACTION_RESULT: message.MESH_INTERNAL_MASTER_ACTION,
                    MESSAGE_ID: message.MESSAGE_ID,
                    SERVICE_HASH: this.configurationHash,
                    results,
                });
            }
        };
        this.workerIncomingIpcMessage = async (message) => {
            if (message?.MESH_INTERNAL_WORKER_ACTION && message?.SERVICE_HASH === this.configurationHash) {
                if (message.MESH_INTERNAL_WORKER_ACTION === IPC_MESSAGE_ACTIONS.BROADCAST) {
                    this.emit(exports.BROADCAST_EVENTS.MESSAGE, message.params.DATA, {
                        SENDER: message.params.SENDER,
                        sendBack: (data) => this.sendToNode(message.params.SENDER, data),
                    });
                }
            }
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.configurationHash = utils_1.hash(JSON.stringify(this.configuration));
        if (clutser_1.default.isMaster) {
            this.server = new NetServer_1.NetServer(this.id, {
                port: this.configuration.serverPort,
                host: this.configuration.serverHost,
                allowOrigin: this.configuration.serverAllowOrigin,
            });
            this.client = new NetClient_1.NetClient(this.id, {
                urls: this.configuration.nodesUrls,
                maxAttemps: this.configuration.maxConnectionAttemps,
            });
            this.reattachIpcMessageHandlers();
            clutser_1.default?.on('fork', () => this.reattachIpcMessageHandlers());
            clutser_1.default?.on('exit', () => this.reattachIpcMessageHandlers());
        }
        else {
            process.on('message', this.workerIncomingIpcMessage);
        }
    }
    getConfiguration() {
        return this.configuration;
    }
    async initialize() {
        if (clutser_1.default.isMaster) {
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
        if (clutser_1.default.isMaster) {
            return this.routes.map(r => r[r.length - 1]);
        }
        else {
            return this.sendIpcActionToMaster(IPC_MESSAGE_ACTIONS.GET_NODES_LIST);
        }
    }
    async getNamedNodes() {
        if (clutser_1.default.isMaster) {
            return Object.keys(this.nodeNames).reduce((acc, id) => ({
                ...acc,
                [this.nodeNames[id]]: [...(acc[this.nodeNames[id]] || []), id]
            }), {});
        }
        else {
            return this.sendIpcActionToMaster(IPC_MESSAGE_ACTIONS.GET_NODES_NAMES);
        }
    }
    async broadcast(data) {
        if (clutser_1.default.isMaster) {
            for (const route of this.routes) {
                this.send(route, exports.MESSAGE_TYPE.BROADCAST, data);
            }
        }
        else {
            return this.sendIpcActionToMaster(IPC_MESSAGE_ACTIONS.BROADCAST, { data });
        }
    }
    async sendToNode(identificator, data) {
        if (clutser_1.default.isMaster) {
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
            return this.sendIpcActionToMaster(IPC_MESSAGE_ACTIONS.SEND_TO_NODE, { identificator, data });
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
                MESSAGE_RETURN: true,
                RESULT: (await this.getConnections()).filter(c => c.id !== connection.id).map(c => c.id),
            });
        }
        else if (message.TYPE === exports.MESSAGE_TYPE.BROADCAST) {
            this.emit(exports.BROADCAST_EVENTS.MESSAGE, message.DATA, {
                SENDER: message.SENDER,
                sendBack: (data) => this.sendToNode(message.SENDER, data),
            });
            this.sendIpcActionToWorkers(IPC_MESSAGE_ACTIONS.BROADCAST, message);
        }
        else if (message.TYPE === exports.MESSAGE_TYPE.REGISTER_NODE) {
            this.nodeNames[message.DATA.NODE_ID] = message.DATA.NAME;
            this.emit(exports.BROADCAST_EVENTS.NODE_IDENTIFICATION);
        }
    }
    async sendWithResult(targetRoute, type, data) {
        const route = [...targetRoute];
        const firstRoute = route.shift();
        const connection = (await this.getConnections()).find(c => c.id === firstRoute);
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
    reattachIpcMessageHandlers() {
        Object.keys(clutser_1.default.workers).forEach(workerId => {
            clutser_1.default.workers?.[workerId]?.removeListener('message', this.masterIncomingIpcMessage);
            clutser_1.default.workers?.[workerId]?.addListener('message', this.masterIncomingIpcMessage);
        });
    }
    async sendIpcActionToMaster(action, params) {
        if (clutser_1.default.isWorker) {
            return new Promise((resolve, reject) => {
                const messageId = utils_1.randomHash();
                const messageHandler = message => {
                    if (typeof message === 'object' &&
                        message.MESSAGE_ID === messageId,
                        message.MESH_INTERNAL_MASTER_ACTION_RESULT &&
                            message.SERVICE_HASH === this.configurationHash) {
                        process.removeListener('message', messageHandler);
                        resolve(message.results);
                    }
                };
                process.addListener('message', messageHandler);
                process.send({
                    MESH_INTERNAL_MASTER_ACTION: action,
                    params,
                    MESSAGE_ID: messageId,
                    WORKER: clutser_1.default.worker?.id,
                    SERVICE_HASH: this.configurationHash,
                });
            });
        }
        else {
            return Promise.reject('Cant send IPC from master');
        }
    }
    sendIpcActionToWorkers(action, params) {
        if (clutser_1.default.isMaster) {
            const message = {
                MESH_INTERNAL_WORKER_ACTION: action,
                SERVICE_HASH: this.configurationHash,
                params,
            };
            Object.keys(clutser_1.default.workers).forEach(workerId => clutser_1.default.workers?.[workerId]?.send(message));
        }
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map