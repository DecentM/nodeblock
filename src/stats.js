// @flow
import {db} from './db'
// import log from 'chalk-console'
import moment from 'moment'

type RawStatsData = {
  name: string,
  type: string,
  data: string,
  client: string
}

type SingleStatsEntry = {
  type: string,
  name: string,
  address: string
}

type StatsEntry = {
  time: number,
  client: string,
  source: 'local' | 'online',
  record: SingleStatsEntry
}

type Source = 'local' | 'online'

const constructStatsEntry = (data: RawStatsData, source: Source) => {
  const statsEntry: StatsEntry = {
    'time':   moment.now(),
    'client': data.client,
    'record': {
      'type':    data.type,
      'name':    data.name,
      'address': data.data
    },
    source
  }

  return statsEntry
}

const storeEvent = async (evType: string, rawData: Array<RawStatsData>) => {
  const statsCollection = await db('stats')

  switch (evType) {
  case 'query:local':
    // statsCollection.insert(data)
    break
  case 'query:remote':
    rawData.forEach((rawRecord) => {
      const statsEntry: StatsEntry = constructStatsEntry(rawRecord, 'online')

      statsCollection.insert(statsEntry)
    })
    break
  default:
    break
  }
}

module.exports = {
  storeEvent
}
