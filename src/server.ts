import * as dgram from 'dgram'
import * as net from 'net'
import * as ndns from 'native-dns-packet'

const createTcpServer = (onData: (buffer: Buffer, socket: net.Socket) => void) => net.createServer((socket) => {
  socket.on('data', (data) => onData(data, socket))
})

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
  private tcpServer: net.Server
  private udp4Server: dgram.Socket
  private udp6Server: dgram.Socket

  constructor (private options: ServerOptions) {
    this.tcpServer = createTcpServer(this.handleTcpData)
    this.udp4Server = createUdp4Server(this.handleUdpData)
    this.udp6Server = createUdp6Server(this.handleUdpData)
  }

  private parsePacket = (buffer: Buffer) => {
    try {
      return ndns.parse(buffer)
    } catch (error) {
      console.error(error)
    }
  }

  private handleUdpData = (buffer: Buffer, rinfo: dgram.RemoteInfo) => {
    console.log(buffer.toString())
    console.log(this.parsePacket(buffer))
  }

  private handleTcpData = (buffer: Buffer, socket: net.Socket) => {
    console.log(buffer.toString())
    console.log(this.parsePacket(buffer))

    socket.write('HTTP/1.1 200 OK\r\n\r\nHello')
    socket.end()
  }

  listen = async () => {
    await new Promise((resolve) => this.udp4Server.bind(this.options.port, resolve))
    await new Promise((resolve) => this.udp6Server.bind(this.options.port, resolve))
    await new Promise((resolve) => this.tcpServer.listen(this.options.port, resolve))
  }
}
