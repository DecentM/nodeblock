import {ApolloServer} from 'apollo-server'
import {createSchema} from './schema';
import {createContext} from './context';
import {Service} from 'services/types';

export const start = async (): Promise<Service> => {
  const server = new ApolloServer({
    playground: true,
    schema: createSchema(),
    context: createContext,
  });

  const info = await server.listen()

  console.log('Apollo server listening', info.url)

  return {
    shutdown: () => server.stop()
  }
}
