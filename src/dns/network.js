// @flow

import os from 'os'
import network from 'network'
import pify from 'pify'
import {handleDomainErr} from './error-handler'
import {isEqual} from 'lodash'
import log from 'chalk-console'
const dns: any = require('dns')

const processQuestion = async (question, records) => {
  let answers = []
  // This switch sets values required for different record types

  if (!records[0]) {
    return []
  }

  switch (question.typeName) {
  case 'mx':
    const mxAnswers = []

    records.forEach((record) => {
      mxAnswers.push({
        'type':     'MX',
        'name':     question.name,
        'ttl':      question.ttl || 300,
        'address':  record.name,
        'exchange': record.exchange,
        'priority': record.priority
      })
    })
    answers = mxAnswers
    break
  case 'naptr':
    answers = []
    break
  case 'soa':
    const soaAnswers = []

    records.forEach((record) => {
      soaAnswers.push({
        'nsname':     record.nsname,
        'hostmaster': record.hostmaster,
        'serial':     record.serial,
        'refresh':    record.refresh,
        'retry':      record.retry,
        'expire':     record.expire,
        'expiration': record.expiration || record.expire,
        'minttl':     record.minttl,
        'minimum':    record.minimum || record.minttl,
        'type':       'SOA',
        'name':       question.name,
        'ttl':        question.ttl || 300,
        'primary':    record.primary || record.hostmaster,
        'admin':      record.admin || record.hostmaster
      })
    })
    answers = soaAnswers
    break
  case 'srv':
    const srvAnswers = []

    records.forEach((record) => {
      srvAnswers.push({
        'type':     'SRV',
        'name':     question.name,
        'ttl':      question.ttl || 300,
        'priority': record.priority,
        'weight':   record.weight,
        'port':     record.port
      })
    })
    answers = srvAnswers
    break
  case 'any':
    const anyAnswers = []

    answers = anyAnswers
    break
  default:
    const stdAnswers = []

    records.forEach((record) => {
      stdAnswers.push({
        'type':    question.typeName.toUpperCase(),
        'name':    question.name,
        'ttl':     question.ttl || 300,
        'address': record,
        'data':    record
      })
    })
    answers = stdAnswers
    break
  }

  return answers
}

const dnsResolve = async (question, respond) => {
  try {
    const resolved = await pify(dns.resolve)(question.name, question.typeName.toUpperCase())

    return resolved
  } catch (error) {
    handleDomainErr(error, respond, question)
  }
}

const getRemoteRecord = async (question: Object, respond: Object): any => {
  if (question.remote.address === '127.0.0.1') {
    let internalCmd = null

    try {
      internalCmd = String(question.name.match(/^nodeblock:(.*)/g)[0]).split(':')[1]
    } catch (error) {
      internalCmd = null
    }

    if (internalCmd) {
      switch (internalCmd) {
      case 'quit':
        log.warn(`Process ${process.pid} is exiting due to internal command`)
        respond.end()
        setImmediate(() => {
          process.exit() // eslint-disable-line no-process-exit
        })
        break
      case 'ping':
        return [ {
          'type':     'A',
          'name':     'nodeblock:ping',
          'ttl':      1,
          'address':  '127.0.0.1',
          'data':     '127.0.0.1',
          'internal': true
        } ]
      default:
        log.error('Missing or unknown internal command')
        break
      }
    }
  }

  const records = await dnsResolve(question, respond)
  let answerRecords = records

  if (!(answerRecords instanceof Array)) {
    answerRecords = Array(answerRecords)
  }

  const answers = await processQuestion(question, answerRecords)

  return answers
}

const getHostname = async (ip: string) => {
  if (ip === '127.0.0.1') {
    return os.hostname()
  }

  const gateway = await pify(network.get_gateway_ip)()

  if (isEqual(dns.getServers(), Array(gateway))) {
    const resolved = await pify(dns.reverse)(ip)

    return resolved
  }

  throw new Error('The DNS server and the gateway are not the same')
}

module.exports = {
  getRemoteRecord,
  getHostname
}