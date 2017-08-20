import { config } from './config'
import * as Ifaces from './interfaces'
import * as logic from './logic'
import { handle } from './error-handler'

import * as Loki from 'lokijs'
import * as log from 'chalk-console'

const db = (table: string) => {
  // This promise initializes the databases and resolves when all of them
  // are done loading
  return new Promise((resolve, reject) => {
    let rows: Array<any> = []
    let db = null
    const tables: Array<any> = []
    const databaseInitialize = () => {
      // If the db already exists, load it from the file
      // else, create it
      rows = db.getCollection(table)
      if (rows === null) {
        rows = db.addCollection(table)
      }
      tables[table] = rows
      resolve(tables[table])
    }

    try {
      // Use Lokijs to create the table we are asked to create
      db = new Loki(`${table}.db`, {
        'autoload':         true,
        'autoloadCallback': databaseInitialize,
        'autosave':         !!config.get('autosaveInterval'),
        'autosaveInterval': config.get('autosaveInterval')
      })
    } catch (error) {
      log.error(`Failed to initialize ${table} database`)
      reject(error)
    }
  })
}

const dbPromises = [
  db('records'),
  db('stats')
]

const dbPromise = new Promise((resolve, reject) => {
  Promise.all(dbPromises)
  .then((values) => {
    resolve(values)
  })
  .catch((error) => {
    reject(error)
  })
})

export const getDb = (name: string) => {
  return new Promise((resolve, reject) => {
    dbPromise
    .then((dbs: Array<LokiEventEmitter>) => {
      resolve(logic.findInArr(dbs, name))
    })
    .catch((error) => {
      reject(error)
    })
  })
}


// This promise does the same as getRemoteRecord, just from the Lokijs database
export const getLocalRecord = (question) => {
  return new Promise((resolve, reject) => {
    // Put the search results in dbResult
    const dbQuery: Ifaces.IdbQuery = {
      'name': question.name,
      'type': question.typeName.toUpperCase()
    }
    getDb('records')
    .then((records: LokiResultset<any>) => {
      const dbResult = records.find(dbQuery)

      if (dbResult.length === 1) {
        resolve(dbResult)
      }
    })
    .catch((error) => {
      handle(error)
    })
  })
}
