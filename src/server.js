// @flow

import {config} from './config'
import {handle} from './error-handler'
import {db} from './db'
import log from 'chalk-console'
import dnsExpress from 'dns-express'
const dns: any = require('dns')

const server = dnsExpress()
// This function starts the server up
const listenServer = () => {
  // Try starting the dns-express server
  // If it fails, log the error and reject
  try {
    server.listen(config.get('port'))
    log.info(`DNS Server is listening on port ${config.get('port')}`)
  } catch (error) {
    handle(error)
  }
}

const startServer = () => {
  db('records').then(() => {
    dns.setServers(config.get('servers'))
    listenServer()
    log.info(`Using DNS servers for recursion:
  ${JSON.stringify(dns.getServers())}
    `)
  })
  .catch((error) => {
    handle(error)
    throw error
  })
}

module.exports = {
  server,
  startServer
}
