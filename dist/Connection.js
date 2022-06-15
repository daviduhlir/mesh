"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = void 0;
const events_1 = require("events");
const constants_1 = require("./utils/constants");
class Connection extends events_1.EventEmitter {
    constructor(connection) {
        super();
        this.connection = connection;
        this.handleIncommingMessage = (message) => {
            if (message.type === 'utf8') {
                try {
                    const data = JSON.parse(message.utf8Data);
                    if (data.MESH_HANDSHAKE) {
                        this.handshake(data.MESH_HANDSHAKE);
                        this.emit(constants_1.CONNECTION_EVENTS.HANDSHAKE_COMPLETE, this);
                    }
                    else {
                        this.emit(constants_1.CONNECTION_EVENTS.MESSAGE, this, data);
                    }
                }
                catch (e) { }
            }
        };
        connection.on('message', this.handleIncommingMessage);
        connection.on('error', (error) => this.emit(constants_1.CONNECTION_EVENTS.ERROR, this, error));
        connection.on('close', () => this.emit(constants_1.CONNECTION_EVENTS.CLOSE, this));
    }
    get id() {
        return this.internalId;
    }
    handshake(id) {
        this.internalId = id;
    }
    get connected() {
        return this.connection?.connected;
    }
    close() {
        this.connection.removeAllListeners();
        return this.connection.close();
    }
    send(data) {
        if (this.connection.connected) {
            this.connection.sendUTF(JSON.stringify(data));
        }
    }
}
exports.Connection = Connection;
//# sourceMappingURL=Connection.js.map