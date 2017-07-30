// const config = require('./config.json')
const Loki = require('lokijs')
// const chalk = require('chalk')
const log = require('chalk-console')

module.exports = (table) => {
  return new Promise((resolve, reject) => {
    let rows = []
    let db = null
    const tables = {}
    const databaseInitialize = () => {
      rows = db.getCollection(table)
      if (rows === null) {
        rows = db.addCollection(table)
      }
      tables[table] = rows
      resolve(tables[table])
    }

    try {
      db = new Loki(`${table}.db`, {
        'autoload':         true,
        'autoloadCallback': databaseInitialize,
        'autosave':         true,
        'autosaveInterval': 2000
      })
    } catch (error) {
      log.error(`Failed to initialize ${table}`)
      reject(new Error(error))
    }
  })
}
