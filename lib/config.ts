import { DNSCacheOptions } from "./dns-cache"

type Config = {
  redis: DNSCacheOptions
}

export const config: Config = {
  redis: {
    db: parseInt(process.env.REDIS_DB_INDEX, 10),
    family: parseInt(process.env.REDIS_IP_FAMILY, 10) as 4 | 6,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: parseInt(process.env.REDIS_PORT, 10),
  }
}
