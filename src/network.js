// @flow

const dns = require('dns')
const processQuestion = async (question, records) => {
  let answers = []
  // This switch sets values required for different record types

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

const pify = require('pify')
const {handleDomainErr} = require('./error-handler')

const dnsResolve = async (question, respond) => {
  try {
    const resolved = await pify(dns.resolve)(question.name, question.typeName.toUpperCase())

    return resolved
  } catch (error) {
    handleDomainErr(error, respond, question)
  }
}

const getRemoteRecord = async (question: Object, respond: Object): any => {
  const records = await dnsResolve(question, respond)
  let answerRecords = records

  if (!(answerRecords instanceof Array)) {
    answerRecords = Array(answerRecords)
  }

  const answers = await processQuestion(question, answerRecords)

  return answers
}

module.exports = {
  getRemoteRecord
}
