// Checks the signature, then parses the event. Throws WebhookSignatureError when it does not
// match.
// Usage: node examples/webhook-construct-event.ts <body file> <signature header value> [secret]
import { readFile } from 'node:fs/promises'
import { constructWebhookEvent, WebhookSignatureError } from '@easyslip/sdk'
import { arg } from './util.ts'

const usage = '<body file> <signature header value> [secret]'
const rawBody = await readFile(arg(0, usage))
const header = arg(1, usage)

try {
    const event = constructWebhookEvent(rawBody, header, process.argv[4])
    console.log(JSON.stringify(event, null, 2))
} catch (error) {
    if (!(error instanceof WebhookSignatureError)) throw error
    console.error(String(error))
    process.exitCode = 1
}
