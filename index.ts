import * as Conf from 'conf'
const config = new Conf({
  'cwd':        '.',
  'configName': 'nodeblock.conf'
})

import { db } from './db'
import * as log from 'chalk-console'

import * as dnsExpress from 'dns-express'

import * as Ifaces from './interfaces'
import { getRemoteRecord } from './get-remote-record'

const dbPromise = (db as any)('records')
const server = dnsExpress()

let records
// Database initialization logic
dbPromise.then((recordsTable) => {
  records = recordsTable
})

// This promise does the same as getRemoteRecord, just from the Lokijs database
const getLocalRecord = (question) => {
  return new Promise((resolve, reject) => {
    // Put the search results in dbResult
    const dbQuery: Ifaces.IdbQuery = {
      'name': question.name,
      'type': question.typeName.toUpperCase()
    }
    const dbResult = records.find(dbQuery)

    // Only resolve the promise if we have exactly one result from the db,
    // otherwise something bad happened or we don't have said record in the
    // db yet (database === cache)
    //
    // If this promise is rejected, we will later assume that we don't have
    // this record yet.
    dbResult.source = 'database'
    if (dbResult.length > 0) {
      resolve(dbResult)
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

// This function starts the server up
const runServer = () => {
  // Try starting the dns-express server
  // If it fails, log the error and reject
  try {
    server.listen(config.get('port'))
    log.info(`DNS Server started and listening on port ${config.get('port')}`)
  } catch (error) {
    log.error(`Failed to start DNS server:
  ${error.stack}
    `)
  }
}

// This promise writes a record to the in-memory Lokijs database
const storeRecord = (record) => {
  return new Promise((resolve, reject) => {
    // Try updating the record
    // If that fails, the record doesn't exist yet, so we create it
    //
    // There's not a lot of reasons this can fail, because once the db
    // is initialized, it resides in memory
    const alreadyIn = records.find(record).length > 0
    if (alreadyIn) {
      reject(new Error(`The object is already in the database:
    ${JSON.stringify(record)}
      `))
    }
    try {
      records.insert(record)
      resolve(true)
    } catch (error) {
      reject(error)
    }
  })
}

// The main app logic
server.use((packet, respond, next) => {
  // We only support one question, so we make sure we only have one
  const question = packet.questions[0]

  // Request a record from wherever
  requestRecord(question)
  .then((replies: Ifaces.IfinalReply) => {
    log.info(`Resolved ${replies.length} record(s) for ${question.remote.address} from ${replies.source}
    Domain: ${question.name}
    `)

    switch (replies.source) {
    case 'online':
      replies.forEach((reply) => {
        respond[reply.type.toLowerCase()](reply)
        storeRecord(reply)
        .catch((error) => {
          log.error(`An error occurred while storing a record:
    ${error.stack}
          `)
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
              log.error(`An error occurred while storing a remote record:
    ${error.stack}
              `)
            })
          })
        })
        .catch((error) => {
          log.error(`An error occurred while remotely querying a record:
    ${error.stack}
          `)
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
      log.error(`An error occurred while querying:
    ${error.stack}
      `)
      respond.end()
      break
    }
  })
})

dbPromise.then(runServer())
.catch((error) => {
  log.error(`An error occurred while initializing:
    ${error.stack}
  `)
  throw error
})
