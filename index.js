/* jshint esversion:6, undef: false */

const dns = require('dns')
const dnsExpress = require('dns-express')
const Loki = require('lokijs')
const chalk = require('chalk')
const Q = require('q')

const server = dnsExpress()
const log = (content) => {
  // eslint-disable-next-line no-console
  console.log(chalk.cyan(JSON.stringify(content)))
}
const config = require('./config.json')

let records = null
const databaseInitialize = () => {
  records = db.getCollection('records')
  if (records === null) {
    records = db.addCollection('records')
  }

  runServer()
}

const db = new Loki('nodeblock.db', {
  'autoload':         true,
  'autoloadCallback': databaseInitialize,
  'autosave':         true,
  'autosaveInterval': 2000
})

const requestRecord = (domain) => {
  const deferred = Q.defer()

  dns.resolve(domain, (err, content) => {
    if (err) {
      deferred.reject(err)
    } else {
      deferred.resolve(content)
    }
  })
  return deferred.promise
}

const storeRecord = (record) => {
  if (typeof record === 'object') {
    log(`Storing record of ${record.name}, ${record.value} in database`)
    records.insert(record)
  } else {
    throw new TypeError(`Not storing invalid record ${JSON.stringify(record)}`)
  }
}

const runServer = () => {
  server.listen(config.port)
}

server.use((req, res, next) => {
  if (req.questions.length > 1) {
    throw new Error('More than one question in one query is not supported')
  } else {
    const question = req.questions[0]
    const dbResult = records.find({'name': question.name})

    if (dbResult.length > 0) {
      log(`Response for ${question.name} found in database, responding with ${dbResult[0].value}, then querying`)
      res.a({
        'name':    question.name,
        'address': dbResult[0].value,
        'ttl':     600
      })
      res.end()
      requestRecord(question.name)
        .then((value) => {
          log(`Async remote query complete, got ${value[0]}`)
          storeRecord({
            'name':  question.name,
            'value': value[0]
          })
        })
    } else {
      log(`Response for ${question.name} not found in database, querying`)
      dns.resolve(question.name, (err, content) => {
        if (err) {
          log('An error occurred')
          throw err
        } else {
          log(`Sync remote query complete, got ${content[0]}`)
          res.a({
            'name':    question.name,
            'address': content[0],
            'ttl':     600
          })
          res.end()
          storeRecord({
            'name':  question.name,
            'value': content[0]
          })
        }
      })
    }
  }
})
