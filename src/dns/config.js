// @flow
/* eslint no-process-env:0 */

import Conf from 'conf'
import {forIn} from 'lodash'
import network from 'network'
import log from 'chalk-console'

const initialConfig = {
  'port':             53,
  'autosaveInterval': 10000,
  'answerRange':      [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '127.0.0.1',
    'fd00::/8'
  ],
  'servers': [
    '208.67.222.222',
    '208.67.220.220'
  ]
}

/* try {
  network.get_gateway_ip((ip) => {
    defaultConfig.servers = [
      ip
    ]
  })
} catch (error) {
  log.warn('Nodeblock was\'t able to determine the default gateway, default recursors will be used')
} */

const formatToJsonType = (data, toType) => {
  // const fromType = typeof data
  const toArray = toType instanceof Array
  let converted = null

  switch (toArray || typeof toType) {
  case 'string':
    converted = String(data)
    break
  case 'object':
    converted = JSON.parse(data) || Object(data)
    break
  case true:
    converted = Array(data)
    break
  default:
    break
  }

  return converted
}

const config = new Conf({
  'cwd':        '.',
  'configName': 'nodeblock.conf',
  'defaults':   initialConfig
})

forIn(process.env, (envValue, envName) => {
  const regexp = /^NODEBLOCK_(.*)/g
  let found = envName.match(regexp)

  if (found) {
    let arrayValue = null

    if (envValue.includes(',')) {
      arrayValue = envValue.split(',')
    }

    found = found[0].split('_')[1]

    forIn(initialConfig, (initialValue, initialName) => {
      if (found === initialName) {
        config.set(initialName, formatToJsonType(arrayValue || envValue, initialConfig[initialName]))
      }
    })
  }
})

const configObj = config.get()

module.exports = {
  config,
  configObj
}
