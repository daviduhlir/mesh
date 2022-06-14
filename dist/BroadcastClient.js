"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastClient = exports.defaultConfiguration = void 0;
const websocket_1 = require("websocket");
const events_1 = require("events");
const constants_1 = require("./utils/constants");
const utils_1 = require("./utils");
exports.defaultConfiguration = {
    urls: [],
    maxAttemps: 3,
};
class BroadcastClient extends events_1.EventEmitter {
    constructor(configuration) {
        super();
        this.connectionAttemp = {
            attempNumber: 0,
            urlIndex: 0,
        };
        this.id = utils_1.randomHash();
        this.handleOnConnectionError = (message) => {
            this.resetConnection();
        };
        this.handleOnConnectionClose = () => {
            this.close();
        };
        this.handleOnMessage = (message) => {
            if (message.type === 'utf8') {
                try {
                    this.emit(constants_1.CONNECTION_EVENTS.MESSAGE, JSON.parse(message.utf8Data), this.currentConnection);
                }
                catch (e) {
                }
            }
            else if (message.type === 'binary') {
            }
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
        if (this.isConnected) {
            this.currentConnection.sendUTF(JSON.stringify(data));
        }
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
        console.log('SENDING_HANDSHAKE', this.id);
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
                this.wsClient.removeListener('connectFailed', handleOnConnectionFailed);
                this.wsClient.removeListener('connect', handleOnConnect);
                resolve(connection);
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
        this.currentConnection.on('error', this.handleOnConnectionError);
        this.currentConnection.on('close', this.handleOnConnectionClose);
        this.currentConnection.on('message', this.handleOnMessage);
        this.emit(constants_1.CONNECTION_EVENTS.OPEN, this.currentConnection);
        return this.currentConnection;
    }
}
exports.BroadcastClient = BroadcastClient;
//# sourceMappingURL=BroadcastClient.js.map