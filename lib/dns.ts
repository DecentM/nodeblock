import * as dns from 'dns'

import {NexusGenAllTypes} from 'services/graphql/schema/generated/nexus/types'
import {RRHex} from 'lib/rrtypes'
import { DNSCache } from './dns-cache'

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
  private cache: DNSCache

  constructor (options: DNSOptions) {
    this.cache = new DNSCache()

    dns.setServers(options.servers)
  }

  private resolveFromUpstream = async (domain: string, rrhex: RRHex): Promise<ResolveValue<'AnyResolutionRecord'>[]> => {
    let dnsResolver = null

    switch (rrhex) {
      case RRHex.A:
        dnsResolver = (hostname, callback) => dns.resolve(hostname, 'A', callback)
        break
      case RRHex.AAAA:
        dnsResolver = (hostname, callback) => dns.resolve(hostname, 'AAAA', callback)
        break
      case RRHex.CNAME:
        dnsResolver = dns.resolveCname
        break
      case RRHex.MX:
        dnsResolver = dns.resolveMx
        break
      case RRHex.NAPTR:
        dnsResolver = dns.resolveNaptr
        break
      case RRHex.NS:
        dnsResolver = dns.resolveNs
        break
      case RRHex.PTR:
        dnsResolver = dns.resolvePtr
        break
      case RRHex.SOA:
        dnsResolver = dns.resolveSoa
        break
      case RRHex.SRV:
        dnsResolver = dns.resolveSrv
        break
      case RRHex.TXT:
        dnsResolver = dns.resolveTxt
        break
    }

    if (!dnsResolver) {
      return []
    }

    const resolve = (domain: string) => new Promise((resolve, reject) => dnsResolver(domain, (error, data) => {
      if (error) {
        return reject(error)
      }

      return resolve(data)
    }))

    let results = null

    try {
      results = await resolve(domain)
    } catch (error) {
      const unhandled = handleError(error)

      if (unhandled) {
        throw error
      } else {
        return []
      }
    }

    return results
  }

  public query = async (domain: string, rrhex: RRHex): Promise<ResolveValue<'AnyResolutionRecord'>[]> => {
    const exists = await this.cache.get(domain, rrhex)

    if (exists) {
      try {
        return this.transformResults(JSON.parse(exists), rrhex)
      } catch (error) {
        await this.cache.remove(domain, rrhex)
      }
    }

    const fromRemote = await this.resolveFromUpstream(domain, rrhex)

    await this.cache.set(domain, rrhex, JSON.stringify(fromRemote))

    return this.transformResults(fromRemote, rrhex)
  }

  private transformResults = (results, rrhex: RRHex) => {
    if (!Array.isArray(results)) {
      results = [ results ]
    }

    return results.map((rawResult) => {
      const result = Array.isArray(rawResult) ? rawResult : [rawResult]

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
    })
  }
}
