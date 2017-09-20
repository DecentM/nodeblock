const Conf = require('conf')

const config = new Conf({
  'cwd':        '.',
  'configName': 'nodeblock.conf'
})
const configObj = config.get()

module.exports = {
  config,
  configObj
}
