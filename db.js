const config = require('./config.json')
const Loki = require('lokijs')
// const chalk = require('chalk')
const log = require('chalk-console')

module.exports = (table) => {
  // This promise initializes the databases and resolves when all of them
  // are done loading
  return new Promise((resolve, reject) => {
    let rows = []
    let db = null
    const tables = {}
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
        'autosave':         !!config.autosaveInterval,
        'autosaveInterval': config.autosaveInterval
      })
    } catch (error) {
      log.error(`Failed to initialize ${table} database`)
      reject(error)
    }
  })
}
