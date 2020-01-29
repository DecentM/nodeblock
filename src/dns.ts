import * as dns from 'dns'

import {NexusGenAllTypes} from 'graphql/schema/generated/nexus/types'
import { RRTypes } from 'lib/rrtypes'

type DNSOptions = {
  servers: string[],
}

type ResolveValue<NexusType extends keyof NexusGenAllTypes> = NexusGenAllTypes[NexusType] & {
  rrtype: RRTypes
}

const handleError = (error: NodeJS.ErrnoException) => {
  switch (error.code) {
    case 'ENODATA':
      return null
  }

  return error
}

export class DNS {
  constructor (options: DNSOptions) {
    dns.setServers(options.servers)
  }

  public query = (domain: string, rrtype: RRTypes): Promise<ResolveValue<'AnyResolutionRecord'>[]> => new Promise((resolve, reject) => {
    let resolver = null

    switch (rrtype) {
      case RRTypes.A:
        resolver = (hostname, callback) => dns.resolve(hostname, 'A', callback)
        break
      case RRTypes.AAAA:
        resolver = (hostname, callback) => dns.resolve(hostname, 'AAAA', callback)
        break
      case RRTypes.CNAME:
        resolver = dns.resolveCname
        break
      case RRTypes.MX:
        resolver = dns.resolveMx
        break
      case RRTypes.NAPTR:
        resolver = dns.resolveNaptr
        break
      case RRTypes.NS:
        resolver = dns.resolveNs
        break
      case RRTypes.PTR:
        resolver = dns.resolvePtr
        break
      case RRTypes.SOA:
        resolver = dns.resolveSoa
        break
      case RRTypes.SRV:
        resolver = dns.resolveSrv
        break
      case RRTypes.TXT:
        resolver = dns.resolveTxt
        break
    }

    if (!resolver) {
      return reject(new Error('No resolver found for this type. This is a developer error, please report it along with the query you just ran.'))
    }

    resolver(domain, (error, rawResults = []) => {
      if (error) {
        const unhandled = handleError(error)

        if (unhandled) {
          return reject(error)
        } else {
          return resolve([])
        }
      }

      let results = rawResults

      if (!Array.isArray(results)) {
        results = [ results ]
      }

      return resolve(results.map((rawResult) => {
        const result = Array.isArray(rawResult) ? rawResult : [ rawResult ]

        switch (rrtype) {
          case RRTypes.A:
            const a: ResolveValue<'AnyARecord'> = {
              rrtype,
              address: result,
              ttl: 3600,
            }

            return a
          case RRTypes.AAAA:
            const aaaa: ResolveValue<'AnyAaaaRecord'> = {
              rrtype,
              address: result,
              ttl: 3600,
            }

            return aaaa
          case RRTypes.CNAME:
            const cname: ResolveValue<'AnyCnameRecord'> = {
              rrtype,
              value: rawResult,
            }

            return cname
          case RRTypes.MX:
            const mx: ResolveValue<'AnyMxRecord'> = {
              rrtype,
              exchange: result.map((item) => item.exchange),
              priority: result.map((item) => item.priority),
            }

            return mx
          case RRTypes.NAPTR:
            const naptr: ResolveValue<'AnyNaptrRecord'> = {
              rrtype,
              ...rawResult,
            }

            return naptr
          case RRTypes.SOA:
            const soa: ResolveValue<'AnySoaRecord'> = {
              rrtype,
              ...rawResult,
            }

            return soa
          case RRTypes.NS:
            const ns: ResolveValue<'AnyNsRecord'> = {
              rrtype,
              value: rawResult,
            }

            return ns
          case RRTypes.PTR:
            const ptr: ResolveValue<'AnyPtrRecord'> = {
              rrtype,
              value: rawResult,
            }

            return ptr
          case RRTypes.SRV:
            const srv: ResolveValue<'AnySrvRecord'> = {
              rrtype,
              ...rawResult
            }

            return srv
          case RRTypes.TXT:
            const txt: ResolveValue<'AnyTxtRecord'> = {
              rrtype,
              entries: rawResult
            }

            return txt
          default:
            return {
              rrtype,
            }
        }
      }))

    })
  })
}
