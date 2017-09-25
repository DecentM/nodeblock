// @flow

import {config} from './config'
import {handle} from './error-handler'
import {db} from './db'
import log from 'chalk-console'
import dnsExpress from 'dns-express'
import network from 'network'
import pify from 'pify'
const dns: any = require('dns')

const server = dnsExpress()
// This function starts the server up
const listenServer = () => {
  // Try starting the dns-express server
  // dns-express only listens on ipv4 addresses

  try {
    server.listen(config.get('port'))
    log.info(`DNS Server is listening on port ${config.get('port')}`)
  } catch (error) {
    handle(error)
  }
}

const gatewayIsPrimary = async () => {
  const gateway = await pify(network.get_gateway_ip)()
  const is = gateway === config.get('servers')[0]

  return {is, gateway}
}

const startServer = async () => {
  await db()

  dns.setServers(config.get('servers'))
  listenServer()
  log.info(`Using DNS servers for recursion:
  ${JSON.stringify(dns.getServers())}
  `)

  const {is, gateway} = await gatewayIsPrimary()

  if (!is) {
    log.warn(`Your primary DNS server used for recursion (${dns.getServers()[0]}) is not your network gateway (${gateway})`)
    log.warn('Because of this and a Node limitation, Nodeblock will store the IP address of a client instead of it\'s hostname')
  }
}

module.exports = {
  server,
  startServer
}
