// @flow

import {config} from './config'
import Loki from 'lokijs'
import log from 'chalk-console'

const collectionNames = [
  'stats',
  'records',
  'queue'
]

let lokiDb: any = null

// Use Lokijs to create our database
const initializeLoki = () => {
  return new Promise((resolve, reject) => {
    lokiDb = new Loki('nodeblock.db', {
      'autoload':         true,
      'autosave':         !!config.get('autosaveInterval'),
      'autosaveInterval': config.get('autosaveInterval'),
      'autoloadCallback': () => {
        collectionNames.forEach((collectionName) => {
          let collection = lokiDb.getCollection(collectionName)

          log.info(`Collection ${collectionName} loading`)

          if (collection === null) {
            log.info(`Populating database with collection: ${collectionName}`)
            collection = lokiDb.addCollection(collectionName)
          }
        })

        log.info(`Database ready with collections: ${collectionNames.join(', ')}`)
        resolve()
      }
    })
  })
}

const db = async () => {
  if (!lokiDb) {
    await initializeLoki()
  }

  return lokiDb
}

// This function does the same as getRemoteRecord, just from the Lokijs database
const getLocalRecord = async (question: Object) => {
  // Put the search results in dbResult
  const dbQuery = {
    'name': question.name,
    'type': question.typeName.toUpperCase()
  }

  const dbase = await db()
  const records = dbase.getCollection('records')
  const dbResult = records.find(dbQuery)

  return dbResult
}

const setOrUpdateRecord = async (answers: Object) => {
  const dbase = await db()
  const records = dbase.getCollection('records')

  answers.forEach((answer) => {
    const count = records.count({
      'name': answer.name,
      'type': answer.type
    })

    if (count >= 1) {
      records.updateWhere((obj) => {
        return obj.name === answer.name && obj.type === answer.type
      }, () => {
        return answer
      })
    } else {
      records.insert(answer)
    }
  })
}

module.exports = {
  getLocalRecord,
  db,
  setOrUpdateRecord
}
