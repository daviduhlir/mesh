"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BroadcastService_1 = require("./BroadcastService");
const s = [
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5001/'],
        serverPort: 5000,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5021/'],
        serverPort: 5001,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5001/'],
        serverPort: 5010,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5001/'],
        serverPort: 5011,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/'],
        serverPort: 5012,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5000/'],
        serverPort: 5013,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5013/'],
        serverPort: 5020,
    }),
    new BroadcastService_1.BroadcastService({
        nodesUrls: ['ws://127.0.0.1:5020/'],
        serverPort: 5021,
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
test(0);
test(1);
test(2);
test(3);
test(4);
test(5);
test(6);
test(7);
//# sourceMappingURL=index.js.map