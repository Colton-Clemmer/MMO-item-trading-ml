var jsonFile = require('jsonfile')
var fs = require('fs')
var _ = require('lodash')



var results = _.map(_.filter(fs.readdirSync('./'), (f) => f.indexOf('output') != -1), (f) => jsonFile.readFileSync(f).results)
// results = _.filter(results, (r) => r[2] < .15)

var buyResult = _.meanBy(results, (r) => r[0])
var sellResult = _.meanBy(results, (r) => r[1])
var unsureResult = _.meanBy(results, (r) => r[2])

// console.log(results)

console.log('Buy: ' + Math.floor(buyResult * 100) + '%')
console.log('Sell: ' + Math.floor(sellResult * 100) + '%')
console.log('Unsure: ' + Math.floor(unsureResult * 100) + '%')