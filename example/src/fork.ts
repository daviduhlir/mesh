import { BroadcastService, BROADCAST_EVENTS } from '@david.uhlir/mesh'
import * as cluster from 'cluster'

// create network on one server -> it's posible when you are using different ports
const s = [
  new BroadcastService({
    nodesUrls: [ 'ws://127.0.0.1:3001/'],
    serverPort: 3000,
    nodeName: 'Server1',
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:3002/'],
    serverPort: 3001,
    nodeName: 'Server2',
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:3003/'],
    serverPort: 3002,
    nodeName: 'Server3',
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:3000/'],
    serverPort: 3003,
    nodeName: 'Server4',
  }),
]
s.forEach(c => c.initialize())


if (cluster.isMaster) {
  // initialize and attach message event
  cluster.fork()
} else {
  // start broadcasting messages as example
  function test(i: number) {
    setTimeout(async () => {
      console.log('Broadcast')
      s[i].broadcast({
        message: i + ' - Hello world'
      })
    }, 1000 + i * 1000)
  }

  s.forEach((c, index) => {
    c.on(BROADCAST_EVENTS.MESSAGE, (message) => console.log('RECEIVED on port:', c.getConfiguration().serverPort, message))
    test(index)
  })
}
