import {ApolloServer} from 'apollo-server'
import {createSchema} from './graphql/schema';
import { createContext } from 'graphql/context';

const server = new ApolloServer({
  playground: true,
  schema: createSchema(),
  context: createContext,
});

(async () => {
  const info = await server.listen()

  console.log('listening', info.url)
})()
