// @flow

require('babel-polyfill')

const {config} = require('./config')
const {getLocalRecord, setOrUpdateRecord} = require('./db')
const {getRemoteRecord} = require('./network')
const {handle} = require('./error-handler')
const {server, startServer} = require('./server')
const {storeEvent} = require('./stats')
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

      setOrUpdateRecord(remote)
      storeEvent('query:remote', remote)
      return remote
    }

    storeEvent('query:local', local)
    return local
  } catch (error) {
    handle(error)
  }
}

const checkIpRanges = async (ip: string) => {
  return ipRangeCheck(ip, config.get('answerRange'))
}

// The main app logic

const run = () => {
  server.use(async (packet: Object, respond: Object, next: Function) => {
    // We only support one question, so we make sure we only have one
    const question = packet.questions[0]
    const permitted = await checkIpRanges(question.remote.address)

    if (permitted) {
      const replies = await requestRecord(question, respond)

      if (replies.length !== 0) {
        log.info(`Resolved ${replies.length} record(s) for ${question.remote.address}
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
        `)
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
  startServer()
}

run()
