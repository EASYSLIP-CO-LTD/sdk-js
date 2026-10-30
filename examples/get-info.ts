// Application, branch and quota of the API key.
// Usage: node examples/get-info.ts
import { Client } from '@easyslip/sdk'
import { run } from './util.ts'

await run(async () => {
    const info = await new Client().getInfo()
    console.log('request id:', info.meta.requestId)
    return info
})
