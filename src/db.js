// @flow

import {config} from './config'
import Loki from 'lokijs'

const db = (collectionName: string): Promise<Object> => {
  return new Promise((resolve) => {
    if (!collectionName) {
      throw new Error('No collection specified')
    }

    const autoloadCallback = () => {
      let collection = lokiDb.getCollection(collectionName || 'records')

      if (collection === null) {
        collection = lokiDb.addCollection(collectionName || 'records')
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

  const records = await db('records')
  const dbResult = records.find(dbQuery)

  return dbResult
}

const setOrUpdateRecord = async (answers: Object) => {
  const records = await db('records')

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
