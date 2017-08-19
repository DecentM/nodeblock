import { findIndex } from 'lodash'
import { handle } from './error-handler'

export const findInArr = (arr: Array<any>, name: string) => {
  return arr[findIndex(arr, {'name': name})]
}

export const racePromises = (promises: Array<Promise<any>>) => {
  return new Promise((resolve) => {
    promises.forEach((promise) => {
      promise.then(() => {
        resolve()
      })
      promise.catch()
    })
  })
}
