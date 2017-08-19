import { config } from './config'
import { handle } from './error-handler'
import { getDb } from './db'
import * as log from 'chalk-console'
import * as dns from 'dns'

import * as dnsExpress from 'dns-express'

export const server = dnsExpress()

// This function starts the server up
const runServer = () => {
  // Try starting the dns-express server
  // If it fails, log the error and reject
  try {
    server.listen(config.get('port'))
    log.info(`DNS Server started and listening on port ${config.get('port')}`)
  } catch (error) {
    handle(error)
  }
}

getDb('records').then(() => {
  dns.setServers(config.get('servers'))
  runServer()
  log.info(`Using DNS servers:
    ${JSON.stringify((dns as any).getServers())}
  `)
})
.catch((error) => {
  handle(error)
  throw error
})
