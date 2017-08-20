import { config } from './config'

import {
  getDb,
  getLocalRecord
} from './db'

import { getRemoteRecord } from './network'

import {
  handle,
  handleDomainErr
} from './error-handler'
import { server } from './server'
import * as Ifaces from './interfaces'
import * as logic from './logic'
import * as stats from './stats'

import * as log from 'chalk-console'
import * as dns from 'dns'
import * as ipRangeCheck from 'ip-range-check'

log.info('Nodeblock is starting')

// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = (question, respond) => {
  return new Promise((resolve, reject) => {
    // Try to get a cached record
    Promise.race([
      getLocalRecord(question),
      getRemoteRecord(question)
    ])
    .then((answer) => {
      resolve(answer)
      stats.encounter(question)
    })
    .catch((error) => {
      handleDomainErr(error, respond, question)
    })
  })
}

// The main app logic
server.use((packet, respond, next) => {
  // We only support one question, so we make sure we only have one
  const question = packet.questions[0]

  if (!(ipRangeCheck(question.remote.address, config.get('answerRange')))) {
    handle(new Error(`Client address is not in the permitted answer range(s):
    Address: ${question.remote.address},
    Permitted range(s): ${config.get('answerRange')}
    `)
  )} else {
    requestRecord(question, respond)
    .then((replies: Array<Ifaces.InternalAnswer>) => {
      log.info(`Resolved ${replies.length} record(s) for ${question.remote.address}
    Domain: ${question.name}
      `)
      replies.forEach((reply) => {
        respond[reply.type.toLowerCase()](reply)
      })
      respond.end()
    })
    .catch((error) => {
      handle(error)
    })
  }
})
