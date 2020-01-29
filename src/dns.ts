import * as dns from 'dns'

type DnsRecord = dns.AnyRecord['type']
type AnyResolutionRecord =
  | dns.SoaRecord
  | string[]
  | dns.MxRecord[]
  | dns.NaptrRecord[]
  | dns.SrvRecord[]
  | string[][]
  | dns.AnyRecord[]

type DNSOptions = {
  servers: string[],
}

export class DNS {
  constructor (options: DNSOptions) {
    dns.setServers(options.servers)
  }

  public query = (domain: string, rrtype: DnsRecord): Promise<AnyResolutionRecord> => new Promise((resolve, reject) => {
    dns.resolve(domain, rrtype, (error, results) => {
      if (error) {
        return reject(error)
      }

      return resolve(results)
    })
  })
}
