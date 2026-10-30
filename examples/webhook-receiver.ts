// A webhook endpoint: checks the signature in WEBHOOK_SIGNATURE_HEADER against the secret in
// EASYSLIP_WEBHOOK_SECRET and answers within 5 seconds. Stop it with Ctrl+C.
// Usage: node examples/webhook-receiver.ts [port]
import { createServer } from 'node:http'
import {
    constructWebhookEvent,
    WEBHOOK_SIGNATURE_HEADER,
    WebhookSignatureError,
} from '@easyslip/sdk'

const port = Number(process.argv[2] ?? 8787)

const server = createServer(async (request, response) => {
    if (request.method !== 'POST') {
        response.writeHead(405).end('method not allowed')
        return
    }
    // Read the body as raw bytes: the signature covers the exact bytes that were sent.
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(chunk as Buffer)
    const rawBody = Buffer.concat(chunks)
    try {
        const event = constructWebhookEvent(
            rawBody,
            request.headers[WEBHOOK_SIGNATURE_HEADER.toLowerCase()] as string | undefined,
        )
        // De-duplicate on event.jobId: the same event can be delivered more than once.
        console.log(event.jobId, event.status, event.data?.rawSlip.transRef ?? '')
        response.writeHead(200).end('ok')
    } catch (error) {
        if (error instanceof WebhookSignatureError) {
            response.writeHead(400).end('invalid signature')
            return
        }
        response.writeHead(400).end('bad request')
    }
})

server.listen(port, () => {
    console.log(`listening on http://localhost:${port} for ${WEBHOOK_SIGNATURE_HEADER}`)
})
