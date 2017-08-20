import * as PrettyError from 'pretty-error'
import * as log from 'chalk-console'

const pe = new PrettyError()

pe.appendStyle({
  'pretty-error > header > title > kind': {
    display: 'none'
  },

  'pretty-error > header > colon': {
    display: 'none'
  },

  'pretty-error > header > message': {
    color: 'red'
  },

  'pretty-error > trace > item > header > pointer > file': {
    color: 'bright-cyan'
  },

  'pretty-error > trace > item > header > pointer > colon': {
    color: 'cyan'
  },

  'pretty-error > trace > item > header > pointer > line': {
    color: 'cyan'
  },

  'pretty-error > trace > item > header > what': {
    color: 'bright-white'
  }
})

export const handle = (error: Error) => {
  const rendered = pe.render(error)
  log.error(rendered)
}

export const handleDomainErr = (error, respond, question) => {
  switch (error.code) {
    // If we get an answer saying that the record doesn't exist, we suppress
    // the error message and reply with an empty record
    case 'ENODATA':
      log.info(`${question.remote.address} just asked for an empty domain
    Domain: ${question.name}
    Type: ${question.typeName.toUpperCase()}
      `)
      respond.end()
    break
    case 'ENOTFOUND':
      log.info(`${question.remote.address} just asked for a non-existent domain
    Domain: ${question.name}
      `)
      respond.end()
    break
    default:
      log.error(`An error occurred while responding to ${question.remote.address}`)
      handle(error)
      respond.end()
    break
  }
}
