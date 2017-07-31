import { config } from './config'

import {
  records,
  getLocalRecord,
  storeRecord
} from './db'

import {
  getRemoteRecord,
  getReverseHost
} from './network'

import { handle } from './error-handler'
import { server } from './server'
import * as Ifaces from './interfaces'

import * as log from 'chalk-console'
import * as dns from 'dns'
import * as ipRangeCheck from 'ip-range-check'

log.info('Nodeblock is starting')

// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = (question) => {
  return new Promise((resolve, reject) => {
    // Try to get a cached record
    getLocalRecord(question)
    .then((answer: Ifaces.InternalAnswer) => {
      // If that succeeds, set the query source to 'database' for later use
      resolve(answer)
    })
    .catch(() => {
      // If querying the database fails for some reason, query the
      // OS and resolve the promise with that result
      getRemoteRecord(question)
      .then((answer: Ifaces.InternalAnswer) => {
        answer.source = 'online'
        resolve(answer)
      })
      .catch((error) => {
        // Reject the promise if the OS can't give us anything
        // (like if we don't have an internet connection)
        reject(error)
      })
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
    Range(s): ${config.get('answerRange')}
    `))
  } else {
    // Request a record from wherever
    requestRecord(question)
    .then((replies: Ifaces.IfinalReply) => {
      getReverseHost(question.remote.address)
      .then((hostname: Array<any>) => {
        if (hostname.length === 0) {
          hostname[0] = question.remote.address
        }
        log.info(`Resolved ${replies.length} record(s) for ${hostname} from ${replies.source}
        Domain: ${question.name}
        `)
      })
      .catch((error) => {
        handle(error)
      })

      switch (replies.source) {
        case 'online':
        replies.forEach((reply) => {
          respond[reply.type.toLowerCase()](reply)
          storeRecord(reply)
          .catch((error) => {
            handle(error)
          })
        })
        break
        case 'database':
        replies.forEach((reply) => {
          respond[reply.type.toLowerCase()](reply)
          getRemoteRecord(question)
          .then((remoteReplies: Array<Ifaces.InternalAnswer>) => {
            records.findAndRemove({
              'type': replies[0].type,
              'name': replies[0].name
            })
            remoteReplies.forEach((remoteReply) => {
              storeRecord(remoteReply)
              .catch((error) => {
                handle(error)
              })
            })
          })
          .catch((error) => {
            handle(error)
          })
        })
        break
        default:
        log.error(`DNS reply source is neither 'online', or 'database'
        ${new Error().stack}
        `)
        break
      }
      respond.end()
    })
    .catch((error) => {
      switch (error.code) {
        // If we get an answer saying that the record doesn't exist, we suppress
        // the error message and reply with an empty record
        case 'ENODATA':
        respond.end()
        break
        default:
        handle(error)
        respond.end()
        break
      }
    })
  }

})
