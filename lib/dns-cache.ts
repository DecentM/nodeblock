import * as Redis from 'ioredis'
import { RRHex } from './rrtypes'
import {config} from './config'

export type DNSCacheOptions = {
  port?: number,
  host?: string,
  family?: 4 | 6,
  password?: string,
  db?: number,
}

export class DNSCache {
  private redis: Redis.Redis

  constructor () {
    this.redis = new Redis(config.redis)

    this.redis.on('error', (error) => {
      console.warn('cache error, disconnecting', error.message)

      this.redis.disconnect()
    })
  }

  private hash (domain: string, rrhex: RRHex) {
    return `${domain}#${rrhex}`
  }

  public set (domain: string, rrhex: RRHex, value) {
    return this.redis.set(this.hash(domain, rrhex), value)
  }

  public get (domain: string, rrhex: RRHex) {
    return this.redis.get(this.hash(domain, rrhex))
  }

  public remove (domain: string, rrhex: RRHex) {
    return this.redis.del(this.hash(domain, rrhex))
  }
}
