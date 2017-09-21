// @flow

import {config} from './config'
import Loki from 'lokijs'

const db = (collectionName: ?string): Promise<Object> => {
  return new Promise((resolve) => {
    const autoloadCallback = () => {
      let requestedCollection = collectionName

      if (!requestedCollection) {
        requestedCollection = 'records'
      }

      let collection = lokiDb.getCollection(requestedCollection)

      if (collection === null) {
        collection = lokiDb.addCollection(requestedCollection)
      }

      resolve(collection)
    }

    // Use Lokijs to create our database
    const lokiDb = new Loki('nodeblock.db', {
      'autoload':         true,
      'autosave':         !!config.get('autosaveInterval'),
      'autosaveInterval': config.get('autosaveInterval'),
      autoloadCallback
    })
  })
}

// This function does the same as getRemoteRecord, just from the Lokijs database
const getLocalRecord = async (question: Object) => {
  // Put the search results in dbResult
  const dbQuery = {
    'name': question.name,
    'type': question.typeName.toUpperCase()
  }

  const records = await db()
  const dbResult = records.find(dbQuery)

  return dbResult
}

const setOrUpdateRecord = async (answers: Object) => {
  const records = await db()

  answers.forEach((answer) => {
    try {
      records.updateWhere((obj) => {
        return obj.name === answer.name && obj.type === answer.type
      }, () => {
        return answer
      })
    } catch (error) {
      records.insert(answer)
    }
  })
}

module.exports = {
  getLocalRecord,
  db,
  setOrUpdateRecord
}
