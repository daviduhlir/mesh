import { BroadcastService, BROADCAST_EVENTS } from '@david.uhlir/mesh'

const s = [
  /*new BroadcastService({
    nodesUrls: [ 'ws://127.0.0.1:5001/'],
    serverPort: 5000,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5021/'],
    serverPort: 5001,
  }),

  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5001/'],
    serverPort: 5010,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5001/'],
    serverPort: 5011,
  }),

  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5000/'],
    serverPort: 5012,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5000/'],
    serverPort: 5013,
  }),

  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5013/'],
    serverPort: 5020,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5020/'],
    serverPort: 5021,
  }),*/

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

s.forEach(c => {
  c.on(BROADCAST_EVENTS.MESSAGE, (message) => console.log('RECEIVED', c.getConfiguration().serverPort, message))
  c.initialize()
})

/*setTimeout(async () => {
  console.log('Node names')
  console.log(s[0].getNamedNodes())
  s[0].broadcastToNode('Server4', {
    SOMETHING: 'Hello world'
  })
}, 1000)*/

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