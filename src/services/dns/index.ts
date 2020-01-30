import {Service} from 'services/types';
import {Server} from './server'

export const start = async (): Promise<Service> => {
  const server = new Server({
    port: 5353,
  })

  await server.listen()

  console.log('DNS server listening on port', 5353)

  return {
    shutdown: () => server.stop()
  }
}
