// import {DNS} from './dns'
import {Server} from './server'

// const client = new DNS({
//   servers: [
//     '1.1.1.1',
//     '1.0.0.1',
//   ]
// })

const server = new Server({
  port: 5353,
})

server.listen().then(() => console.log('all servers listening'))

// client.query('example.com', 'A').then(console.log)
