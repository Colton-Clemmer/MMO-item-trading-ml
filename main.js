const _ = require('lodash')
const process = require('child_process')
const jsonFile = require('jsonfile')
const fs = require('fs')

const outputFiles = _.filter(fs.readdirSync('./'), (f) => f.indexOf('output') != -1)
_.each(outputFiles, (f) => fs.unlinkSync(f))

_.times(15, () => process.spawn('node', ['spawn.js']))