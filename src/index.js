// @flow

require('babel-polyfill')

const {config} = require('./config')
const {getLocalRecord} = require('./db')
const {getRemoteRecord} = require('./network')
const {handle} = require('./error-handler')
const {server, startServer} = require('./server')
const {recordResolved} = require('./stats')
const log = require('chalk-console')
const ipRangeCheck = require('ip-range-check')

// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = async (question: Object, respond: Object): Object => {
  // Try to get a cached record
  try {
    const local = await getLocalRecord(question)

    if (local.length === 0) {
      const remote = await getRemoteRecord(question, respond)

      recordResolved(question)
      return remote
    }

    return local
  } catch (error) {
    handle(error)
  }
}
// The main app logic

const run = () => {
  server.use(async (packet: Object, respond: Object, next: Function) => {
    // We only support one question, so we make sure we only have one
    const question = packet.questions[0]

    if (!ipRangeCheck(question.remote.address, config.get('answerRange'))) {
      throw new Error(`Client address is not in the permitted answer range(s):
    Address: ${question.remote.address},
    Permitted range(s): ${config.config.get('answerRange')}
      `)
    } else {
      const replies = await requestRecord(question, respond)

      if (replies.length !== 0) {
        log.info(`Resolved ${replies.length} record(s) for ${question.remote.address}
    Domain: ${question.name}
    Type: ${question.typeName.toUpperCase()}
        `)
        replies.forEach((reply) => {
          respond[reply.type.toLowerCase()](reply)
        })
      } else {
        handle(new Error(`An empty reply came back:
    Domain: ${question.name}
    Type: ${question.typeName.toUpperCase()}
    Client: ${question.remote.address}
        `))
      }
      respond.end()
    }
  })

  log.info('Nodeblock is starting')
  startServer()
}

run()
