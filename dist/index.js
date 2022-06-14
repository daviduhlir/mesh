"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BroadcastService_1 = require("./BroadcastService");
const s = [
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
        serverPort: 5000,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
        serverPort: 5001,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5003/'],
        serverPort: 5002,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
        serverPort: 5003,
    }),
];
s.forEach(c => c.initialize());
//# sourceMappingURL=index.js.map