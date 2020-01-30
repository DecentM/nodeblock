import * as dns from 'dns'

import {NexusGenAllTypes} from 'services/graphql/schema/generated/nexus/types'
import {RRHex} from 'lib/rrtypes'

type DNSOptions = {
  servers: string[],
}

export type ResolveValue<NexusType extends keyof NexusGenAllTypes> = NexusGenAllTypes[NexusType] & {
  rrhex: RRHex
}

const handleError = (error: NodeJS.ErrnoException) => {
  switch (error.code) {
    case 'ENODATA':
      return null
    case 'ENOTFOUND':
      return null
  }

  return error
}

export class DNS {
  constructor (options: DNSOptions) {
    dns.setServers(options.servers)
  }

  public query = (domain: string, rrhex: RRHex): Promise<ResolveValue<'AnyResolutionRecord'>[]> => new Promise((resolve, reject) => {
    let resolver = null

    switch (rrhex) {
      case RRHex.A:
        resolver = (hostname, callback) => dns.resolve(hostname, 'A', callback)
        break
      case RRHex.AAAA:
        resolver = (hostname, callback) => dns.resolve(hostname, 'AAAA', callback)
        break
      case RRHex.CNAME:
        resolver = dns.resolveCname
        break
      case RRHex.MX:
        resolver = dns.resolveMx
        break
      case RRHex.NAPTR:
        resolver = dns.resolveNaptr
        break
      case RRHex.NS:
        resolver = dns.resolveNs
        break
      case RRHex.PTR:
        resolver = dns.resolvePtr
        break
      case RRHex.SOA:
        resolver = dns.resolveSoa
        break
      case RRHex.SRV:
        resolver = dns.resolveSrv
        break
      case RRHex.TXT:
        resolver = dns.resolveTxt
        break
      default:
        console.log({rrhex})
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

        switch (rrhex) {
          case RRHex.A:
            const a: ResolveValue<'AnyARecord'> = {
              rrhex,
              address: result,
              ttl: 3600,
            }

            return a
          case RRHex.AAAA:
            const aaaa: ResolveValue<'AnyAaaaRecord'> = {
              rrhex,
              address: result,
              ttl: 3600,
            }

            return aaaa
          case RRHex.CNAME:
            const cname: ResolveValue<'AnyCnameRecord'> = {
              rrhex,
              value: rawResult,
            }

            return cname
          case RRHex.MX:
            const mx: ResolveValue<'AnyMxRecord'> = {
              rrhex,
              exchange: result.map((item) => item.exchange),
              priority: result.map((item) => item.priority),
            }

            return mx
          case RRHex.NAPTR:
            const naptr: ResolveValue<'AnyNaptrRecord'> = {
              rrhex,
              ...rawResult,
            }

            return naptr
          case RRHex.SOA:
            const soa: ResolveValue<'AnySoaRecord'> = {
              rrhex,
              ...rawResult,
            }

            return soa
          case RRHex.NS:
            const ns: ResolveValue<'AnyNsRecord'> = {
              rrhex,
              value: rawResult,
            }

            return ns
          case RRHex.PTR:
            const ptr: ResolveValue<'AnyPtrRecord'> = {
              rrhex,
              value: rawResult,
            }

            return ptr
          case RRHex.SRV:
            const srv: ResolveValue<'AnySrvRecord'> = {
              rrhex,
              ...rawResult
            }

            return srv
          case RRHex.TXT:
            const txt: ResolveValue<'AnyTxtRecord'> = {
              rrhex,
              entries: rawResult
            }

            return txt
          default:
            return {
              rrhex,
            }
        }
      }))

    })
  })
}
