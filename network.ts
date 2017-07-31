import * as dns from 'dns'
import * as Ifaces from './interfaces'

// This promise returns the contents of a DNS record from the operating system
// (i.e. the server abstracted by it)
export const getReverseHost = (ip) => {
  return new Promise((resolve, reject) => {
    try {
      dns.reverse((ip as string), (error, hostname: Array<any>) => {
        if (error) {
          reject(error)
        }
        resolve(hostname)
      })
    } catch (error) {
      reject(error)
    }
  })
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
          // Since this is a functional promise, we don't log anything,
          // just reject with the error
          reject(error)
        } else {
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
            reject(new Error('NAPTR records are currently not supported'))
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

          // Once the answer object has been constructed, resolve the
          // promise with it
          resolve(answers)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}
