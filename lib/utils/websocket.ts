import { connection as WebSocketConnection } from 'websocket'
import { randomHash } from './index'

export function send(receiver: WebSocketConnection, data: any) {
  const dataStringify = JSON.stringify(data)
  receiver.sendUTF(dataStringify)
}

export async function ask(connection: WebSocketConnection, data: any) {
  const MESSAGE_ASK_ID = randomHash()
  return new Promise((resolve: (response: any) => void, reject: (error) => void) => {
    const handleMessage = (messsage: any) => {
      if (messsage.MESSAGE_ASK_ID === MESSAGE_ASK_ID) {
        connection.removeListener('message', handleMessage)
        resolve(messsage.response)
      }
    }

    connection.addListener('message', handleMessage)
    send(connection, {
      MESSAGE_ASK_ID,
      data,
    })
  }
}
