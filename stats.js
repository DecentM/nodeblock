const {db} = require('./db')

const encounter = async (question) => {
  db('stats')
  .then((contents) => {
    // console.log(contents)
  })
}

module.exports = {
  encounter
}
