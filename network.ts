import * as dns from 'dns'
import * as Ifaces from './interfaces'

const processQuestion = (question, records) => {
  let answers

  // This switch sets values required for different record types
  switch (question.typeName) {
  case 'mx':
    const mxAnswers: Array<Ifaces.MX> = []
    records.forEach((record) => {
      mxAnswers.push({
        'type': 'MX',
        'name': question.name,
        'ttl': question.ttl || 300,
        'address': record.name,
        'exchange': record.exchange,
        'priority': record.priority
      })
    })
    answers = mxAnswers
    break
  case 'naptr':
    const naptrAnswers: Array<Ifaces.NAPTR> = []
    break
  case 'soa':
    const soaAnswers: Array<Ifaces.SOA> = []
    records.forEach((record) => {
      soaAnswers.push({
        'nsname': record.nsname,
        'hostmaster': record.hostmaster,
        'serial': record.serial,
        'refresh': record.refresh,
        'retry': record.retry,
        'expire': record.expire,
        'expiration': record.expiration || record.expire,
        'minttl': record.minttl,
        'minimum': record.minimum || record.minttl,
        'type': 'SOA',
        'name': question.name,
        'ttl': question.ttl || 300,
        'primary': record.primary || record.hostmaster,
        'admin': record.admin || record.hostmaster
      })
    })
    answers = soaAnswers
    break
  case 'srv':
    const srvAnswers: Array<Ifaces.SRV> = []
    records.forEach((record) => {
      srvAnswers.push({
        'type': 'SRV',
        'name': question.name,
        'ttl': question.ttl || 300,
        'priority': record.priority,
        'weight': record.weight,
        'port': record.port
      })
    })
    answers = srvAnswers
    break
  case 'any':
    const anyAnswers: Array<any> = []
    answers = anyAnswers
  break
  default:
    const stdAnswers: Array<Ifaces.standard> = []
    records.forEach((record) => {
      stdAnswers.push({
        'type': question.typeName.toUpperCase(),
        'name': question.name,
        'ttl': question.ttl || 300,
        'address': record,
        'data': record
      })
    })
    answers = stdAnswers
    break
  }

  return answers
}

export const getRemoteRecord = (question) => {
  return new Promise((resolve, reject) => {
    let answers: Array<Ifaces.standard> | Array<Ifaces.MX> | Array<Ifaces.NAPTR> | Array<Ifaces.SOA> | Array<Ifaces.SRV> = []

    try {
      // Begin resolving
      dns.resolve(question.name, question.typeName.toUpperCase(), (error: Error, records: (Array<any> | string)) => {
        if (typeof records === 'string') {
          const stringRecords: string = records
          records = [stringRecords]
        } else if (typeof records === 'object' && !(records instanceof Array)) {
          const objectRecords: object = records
          records = [objectRecords]
        }

        if (error) {
          reject(error)
        } else {
          const answers = processQuestion(question, records)

          // Once the answer object has been constructed, resolve the
          // promise with it
          if (answers.length === 0) {
            dns.resolveCname(question.name, (err, cnameAnswers) => {
              if (error) {
                reject(error)
              } else {
                resolve(cnameAnswers)
              }
            })
          } else {
            resolve(answers)
          }
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}
