import * as dgram from 'dgram'
import * as ndns from 'native-dns-packet'

import {DNS, ResolveValue} from 'lib/dns'
import { RRHex } from 'lib/rrtypes'
import { NexusGenAllTypes } from 'services/graphql/schema/generated/nexus/types'
// import {RRTypes} from 'lib/rrtypes'

const createUdp4Server = (callback: (msg: Buffer, rinfo: dgram.RemoteInfo) => void) => dgram.createSocket({
  type: 'udp4',
  reuseAddr: true,
  ipv6Only: false,
}, callback)

const createUdp6Server = (callback: (msg: Buffer, rinfo: dgram.RemoteInfo) => void) => dgram.createSocket({
  type: 'udp6',
  reuseAddr: true,
  ipv6Only: true,
}, callback)

type ServerOptions = {
  port: number
}

export class Server {
  private udp4Server: dgram.Socket
  private udp6Server: dgram.Socket
  private dns: DNS

  constructor(private options: ServerOptions) {
    this.udp4Server = createUdp4Server((buffer, rinfo) => this.handleUdpData(this.udp4Server, buffer, rinfo))
    this.udp6Server = createUdp6Server((buffer, rinfo) => this.handleUdpData(this.udp6Server, buffer, rinfo))

    this.dns = new DNS({
      servers: [
        '1.1.1.1',
        '1.0.0.1'
      ]
    })
  }

  private resolve = (question: {name: string, type: RRHex}) => {
    return this.dns.query(question.name, question.type)
  }

  private handleUdpData = async (socket: dgram.Socket, buffer: Buffer, rinfo: dgram.RemoteInfo) => {
    const packet = ndns.parse(buffer)

    await Promise.all(packet.question.map(async (question) => {
      const results = await this.resolve(question)

      results
      .filter((result) => result.rrhex === RRHex.A)
      .forEach((result: ResolveValue<'AnyARecord'>) => {
        result.address.forEach((ipAddress) => {
          packet.answer.push({
            address: ipAddress,
            name: question.name,
            type: question.type,
            class: question.class,
            ttl: 3600
          })
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.AAAA)
      .forEach((result: ResolveValue<'AnyAaaaRecord'>) => {
        result.address.forEach((ipAddress) => {
          packet.answer.push({
            address: ipAddress,
            name: question.name,
            type: question.type,
            class: question.class,
            ttl: 3600
          })
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.CNAME)
      .forEach((result: ResolveValue<'AnyCnameRecord'>) => {
        packet.answer.push({
          data: result.value,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.MX)
      .forEach((result: ResolveValue<'AnyMxRecord'>) => {
        result.exchange.forEach((exchange, index) => {
          packet.answer.push({
            exchange: exchange,
            priority: result.priority[index],
            name: question.name,
            type: question.type,
            class: question.class,
            ttl: 3600
          })
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.NAPTR)
      .forEach((result: ResolveValue<'AnyNaptrRecord'>) => {
        const {rrhex, ...rest} = result

        packet.answer.push({
          ...rest,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.NS)
      .forEach((result: ResolveValue<'AnyNsRecord'>) => {
        packet.answer.push({
          data: result.value,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.PTR)
      .forEach((result: ResolveValue<'AnyPtrRecord'>) => {
        packet.answer.push({
          data: result.value,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.SOA)
      .forEach((result: ResolveValue<'AnySoaRecord'>) => {
        const {rrhex, ...rest} = result

        packet.answer.push({
          ...rest,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.SRV)
      .forEach((result: ResolveValue<'AnySrvRecord'>) => {
        const {rrhex, ...rest} = result

        packet.answer.push({
          ...rest,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })

      results
      .filter((result) => result.rrhex === RRHex.TXT)
      .forEach((result: ResolveValue<'AnyTxtRecord'>) => {
        packet.answer.push({
          data: result.entries,
          name: question.name,
          type: question.type,
          class: question.class,
          ttl: 3600
        })
      })
    }))

    // TODO: Dynamically determine response bytelength
    const response = Buffer.alloc(512)

    ndns.write(response, packet)
    socket.send(response, rinfo.port, rinfo.address)
  }

  public listen = async () => {
    await new Promise((resolve) => this.udp4Server.bind(this.options.port, resolve))
    await new Promise((resolve) => this.udp6Server.bind(this.options.port, resolve))
  }

  public stop = async () => {
    await new Promise((resolve) => this.udp4Server.close(resolve))
    await new Promise((resolve) => this.udp6Server.close(resolve))
  }
}
