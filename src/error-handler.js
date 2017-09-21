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
  log.error(`THe native NodeJS dns module returned an error: ${error.code}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
  Client: ${question.remote.address}
  `)
  respond.end()

  return true
}

module.exports = {
  handleDomainErr,
  handle
}
