"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BroadcastService_1 = require("./BroadcastService");
const s = [
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5002/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
        serverPort: 5000,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/', 'ws://127.0.0.1:5000/'],
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
setTimeout(async () => {
    console.log('new one');
    s.push(new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
        serverPort: 5004,
    }));
    s[4].initialize();
}, 1000);
setTimeout(async () => {
    console.log('Strated listing');
    console.log('5000', await s[0].getNodesList());
    console.log('5001', await s[1].getNodesList());
    console.log('5002', await s[2].getNodesList());
    console.log('5003', await s[3].getNodesList());
    console.log('5004', await s[4].getNodesList());
}, 2000);
setTimeout(async () => {
    s[4].broadcast({
        message: 'Hello world'
    });
}, 3000);
//# sourceMappingURL=index.js.map