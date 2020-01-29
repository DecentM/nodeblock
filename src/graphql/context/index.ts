import {DNS} from "../../dns"

export type Context = {
  dns: DNS
}

export const createContext = () => ({
  dns: new DNS({
    servers: [
      '1.1.1.1',
      '1.0.0.1'
    ]
  })
})
