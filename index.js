/* eslint no-console:0 */

const config = require('./config.json')

const dns = require('dns')
const dnsExpress = require('dns-express')
const Loki = require('lokijs')
const chalk = require('chalk')

const server = dnsExpress()
const log = (content) => {
  console.log(chalk.cyan(JSON.stringify(content)))
}

let records = []
const databaseInitialize = () => {
  records = db.getCollection('records')
  if (records === null) {
    records = db.addCollection('records')
  }

  runServer()
}

const db = new Loki('nodeblock.db', {
  'autoload':         true,
  'autoloadCallback': databaseInitialize,
  'autosave':         true,
  'autosaveInterval': 2000
})

const requestRecord = (question) => {
  return new Promise((resolve, reject) => {
    let answerObj = {}

    const dbResult = records.find({
      'name': question.name,
      'type': question.typeName.toUpperCase()
    })

    if (dbResult.length > 0) {
      dbResult[0].fromDb = true
      resolve(dbResult[0])
    }

    try {
      dns.resolve(question.name, question.typeName.toUpperCase(), (error, record) => {
        if (error) {
          reject(new Error(error))
        } else {
          switch (question.typeName) {
            case 'a' || 'aaaa':
              answerObj.address = record[0]
              break
            case 'mx':
              answerObj = record[0]
              break
            case 'txt' || 'ns' || 'cname' || 'ptr':
              answerObj.data = record[0]
              break
            default:
              answerObj.data = record[0]
              answerObj.address = record[0]
              break
          }

          answerObj.type = question.typeName.toUpperCase()
          answerObj.name = question.name
          answerObj.ttl = question.ttl || 300

          resolve(answerObj)
        }
      })
    } catch (error) {
      reject(new Error(error))
    }
  })
}

const storeRecord = (record) => {
  return new Promise((resolve, reject) => {
    try {
      records.insert(record)
      resolve(record)
    } catch (error) {
      reject(new Error(error))
    }
  })
}

const runServer = () => {
  log(`Starting server on port ${config.port}`)
  server.listen(config.port)
}

server.use((packet, respond, next) => {
  const question = packet.questions[0]

  requestRecord(question)
    .then((remoteReply) => {
      respond[remoteReply.type.toLowerCase()](remoteReply)
      respond.end()
      if (!remoteReply.fromDb) {
        storeRecord(remoteReply)
      }
    })
    .catch((error) => {
      log('An error occurred while querying')
      respond.end()
      console.error(error)
    })
})
