// @flow

import Conf from 'conf'

const defaultConfig = {
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

const config = new Conf({
  'cwd':        '.',
  'configName': 'nodeblock.conf',
  'defaults':   defaultConfig
})
const configObj = config.get()

module.exports = {
  config,
  configObj
}
