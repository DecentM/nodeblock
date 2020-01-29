import {RRTypes} from 'lib/rrtypes'
import {extendType, inputObjectType, enumType, objectType, unionType, interfaceType} from "nexus";

// Enums contain their KV pairs in reverse order as well, so we filter to get
// only the textual ones
const rrTypes = Object.keys(RRTypes).filter((value) => Number.isNaN(parseInt(value, 10)))

const RRType = enumType({
  name: 'RRType',
  members: rrTypes
})

const Input = inputObjectType({
  name: 'ResolveNameQueryInput',
  definition (t) {
    t.string('domain', {
      required: true
    })

    t.field('type', {
      type: RRType,
      required: true,
    })
  }
})

export const RecordWithTtl = interfaceType({
  name: 'RecordWithTtl',
  definition (t) {
    t.string('address', {
      list: [ false ],
    })
    t.int('ttl')

    t.resolveType((source) => 'AnyARecord')
  }
})

export const AnyARecord = objectType({
  name: 'AnyARecord',
  definition (t) {
    t.implements('RecordWithTtl')

    t.field('type', {
      type: RRType,
      resolve: () => 'A',
    })
  }
})

export const AnyAaaaRecord = objectType({
  name: 'AnyAaaaRecord',
  definition(t) {
    t.implements('RecordWithTtl')

    t.field('type', {
      type: RRType,
      resolve: () => 'AAAA',
    })
  }
})

export const MxRecord = interfaceType({
  name: 'MxRecord',
  definition (t) {
    t.int('priority', {
      list: [ false ],
    })
    t.string('exchange', {
      list: [ false ],
    })

    t.resolveType((source) => 'AnyMxRecord')
  }
})

export const AnyMxRecord = objectType({
  name: 'AnyMxRecord',
  definition (t) {
    t.implements('MxRecord')

    t.field('type', {
      type: RRType,
      resolve: () => 'MX',
    })
  }
})

export const NaptrRecord = interfaceType({
  name: 'NaptrRecord',
  definition(t) {
    t.string('flags')
    t.string('service')
    t.string('regexp', {
      nullable: true,
    })
    t.string('replacement', {
      nullable: true
    })
    t.int('order')
    t.int('preference')

    t.resolveType((source) => 'AnyNaptrRecord')
  }
})

export const AnyNaptrRecord = objectType({
  name: 'AnyNaptrRecord',
  definition(t) {
    t.implements('NaptrRecord')

    t.field('type', {
      type: RRType,
      resolve: () => 'NAPTR',
    })
  }
})

export const SoaRecord = interfaceType({
  name: 'SoaRecord',
  definition (t) {
    t.string('nsname')
    t.string('hostmaster')
    t.int('serial')
    t.int('refresh')
    t.int('retry')
    t.int('expire')
    t.int('minttl')

    t.resolveType((source) => 'AnySoaRecord')
  }
})

export const AnySoaRecord = objectType({
  name: 'AnySoaRecord',
  definition(t) {
    t.implements('SoaRecord')

    t.field('type', {
      type: RRType,
      resolve: () => 'SOA',
    })
  }
})

export const SrvRecord = interfaceType({
  name: 'SrvRecord',
  definition(t) {
    t.int('priority')
    t.int('weight')
    t.int('port')
    t.string('name')

    t.resolveType((source) => 'AnySrvRecord')
  }
})

export const AnySrvRecord = objectType({
  name: 'AnySrvRecord',
  definition(t) {
    t.implements('SrvRecord')

    t.field('type', {
      type: RRType,
      resolve: () => 'SRV',
    })
  }
})

export const AnyTxtRecord = objectType({
  name: 'AnyTxtRecord',
  definition(t) {
    t.field('type', {
      type: RRType,
      resolve: () => 'TXT',
    })

    t.string('entries', {
      list: [ false ],
    })
  }
})

export const AnyNsRecord = objectType({
  name: 'AnyNsRecord',
  definition(t) {
    t.field('type', {
      type: RRType,
      resolve: () => 'NS',
    })

    t.string('value')
  }
})

export const AnyPtrRecord = objectType({
  name: 'AnyPtrRecord',
  definition(t) {
    t.field('type', {
      type: RRType,
      resolve: () => 'PTR',
    })

    t.string('value')
  }
})

export const AnyCnameRecord = objectType({
  name: 'AnyCnameRecord',
  definition(t) {
    t.field('type', {
      type: RRType,
      resolve: () => 'CNAME',
    })

    t.string('value', {
      nullable: true,
    })
  }
})

export const AnyResolutionRecord = unionType({
  name: 'AnyResolutionRecord',
  definition (t) {
    t.members(
      'AnyARecord',
      'AnyAaaaRecord',
      'AnyCnameRecord',
      'AnyMxRecord',
      'AnyNaptrRecord',
      'AnyNsRecord',
      'AnyPtrRecord',
      'AnySoaRecord',
      'AnySrvRecord',
      'AnyTxtRecord'
    )

    t.resolveType((source: any, context, info) => {
      return `Any${source.rrtype}Record` as any
    })
  }
})

export const ResolveNameQuery = extendType({
  type: 'Query',
  definition (t) {
    t.field('resolveName', {
      list: [ false ],
      type: 'AnyResolutionRecord',
      args: {
        input: Input.asArg({required: true})
      },
      resolve (root, {input}, context) {
        return context.dns.query(input.domain, RRTypes[input.type])
      }
    })
  }
})
