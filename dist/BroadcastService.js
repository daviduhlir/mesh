"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = exports.defaultConfiguration = void 0;
const BroadcastServer_1 = require("./BroadcastServer");
const BroadcastClient_1 = require("./BroadcastClient");
const constants_1 = require("./utils/constants");
const utils_1 = require("./utils");
exports.defaultConfiguration = {
    nodesUrls: ['ws://127.0.0.1:8080'],
    maxConnectionAttemps: 3,
    serverPort: 8080,
    serverHost: '127.0.0.1',
    serverAllowOrigin: (origin) => true
};
class BroadcastService {
    constructor(configuration) {
        this.nodesList = [];
        this.handleNodesConnectionsChange = async (connection) => {
            this.updateNodesList();
            console.log(this.id, 'Change of mesh state');
        };
        this.handleIncommingMessage = async (connection, message) => {
            if (message.MESSAGE_LIST_NODES) {
                connection.send({
                    MESSAGE_LIST_NODES_RESULT: message.MESSAGE_LIST_NODES,
                    LIST: utils_1.arrayUnique([...message.LIST, ...(await this.listAllConnections(connection.id))]),
                });
            }
            else {
            }
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.id = configuration.serverPort;
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
        return this.server.getConnections().concat([this.client.getConnection()]).filter(Boolean);
    }
    async getNodesList() {
        return this.nodesList;
    }
    async listAllConnections(excludedId) {
        let list = [];
        const allConnections = this.getConnections().filter(c => c?.id && c?.id !== excludedId);
        for (const listConnection of allConnections) {
            list = utils_1.arrayUnique([...list, ...(await this.listConnection(listConnection))]);
        }
        return list;
    }
    async listConnection(connection) {
        const MESSAGE_LIST_NODES = utils_1.randomHash();
        return new Promise((resolve, reject) => {
            const handleMessage = (_, message) => {
                if (message.MESSAGE_LIST_NODES_RESULT === MESSAGE_LIST_NODES) {
                    connection.removeListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
                    resolve(message.LIST || []);
                }
            };
            connection.addListener(constants_1.CONNECTION_EVENTS.MESSAGE, handleMessage);
            connection.send({
                MESSAGE_LIST_NODES,
                LIST: [...this.getConnections().map(c => c.id), this.id],
            });
        });
    }
    async updateNodesList() {
        this.nodesList = await this.listAllConnections();
    }
}
exports.BroadcastService = BroadcastService;
//# sourceMappingURL=BroadcastService.js.map