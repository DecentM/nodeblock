export interface record extends Object {
  'type':    string,
  'name':    string,
  'ttl':     number
}
export interface naptrEntry extends Object {
  'flags': string,
  'service': string,
  'regexp'?: string,
  'replacement': string,
  'order': number,
  'preference': number
}

export interface standard extends record {
  'address': Array<string>
}

export interface MX extends standard {
  'exchange': string,
  'priority': number
}
export interface NAPTR extends record {
  'data': naptrEntry,
  'address': naptrEntry
}
export interface SOA extends record {
  'nsname': string,
  'hostmaster': string,
  'serial': number,
  'refresh': number,
  'retry': number,
  'expire': number,
  'minttl': number
}
export interface SRV extends record {
  'priority': number,
  'weight': number,
  'port': number
}

export interface InternalAnswer extends record {
  'flags'?: string,
  'service'?: string,
  'regexp'?: string,
  'replacement'?: string,
  'order'?: number,
  'preference'?: number,
  'address'?: any,
  'exchange'?: string,
  'priority'?: number,
  'data'?: naptrEntry,
  'nsname'?: string,
  'hostmaster'?: string,
  'serial'?: number,
  'refresh'?: number,
  'retry'?: number,
  'expire'?: number,
  'minttl'?: number,
  'weight'?: number,
  'port'?: number,
  'source': 'database' | 'online'
}

export interface IdbQuery extends Object {
  'name': string,
  'type': string
}

export interface IfinalReply extends Array<InternalAnswer> {
  'source'?: 'database' | 'online'
}
