const sdk = require('@easyslip/sdk')
const checks = require('./checks.cjs')

checks(sdk).then(() => console.log(`require ok on ${process.version}`))
