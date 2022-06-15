"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BroadcastService_1 = require("./BroadcastService");
const s = [
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5001/'],
        serverPort: 5000,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5002/'],
        serverPort: 5001,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5003/'],
        serverPort: 5002,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/'],
        serverPort: 5003,
    }),
];
s.forEach(c => {
    c.on(BroadcastService_1.BROADCAST_EVENTS.MESSAGE, (message) => console.log('RECEIVED', c.getConfiguration().serverPort, message));
    c.initialize();
});
function test(i) {
    setTimeout(async () => {
        console.log('Broadcast');
        s[i].broadcast({
            message: i + ' - Hello world'
        });
    }, 1000 + i * 1000);
}
s.forEach((c, index) => {
    test(index);
});
//# sourceMappingURL=index.js.map