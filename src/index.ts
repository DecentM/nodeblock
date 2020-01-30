import {start as startGraphql} from './services/graphql'
import {start as startDns} from './services/dns'

import { Service } from 'services/types'

const main = async (): Promise<Service> => {
  const services = await Promise.all([
    startGraphql(),
    startDns()
  ])

  return {
    shutdown: async () => {
      await Promise.all(services.map((service) => service.shutdown()))
    }
  }
}

main()
.then((service) => {
  process.on('SIGINT', service.shutdown)
  process.on('unhandledRejection', (error) => {
    console.error(error)
    service.shutdown()
  })
})
.catch(console.error)
