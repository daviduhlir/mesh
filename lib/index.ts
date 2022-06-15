import { BroadcastService, BROADCAST_EVENTS } from './BroadcastService'

const s = [
  new BroadcastService({
    nodesUrls: [ 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
    serverPort: 5000,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/', 'ws://127.0.0.1:5000/'],
    serverPort: 5001,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5003/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5003/'],
    serverPort: 5002,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5004/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
    serverPort: 5003,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
    serverPort: 5004,
  }),
]

s.forEach(c => {
  c.on(BROADCAST_EVENTS.MESSAGE, (message) => console.log(c.getConfiguration().serverPort, message))
  c.initialize()
})

setTimeout(async () => {
  console.log('Broadcast')
  s[0].broadcast({
    message: '0 - Hello world'
  })
  /*s[1].broadcast({
    message: '1 - Hello world'
  })
  s[2].broadcast({
    message: '2 - Hello world'
  })
  s[3].broadcast({
    message: '3 - Hello world'
  })
  s[4].broadcast({
    message: '4 - Hello world'
  })*/
}, 1000)
