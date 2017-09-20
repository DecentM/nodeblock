const {config} = require('./config')
const {getLocalRecord} = require('./db')
const {getRemoteRecord} = require('./network')
const {handle} = require('./error-handler')
const {server, startServer} = require('./server')
// const stats = require('./stats')
const log = require('chalk-console')
const ipRangeCheck = require('ip-range-check')

log.info('Nodeblock is starting')
// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = async (question, respond) => {
  // Try to get a cached record
  try {
    const local = await getLocalRecord(question)
    const remote = await getRemoteRecord(question, respond)

    if (local.length === 0) {
      return remote
    }

    return local
  } catch (error) {
    handle(error)
  }
}
// The main app logic

server.use(async (packet, respond, next) => {
  // We only support one question, so we make sure we only have one
  const question = packet.questions[0]

  if (!ipRangeCheck(question.remote.address, config.get('answerRange'))) {
    handle(new Error(`Client address is not in the permitted answer range(s):\n    Address: ${question.remote.address},\n    Permitted range(s): ${config.config.get('answerRange')}\n    `))
  } else {
    const replies = await requestRecord(question, respond)

    if (replies.length !== 0) {
      log.info(`Resolved ${replies.length} record(s) for ${question.remote.address}\n    Domain: ${question.name}\n      `)
      replies.forEach((reply) => {
        respond[reply.type.toLowerCase()](reply)
      })
    } else {
      handle(new Error(`An empty reply came back:
  Domain: ${question.name}
  Type: ${question.typeName.toUpperCase()}
  Client: ${question.remote.address}`
      ))
    }
    respond.end()
  }
})

startServer()
