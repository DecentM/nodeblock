import * as path from 'path'
import * as resolveNameTypes from './queries/resolve-name'

import {makeSchema} from "nexus";

export const createSchema = () => makeSchema({
  types: [
    resolveNameTypes
  ],
  outputs: {
    schema: path.join(__dirname, 'generated/nexus/schema.graphql'),
    typegen: path.join(__dirname, 'generated/nexus/types.ts'),
  },
  typegenAutoConfig: {
    contextType: 'Context.Context',
    sources: [
      {
        source: require.resolve('../context'),
        alias: 'Context'
      }
    ]
  }
})
