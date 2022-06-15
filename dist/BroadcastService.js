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
        this.nodesList = [];
        this.handleNodesConnectionsChange = async (connection) => {
            this.updateNodesList();
            this.broadcastInternalMessage({
                UPDATE_NODE_LIST: true
            });
        };
        this.handleIncommingMessage = async (connection, message) => {
            if (message.MESSAGE_LIST_NODES) {
                if (message.ORIGINAL_SENDER === this.id) {
                    return;
                }
                console.log(`ORIGINAL: ${message.ORIGINAL_SENDER}`, connection.id, ' -> ', this.id);
                connection.send({
                    ORIGINAL_SENDER: message.ORIGINAL_SENDER,
                    MESSAGE_ID_RESULT: message.MESSAGE_ID,
                    LIST: utils_1.arrayUnique([...message.LIST, ...(await this.listAllConnections(message.ORIGINAL_SENDER, [connection.id, message.ORIGINAL_SENDER]))]),
                });
            }
            if (message.BROADCAST_MESSAGE) {
                if (message.TARGET_NODES_LIST.includes(this.id)) {
                    if (message.DATA_MESSAGE) {
                        this.emit(exports.BROADCAST_EVENTS.MESSAGE, message.DATA_MESSAGE);
                    }
                    else {
                        this.handleInternalMessage(connection, message);
                    }
                    this.sendToAll({
                        ...message,
                        TARGET_NODES_LIST: message.TARGET_NODES_LIST.filter(t => t !== this.id)
                    }, [connection.id, message.ORIGINAL_SENDER]);
                }
            }
            else {
            }
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.id = this.configuration.serverPort;
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
        this.server.on(constants_1.CONNECTION_EVENTS.CLOSE, this.handleNodesConnectionsChange);
        this.server.on(constants_1.CONNECTION_EVENTS.OPEN, this.handleNodesConnectionsChange);
        this.server.on(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleNodesConnectionsChange);
        this.client.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleIncommingMessage);
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
        return this.nodesList;
    }
    broadcast(message) {
        this.broadcastInternalMessage({
            DATA_MESSAGE: message,
        });
    }
    broadcastInternalMessage(message) {
        this.sendToAll({
            TARGET_NODES_LIST: this.nodesList,
            ...message,
        });
    }
    handleInternalMessage(connection, message) {
        if (message.UPDATE_NODE_LIST) {
            this.updateNodesList();
        }
    }
    async sendWithResult(connection, message) {
        const MESSAGE_ID = utils_1.randomHash();
        return new Promise((resolve, reject) => {
            const handleMessage = (_, message) => {
                if (message.MESSAGE_ID_RESULT === MESSAGE_ID) {
                    connection.removeListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
                    resolve(message);
                }
            };
            connection.addListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
            connection.send({
                MESSAGE_ID,
                ...message,
            });
        });
    }
    sendToAll(message, excludedIds) {
        const allConnections = this.getConnections().filter(c => c?.id && !excludedIds?.includes(c?.id));
        for (const listConnection of allConnections) {
            listConnection.send({
                BROADCAST_MESSAGE: true,
                ...message,
            });
        }
    }
    async listAllConnections(originalSender, excludedIds) {
        let list = [];
        const allConnections = this.getConnections().filter(c => c?.id && !excludedIds?.includes(c?.id));
        for (const listConnection of allConnections) {
            const result = await this.sendWithResult(listConnection, {
                MESSAGE_LIST_NODES: true,
                ORIGINAL_SENDER: originalSender,
                LIST: [...this.getConnections().map(c => c.id), this.id],
            });
            list = utils_1.arrayUnique([...list, ...result.LIST]);
        }
        return list;
    }
    async updateNodesList() {
        this.nodesList = await this.listAllConnections(this.id);
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map