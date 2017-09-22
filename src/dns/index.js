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

// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = async (question: Object, respond: Object): Object => {
  // Try to get a cached record
  try {
    const local = await getLocalRecord(question)

    if (local.length === 0) {
      const remote = await getRemoteRecord(question, respond)

      await setOrUpdateRecord(remote)
      await storeEvent('query:remote', remote)

      remote.source = 'remote'
      remote.client = question.remote.address
      return remote
    }

    getRemoteRecord(question, respond)
    .then(async (remote) => {
      await setOrUpdateRecord(remote)
    })

    await storeEvent('query:local', local)

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

      if (replies.length !== 0) {
        try {
          const hostname = await getHostname(question.remote.address)

          log.info(`Resolved ${replies.length} record(s)
  Source: ${replies.source}
  Client: ${hostname}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
          `)
        } catch (error) {
          log.info(`Resolved ${replies.length} record(s)
  Source: ${replies.source}
  Client: ${question.remote.address}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
          `)
        }
        replies.forEach((reply) => {
          respond[reply.type.toLowerCase()](reply)
        })
      }
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

const index = async () => {
  await run()
}

module.exports = {
  index
}
