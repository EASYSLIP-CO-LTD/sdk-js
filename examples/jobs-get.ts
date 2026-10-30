// Gets an async job by id.
// Usage: node examples/jobs-get.ts <job id>
import { Client } from '@easyslip/sdk'
import { arg, run } from './util.ts'

const jobId = arg(0, '<job id>')

await run(() => new Client().jobs.get(jobId))
