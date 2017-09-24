// @flow

import 'babel-polyfill'

import {config} from './config'
import {getLocalRecord, setOrUpdateRecord} from './db'
import {getRemoteRecord, getHostname} from './network'
import {handle} from './error-handler'
import {server, startServer} from './server'
import {storeEvent} from './stats'
import log from 'chalk-console'
import ipRangeCheck from 'ip-range-check'
import pify from 'pify'
import {isEqual} from 'lodash'
const dns: any = require('dns')

// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = async (question: Object, respond: Object): Object => {
  // Try to get a cached record
  try {
    const local = await getLocalRecord(question)
    const starttime = Date.now()

    if (local.length === 0) {
      const remote = await getRemoteRecord(question, respond)

      if (!remote.internal) {
        await setOrUpdateRecord(remote)
        await storeEvent('query:remote', remote)
      }

      remote.time = Date.now() - starttime
      remote.source = 'remote'
      remote.client = question.remote.address
      return remote
    }

    if (!local.internal) {
      getRemoteRecord(question, respond)
      .then(async (remote) => {
        await setOrUpdateRecord(remote)
        return true
      })

      await storeEvent('query:local', local)
    }

    local.time = Date.now() - starttime
    local.source = 'local'
    local.client = question.remote.address
    return local
  } catch (error) {
    handle(error)
  }
}

const checkIpRanges = async (ip: string) => {
  return ipRangeCheck(ip, config.get('answerRange'))
}

// The main app logic
const run = async () => {
  server.use(async (packet: Object, respond: Object, next: Function) => {
    // We only support one question, so we make sure we only have one
    const question = packet.questions[0]
    const permitted = await checkIpRanges(question.remote.address)

    if (permitted) {
      const replies = await requestRecord(question, respond)

      if (replies.length !== 0 && !replies[0].internal) {
        try {
          const hostname = await getHostname(question.remote.address)

          log.info(`Resolved ${replies.length} record(s)
  Source: ${replies.source}
  Client: ${hostname}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
  Time: ${replies.time} ms
          `)
        } catch (error) {
          log.info(`Resolved ${replies.length} record(s)
  Source: ${replies.source}
  Client: ${question.remote.address}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
  Time: ${replies.time} ms
          `)
        }
      }
      replies.forEach((reply) => {
        respond[reply.type.toLowerCase()](reply)
      })
      respond.end()
    } else {
      handle(new Error(`Client address is not in the permitted answer range(s):
  Domain: ${question.name}
  Address: ${question.remote.address},
  Permitted range(s):\n          ${config.get('answerRange').join('\n          ')}
      `))
    }
  })

  log.info('Nodeblock is starting')
  await startServer()
}

const isPortUsed = async (port) => {
  dns.setServers([ `127.0.0.1:${port}` ])
  let occupied = true
  let isNodeblock = false

  try {
    isNodeblock = isEqual(await pify(dns.resolve)('nodeblock:ping', 'A'), [ '127.0.0.1' ])
  } catch (error) {
    occupied = false
  }

  dns.setServers(config.get('servers'))

  return {
    occupied,
    isNodeblock
  }
}

const index = async (silent: ?boolean) => {
  const {occupied, isNodeblock} = await isPortUsed(config.get('port'))

  if (!occupied) {
    await run()
  } else {
    if (!silent && !isNodeblock) {
      log.error(`Port ${config.get('port')} is currently in use, waiting for it to be freed...`)
    } else if (!silent) {
      log.error(`Another Nodeblock instance is already running on port ${config.get('port')}, waiting for it to shut down...`)
    }
    setTimeout(() => {
      index(true)
    }, 1000)
  }
}

module.exports = {
  index
}
