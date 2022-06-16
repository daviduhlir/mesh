"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetClient = exports.defaultConfiguration = void 0;
const websocket_1 = require("websocket");
const events_1 = require("events");
const constants_1 = require("../utils/constants");
const Connection_1 = require("./Connection");
exports.defaultConfiguration = {
    urls: [],
    maxAttemps: 3,
};
class NetClient extends events_1.EventEmitter {
    constructor(id, configuration) {
        super();
        this.id = id;
        this.connectionAttemp = {
            attempNumber: 0,
            urlIndex: 0,
        };
        this.handleOnConnectionError = (connection, message) => {
            this.resetConnection();
        };
        this.handleOnConnectionClose = (connection) => {
            this.close();
        };
        this.handleOnMessage = (connection, message) => {
            this.emit(constants_1.CONNECTION_EVENTS.MESSAGE, connection, message);
        };
        this.handleHandshakeComplete = (connection) => {
            this.emit(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, connection);
        };
        this.configuration = {
            ...exports.defaultConfiguration,
            ...configuration,
        };
        this.wsClient = new websocket_1.client();
    }
    getConnection() {
        return this.currentConnection;
    }
    async initialize() {
        await this.resetConnection();
    }
    get isConnected() {
        return this.currentConnection?.connected;
    }
    close() {
        if (this.currentConnection) {
            this.currentConnection.removeAllListeners();
        }
        if (this.currentConnection?.connected) {
            this.currentConnection.close();
        }
        this.currentConnection = null;
    }
    send(data) {
        return this.currentConnection.send(data);
    }
    async resetConnection() {
        this.close();
        this.connectionAttemp.attempNumber = 0;
        if (!this.configuration.urls.length) {
            return;
        }
        await (new Promise((resolve, reject) => {
            const tryConnection = async () => {
                try {
                    const connection = await this.connect(this.configuration.urls[this.connectionAttemp.urlIndex]);
                    resolve(connection);
                }
                catch (e) {
                    this.connectionAttemp.attempNumber++;
                    if (this.connectionAttemp.attempNumber > this.configuration.maxAttemps) {
                        this.connectionAttemp.urlIndex = this.connectionAttemp.urlIndex + 1 % this.configuration.urls.length;
                    }
                    setTimeout(() => tryConnection(), 1000);
                }
            };
            tryConnection();
        }));
        this.send({
            MESH_HANDSHAKE: this.id,
        });
    }
    async connect(requestedUrl) {
        if (this.isConnected) {
            this.close();
        }
        this.currentConnection = await (new Promise((resolve, reject) => {
            const handleOnConnect = (connection) => {
                const newConnection = new Connection_1.Connection(connection);
                this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
                this.wsClient.removeListener('connect', handleOnConnect);
                resolve(newConnection);
            };
            const handleOnConnectionFailed = (error) => {
                this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
                this.wsClient.removeListener('connect', handleOnConnect);
                reject(error);
            };
            this.wsClient.addListener('connectFailed', handleOnConnectionFailed);
            this.wsClient.addListener('connect', handleOnConnect);
            this.wsClient.connect(requestedUrl, 'echo-protocol');
        }));
        this.currentConnection.on(constants_1.CONNECTION_EVENTS.ERROR, this.handleOnConnectionError);
        this.currentConnection.on(constants_1.CONNECTION_EVENTS.CLOSE, this.handleOnConnectionClose);
        this.currentConnection.on(constants_1.CONNECTION_EVENTS.MESSAGE, this.handleOnMessage);
        this.currentConnection.on(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this.handleHandshakeComplete);
        this.emit(constants_1.CONNECTION_EVENTS.OPEN, this.currentConnection);
        return this.currentConnection;
    }
}
exports.NetClient = NetClient;
//# sourceMappingURL=NetClient.js.map