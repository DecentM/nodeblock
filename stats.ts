import { getDb } from './db'

interface statsEncounter {
  time: number,
  client: string
}

interface statsItem {
  domain: string,
  type: string,
  firstEncounter: number,
  lastEncounter: number,
  encounters: Array<statsEncounter>
}

export const encounter = (question) => {
  return new Promise((resolve, reject) => {
    getDb('stats')
    .then((contents) => {
      // console.log(contents)
    })
  })
}
