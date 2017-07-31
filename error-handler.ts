import * as PrettyError from 'pretty-error'
const pe = new PrettyError()
import * as log from 'chalk-console'

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

export function handle(error: Error) {
  const rendered = pe.render(error)
  log.error(rendered)
}
