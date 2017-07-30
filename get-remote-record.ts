import * as dns from 'dns'
import * as Ifaces from './interfaces'

// This promise returns the contents of a DNS record from the operating system
// (i.e. the server abstracted by it)
export const getRemoteRecord = (question) => {
  return new Promise((resolve, reject) => {
    let answers: Array<Ifaces.standard> | Array<Ifaces.MX> | Array<Ifaces.NAPTR> | Array<Ifaces.SOA> | Array<Ifaces.SRV> = []

    try {
      // Begin resolving
      dns.resolve(question.name, question.typeName.toUpperCase(), (error: Error, records: (Array<any> | string)) => {
        if (typeof records === 'string') {
          const stringRecords: string = records

          records = [stringRecords]
        }

        if (error) {
          // Since this is a functional promise, we don't log anything,
          // just reject with the error
          reject(error)
        } else {
          // This switch sets values required for different record types
          switch (question.typeName) {
          case 'a' || 'aaaa' || 'cname' || 'txt' || 'ns' || 'ptr':
            const stdAnswers: Array<Ifaces.standard> = []
            records.forEach((record) => {
              stdAnswers.push({
                'type': question.typeName.toUpperCase(),
                'name': question.name,
                'ttl': question.ttl || 300,
                'address': record
              })
            })
            answers = stdAnswers
            break
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
                'minttl': record.minttl,
                'type': 'SOA',
                'name': question.name,
                'ttl': question.ttl || 300
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
          default:
            reject(new Error(`Type ${question.typeName.toUpperCase()} is not registered or otherwise invalid`))
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
