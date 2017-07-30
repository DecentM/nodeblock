const config = require('./config.json')
const db = require('./db')
const log = require('chalk-console')

const dns = require('dns')
const dnsExpress = require('dns-express')
const server = dnsExpress()

let records = []
// let stats = []

// This promise returns the contents of a DNS record from the operating system
// (i.e. the server abstracted by it)
const getRemoteRecord = (question) => {
  return new Promise((resolve, reject) => {
    let answerObj = {}

    try {
      // Begin resolving
      dns.resolve(question.name, question.typeName.toUpperCase(), (error, record) => {
        if (error) {
          // Since this is a functional promise, we don't log anything,
          // just reject with the error
          reject(error)
        } else {
          // This switch sets values required for different record types
          // It's really sloppy and I just made this so that dns-express
          // doesn't throw errors :shameface:
          switch (question.typeName) {
          case 'a' || 'aaaa':
            answerObj.address = record[0]
            break
          case 'mx':
            answerObj = record[0]
            answerObj.address = answerObj.exchange
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

          // Once the answer object has been constructed, resolve the
          // promise with it
          resolve(answerObj)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

// This promise does the same as getRemoteRecord, just from the Lokijs database
const getLocalRecord = (question) => {
  return new Promise((resolve, reject) => {
    // Put the search results in dbResult
    const dbResult = records.find({
      'name': question.name,
      'type': question.typeName.toUpperCase()
    })

    // Only resolve the promise if we have exactly one result from the db,
    // otherwise something bad happened or we don't have said record in the
    // db yet (database === cache)
    //
    // If this promise is rejected, we will later assume that we don't have
    // this record yet.
    if (dbResult.length > 0) {
      resolve(dbResult[0])
    } else {
      reject(new Error(dbResult))
    }
  })
}

// This promise ties getRemoteRecord and getLocalRecord together by first
// trying to resolve itself using getLocalRecord. If that fails, we query
// the operating system for one with getRemoteRecord
const requestRecord = (question) => {
  return new Promise((resolve, reject) => {
    // Try to get a cached record
    getLocalRecord(question)
    .then((answer) => {
      // If that succeeds, set the query source to 'database' for later use
      answer.source = 'database'
      resolve(answer)
    })
    .catch(() => {
      // If querying the database fails for some reason, query the
      // OS and resolve the promise with that result
      getRemoteRecord(question)
      .then((answer) => {
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

// This promise starts the server up
const runServer = () => {
  return new Promise((resolve, reject) => {
    // Try starting the dns-express server
    // If it fails, log the error and reject
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

// This promise writes a record to the in-memory Lokijs database
const storeRecord = (record) => {
  return new Promise((resolve, reject) => {
    // Try updating the record
    // If that fails, the record doesn't exist yet, so we create it
    //
    // There's not a lot of reasons this can fail, because once the db
    // is initialized, it resides in memory
    try {
      records.update(record)
      resolve()
    } catch (error) {
      records.insert(record)
      resolve()
    }
  })
}

// The main app logic
server.use((packet, respond, next) => {
  // We only support one question, so we make sure we only have one
  const question = packet.questions[0]

  // Request a record from wherever
  requestRecord(question)
  .then((remoteReply) => {
    log.info(`Resolved ${question.typeName.toUpperCase()} record for ${question.remote.address} from ${remoteReply.source}
    Domain: ${question.name}
    Result: ${remoteReply.address}
    `)

    // If we got the answer from the Internet, we store it in the database
    //
    // If we got it from the database, we get a new one from the Internet
    // after responding to the client with the cached one
    if (remoteReply.source === 'online') {
      storeRecord(remoteReply)
      .catch((error) => {
        log.error(`An error occurred while storing a record:
          ${error}
        `)
      })
    } else if (remoteReply.source === 'database') {
      getRemoteRecord(question)
      .then((answer) => {
        storeRecord(answer)
      })
      .catch((error) => {
        log.error(`An error occurred while storing a record:
          ${error}
        `)
      })
    }

    // Remove the source property, so that it doesn't get stored in the database
    Reflect.deleteProperty(remoteReply, 'source')

    // Finally, we send off the crafted response to the client who asked for it
    respond[remoteReply.type.toLowerCase()](remoteReply)
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
      log.error(`An error occurred while querying:
    ${error}
      `)
      respond.end()
      break
    }
  })
})

// Database initialization logic
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
