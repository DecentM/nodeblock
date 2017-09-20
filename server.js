const config = require('./config')
const {handle} = require('./error-handler')
const {db} = require('./db')
const log = require('chalk-console')
const dns = require('dns')
const dnsExpress = require('dns-express')

const server = dnsExpress()
// This function starts the server up
const listenServer = () => {
  // Try starting the dns-express server
  // If it fails, log the error and reject
  try {
    server.listen(config.config.get('port'))
    log.info(`DNS Server is listening on port ${config.config.get('port')}`)
  } catch (error) {
    handle(error)
  }
}

const startServer = () => {
  db().then(() => {
    dns.setServers(config.config.get('servers'))
    listenServer()
    log.info(`Using DNS servers:\n    ${JSON.stringify(dns.getServers())}\n  `)
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
