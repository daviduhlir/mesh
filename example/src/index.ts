import { BroadcastService, BROADCAST_EVENTS } from '@david.uhlir/mesh'

// create network on one server -> it's posible when you are using different ports
const s = [
  new BroadcastService({
    nodesUrls: [ 'secret-server-2@ws://127.0.0.1:3001/'],
    serverPort: 3000,
    nodeName: 'Server1',
    serverSecret: 'secret-server-1',
  }),
  new BroadcastService({
    nodesUrls: ['secret-server-3@ws://127.0.0.1:3002/'],
    serverPort: 3001,
    nodeName: 'Server2',
    serverSecret: 'secret-server-2',
  }),
  new BroadcastService({
    nodesUrls: ['secret-server-4@ws://127.0.0.1:3003/'],
    serverPort: 3002,
    nodeName: 'Server3',
    serverSecret: 'secret-server-3',
  }),
  new BroadcastService({
    nodesUrls: ['secret-server-1@ws://127.0.0.1:3000/'],
    serverPort: 3003,
    nodeName: 'Server4',
    serverSecret: 'secret-server-4',
  }),
]

// initialize and attach message event
s.forEach(c => {
  c.on(BROADCAST_EVENTS.MESSAGE, (message) => console.log('RECEIVED on port:', c.getConfiguration().serverPort, message))
  c.initialize()
})

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
  test(index)
})
