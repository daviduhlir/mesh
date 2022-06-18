# Mesh broadcast for node.js server applications

Implementation of broadcast server/client for node.js server applications.
It provides you ability to broadcast message across mesh network, defined simply
by connection between nodes. It's communicating by websocket.

Every each node can has more fallback addresses, that will be used when current connection fails.
Communication between nodes is realized by proxing message on each node depends on target position in mesh.
Also there can be specified trace for every each message, to optimize transfer speed, standarty it using the shortest posible way.

Example of service:
```ts
import { BroadcastService, BROADCAST_EVENTS } from '@david.uhlir/mesh'

(async function() {
  const network = new BroadcastService({
    nodesUrls: [ 'ws://123.456.789.255:3000/'],
    serverPort: 3000,
  })
  // initialize connections
  await network.initialize()

  // listen received message
  network.on(BROADCAST_EVENTS.MESSAGE, (message) => console.log('Received message', message))

  // broadcast message to all, on every each change
  network.on(BROADCAST_EVENTS.NETWORK_CHANGE, () => network.broadcast({ someText: 'Hello world' }))
})()
```

ISC