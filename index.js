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
      answer.source = 'database'
      resolve(answer)
    })
    .catch(() => {
      getRemoteRecord(question)
      .then((answer) => {
        answer.source = 'online'
        resolve(answer)
      })
      .catch((error) => {
        reject(error)
      })
    })
  })
}

const runServer = () => {
  return new Promise((resolve, reject) => {
    try {
      server.listen(config.port)
      log.info(`DNS Server started and listening on port ${config.port}`)
      resolve()
    } catch (error) {
      log.error(`Failed to start DNS server:
    ${error}
      `)
      reject(error)
    }
  })
}

const recordCached = (record) => {
  return new Promise((resolve, reject) => {
    const result = records.find({
      'address': record.address,
      'type':    record.type
    })

    try {
      if (result.length > 0) {
        resolve(true)
      } else {
        resolve(false)
      }
    } catch (error) {
      log.error(`An error occurred while determining cached status:
    ${error}
      `)
      reject(error)
    }
  })
}

const storeRecord = (record) => {
  return new Promise((resolve, reject) => {
    recordCached(record)
    .then((cached) => {
      if (cached) {
        try {
          records.update(record)
          resolve()
        } catch (error) {
          log.error(`An error occurred while updating database:
    ${error}
          `)
          reject(error)
        }
      } else {
        try {
          records.insert(record)
          resolve(record)
        } catch (error) {
          log.error(`An error occurred while inserting into database:
    ${error}
          `)
          reject(error)
        }
      }
    })
    .catch((error) => {
      log.error(`An error occurred while caching a record:
    ${error}
      `)
      reject(error)
    })
  })
}

server.use((packet, respond, next) => {
  const question = packet.questions[0]

  requestRecord(question)
  .then((remoteReply) => {
    log.info(`Resolved ${question.typeName.toUpperCase()} record for ${question.remote.address} from ${remoteReply.source}
    Domain: ${question.name}
    Result: ${remoteReply.address}
    `)
    Reflect.deleteProperty(remoteReply, 'source')

    respond[remoteReply.type.toLowerCase()](remoteReply)
    respond.end()

    storeRecord(remoteReply)
    .catch((error) => {
      log.error(`An error occurred while storing a record:
        ${error}
        `)
    })
  })
  .catch((error) => {
    switch (error.code) {
    case 'ENODATA':
      respond.end()
      break
    default:
      log.error(`An error occurred while querying:
    ${error}
      `)
      break
    }
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
  throw error
})
