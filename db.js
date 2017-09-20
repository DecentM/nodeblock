const config = require('./config')
// const logic = require('./logic')
// const errorHandler = require('./error-handler')
const Loki = require('lokijs')
// const log = require('chalk-console')

const db = () => {
  return new Promise((resolve) => {
    const autoloadCallback = () => {
      let nodeblockCollection = lokiDb.getCollection('nodeblock')

      if (nodeblockCollection === null) {
        nodeblockCollection = lokiDb.addCollection('nodeblock')
      }

      resolve(nodeblockCollection)
    }

    // Use Lokijs to create our database
    const lokiDb = new Loki('nodeblock.db', {
      'autoload':         true,
      'autosave':         !!config.config.get('autosaveInterval'),
      'autosaveInterval': config.config.get('autosaveInterval'),
      autoloadCallback
    })
  })
}

// This function does the same as getRemoteRecord, just from the Lokijs database
const getLocalRecord = async (question) => {
  // Put the search results in dbResult
  const dbQuery = {
    'name': question.name,
    'type': question.typeName.toUpperCase()
  }

  const records = await db()
  const dbResult = records.find(dbQuery)

  return dbResult
}

module.exports = {
  getLocalRecord,
  db
}
