import { BroadcastClient } from './BroadcastClient'
import { BroadcastService } from './BroadcastService'
import { BroadcastServer } from './BroadcastServer'

/*
const server = new BroadcastServer({
  port: 5000,
})

server.initialize()


setTimeout(() => {
  const client = new BroadcastClient({
    urls: ['ws://127.0.0.1:5000'],
  })

  client.initialize()
}, 2000)*/

const s = [
  new BroadcastService({
    nodesUrls: [ 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
    serverPort: 5000,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5002/', 'ws://127.0.0.1:5003/'],
    serverPort: 5001,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5003/'],
    serverPort: 5002,
  }),
  new BroadcastService({
    nodesUrls: ['ws://127.0.0.1:5000/', 'ws://127.0.0.1:5001/', 'ws://127.0.0.1:5002/'],
    serverPort: 5003,
  }),
]

s.forEach(c => c.initialize())

