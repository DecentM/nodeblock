import {DNS} from "lib/dns"

export type Context = {
  dns: DNS
}

export const createContextCreator = () => {
  const dns = new DNS({
    servers: [
      '1.1.1.1',
      '1.0.0.1'
    ]
  })

  return () => ({
    dns,
  })
}
