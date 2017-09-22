// @flow

import PrettyError from 'pretty-error'
import log from 'chalk-console'
const pe = new PrettyError()

pe.appendStyle({
  'pretty-error > header > title > kind': {
    'display': 'none'
  },
  'pretty-error > header > colon': {
    'display': 'none'
  },
  'pretty-error > header > message': {
    'color': 'red'
  },
  'pretty-error > trace > item > header > pointer > file': {
    'color': 'bright-cyan'
  },
  'pretty-error > trace > item > header > pointer > colon': {
    'color': 'cyan'
  },
  'pretty-error > trace > item > header > pointer > line': {
    'color': 'cyan'
  },
  'pretty-error > trace > item > header > what': {
    'color': 'bright-white'
  }
})
const handle = (error: Error) => {
  const rendered = pe.render(error)

  log.error(rendered)
}
const handleDomainErr = async (error: Object, respond: Object, question: Object) => {
  switch (error.code) {
  case 'ENODATA':
    log.info(`[ENODATA] A non-existant record was asked for:
  Client: ${question.remote.address}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
    `)
    break
  case 'ENOTFOUND':
    log.info(`[ENOTFOUND] A non-existant record was asked for:
  Client: ${question.remote.address}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
    `)
    break
  case 'EBADNAME':
    break
  case 'EFORMERR':
    log.error('Upstream DNS server claims formatting error')
    break
  case 'ESERVFAIL':
    log.warn('Upstream DNS server has an internal error')
    break
  case 'ENOTIMP':
    log.error('Upstream DNS server does not implement the requested operation')
    break
  case 'EREFUSED':
    log.error('Upstream DNS server refused the query')
    break
  case 'EBADQUERY':
    log.error('Upstream DNS server claims misformatted query')
    log.yellow('If this is indeed true, please let me know: github.com/DecentM/nodeblock')
    break
  case 'EBADFAMILY':
    log.warn('Upsteam DNS server does not support address family')
    break
  case 'ECONNREFUSED':
    log.warn('Upstream DNS server refused to connect')
    log.warn('Nodeblock will continue to serve requests stored in its database')
    break
  case 'ETIMEOUT':
    log.warn('Could not connect to upstream DNS server')
    log.warn('Nodeblock will continue to serve requests stored in its database')
    break
  case 'ECANCELLED':
    log.warn('A request was cancelled')
    break
  default:
    log.error(`The native NodeJS dns module returned an uncommon error: ${error.code}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
  Client: ${question.remote.address}
    `)
    break
  }
  respond.end()

  return true
}

module.exports = {
  handleDomainErr,
  handle
}
