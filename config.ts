import * as Conf from 'conf'

export const config = new Conf({
  'cwd':        '.',
  'configName': 'nodeblock.conf'
})
export const configObj = config.get()
