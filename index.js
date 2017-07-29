/* eslint no-console:0 */
const config = require('./config.json')
const db = require('./db')
const log = require('chalk-console')

const dns = require('dns')
const dnsExpress = require('dns-express')

const server = dnsExpress()

let records = []
// let stats = []

const getRemoteRecord = (question) => {
  return new Promise((resolve, reject) => {
    let answerObj = {}

    try {
      dns.resolve(question.name, question.typeName.toUpperCase(), (error, record) => {
        if (error) {
          reject(error)
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
      reject(error)
    }
  })
}

const getLocalRecord = (question) => {
  return new Promise((resolve, reject) => {
    const dbResult = records.find({
      'name': question.name,
      'type': question.typeName.toUpperCase()
    })

    if (dbResult.length > 0) {
      dbResult[0].fromDb = true
      resolve(dbResult[0])
    } else {
      reject(new Error(dbResult))
    }
  })
}

const requestRecord = (question) => {
  return new Promise((resolve, reject) => {
    getLocalRecord(question)
    .then((answer) => {
      resolve(answer)
    })
    .catch(() => {
      getRemoteRecord(question)
      .then((answer) => {
        resolve(answer)
      })
      .catch((error) => {
        reject(error)
      })
    })
  })
}

/* const storeRecord = (record) => {
  return new Promise((resolve, reject) => {
    try {
      records.insert(record)
      resolve(record)
    } catch (error) {
      reject(new Error(error))
    }
  })
} */

const runServer = () => {
  return new Promise((resolve, reject) => {
    try {
      server.listen(config.port)
      log.info(`DNS Server started and listening on port ${config.port}`)
      resolve()
    } catch (error) {
      log.error(`Failed to start DNS server: ${error}`)
      reject(new Error())
    }
  })
}

server.use((packet, respond, next) => {
  const question = packet.questions[0]

  requestRecord(question)
  .then((remoteReply) => {
    respond[remoteReply.type.toLowerCase()](remoteReply)
    respond.end()
  })
  .catch((error) => {
    log.error(`An error occurred while querying: ${error}`)
    respond.end()
  })
})

db('records')
.then((recordsTable) => {
  records = recordsTable
})
.then(db('stats'))
/* .then((statsTable) => {
  stats = statsTable
}) */
.then(runServer())
.catch((error) => {
  log.error(`An error occurred while initializing: ${error}`)
})
