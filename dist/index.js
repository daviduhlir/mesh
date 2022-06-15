"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BroadcastService_1 = require("./BroadcastService");
const s = [
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
        serverPort: 5000,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/', 'ws://127.0.0.1:5000/'],
        serverPort: 5001,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5003/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5003/'],
        serverPort: 5002,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5004/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
        serverPort: 5003,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
        serverPort: 5004,
    }),
];
s.forEach(c => {
    c.on(BroadcastService_1.BROADCAST_EVENTS.MESSAGE, (message) => console.log(c.getConfiguration().serverPort, message));
    c.initialize();
});
setTimeout(async () => {
    console.log('Broadcast');
    s[0].broadcast({
        message: '0 - Hello world'
    });
}, 1000);
//# sourceMappingURL=index.js.map