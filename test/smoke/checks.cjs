// Runs the installed package against a local mock of the API, on the runtime customers use.
// smoke.cjs and smoke.mjs hand over the SDK they loaded with require and import.
const assert = require('node:assert/strict')
const { createHmac } = require('node:crypto')
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs')
const { createServer } = require('node:http')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { Readable } = require('node:stream')

const KEY = 'sk_test_smoke'
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 1, 2, 3])
const SLIP = {
    amountInSlip: 100,
    rawSlip: {
        payload: 'P',
        transRef: 'T',
        date: '2026-10-29T10:00:00+07:00',
        countryCode: 'TH',
        amount: { amount: 100, local: { amount: 0, currency: '' } },
        sender: { account: { name: { th: 'ก' } } },
        receiver: { account: { name: { th: 'ข' } } },
    },
}
const BANKS = [
    {
        code: '004',
        nameTh: 'กสิกรไทย',
        nameEn: 'Kasikornbank',
        shortCode: 'KBANK',
        swiftCode: 'KASITHBK',
        extraVerify: null,
    },
]

function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'content-type': 'application/json', 'cf-ray': 'ray-1', ...headers })
    res.end(JSON.stringify(body))
}

function startMock() {
    const seen = []
    let bankCalls = 0
    const server = createServer((req, res) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => {
            const body = Buffer.concat(chunks)
            seen.push({ method: req.method, url: req.url, headers: req.headers, body })
            if (req.headers.authorization !== `Bearer ${KEY}`) {
                send(res, 401, {
                    success: false,
                    error: { code: 'INVALID_API_KEY', message: 'no' },
                })
            } else if (req.url === '/v2/banks') {
                // The first call fails, so the client has to retry over the real network.
                bankCalls += 1
                if (bankCalls === 1) {
                    send(
                        res,
                        503,
                        { success: false, error: { code: 'BUSY', message: 'busy' } },
                        { 'retry-after': '0' },
                    )
                } else send(res, 200, { success: true, data: BANKS })
            } else if (body.includes('hang')) {
                // Never answers: the timeout check aborts the request.
            } else if (body.includes('missing')) {
                send(res, 404, {
                    success: false,
                    error: { code: 'SLIP_NOT_FOUND', message: 'not found' },
                })
            } else send(res, 200, { success: true, data: SLIP })
        })
    })
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve({ server, seen, port: server.address().port }))
    })
}

function expectRuntime(userAgent) {
    const { EXPECT_RUNTIME: runtime, EXPECT_MAJOR: major } = process.env
    if (runtime === 'node') {
        assert.equal(process.versions.bun, undefined, 'this run must be on Node.js, not Bun')
        if (major) assert.equal(process.versions.node.split('.')[0], major)
        assert.ok(userAgent.includes(`node/${process.versions.node}`), userAgent)
    } else {
        assert.equal(runtime, 'bun')
        assert.ok(process.versions.bun, 'this run must be on Bun')
        assert.ok(userAgent.includes(`bun/${process.versions.bun}`), userAgent)
    }
}

module.exports = async function checks(sdk) {
    assert.equal(Object.keys(sdk).filter((name) => name !== 'default').length, 39)
    const { server, seen, port } = await startMock()
    const work = mkdtempSync(join(tmpdir(), 'easyslip-smoke-'))
    const client = new sdk.EasySlip({
        apiKey: KEY,
        v1BaseUrl: `http://127.0.0.1:${port}/v1`,
        v2BaseUrl: `http://127.0.0.1:${port}/v2`,
    })
    try {
        expectRuntime(client.userAgent)

        // JSON request and decoded result.
        const byPayload = await client.verify.bankByPayload('payload-1', { matchAmount: 100 })
        assert.equal(byPayload.amountInSlip, 100)
        assert.equal(byPayload.rawSlip.transRef, 'T')
        const sent = seen.at(-1)
        assert.equal(sent.method, 'POST')
        assert.equal(sent.url, '/v2/verify/bank')
        assert.equal(sent.headers['user-agent'], client.userAgent)
        assert.deepEqual(JSON.parse(sent.body), { payload: 'payload-1', matchAmount: 100 })

        // Multipart upload from every input kind; a path goes through the lazy file system import.
        const path = join(work, 'slip.jpg')
        writeFileSync(path, JPEG)
        const images = [
            JPEG,
            path,
            new Blob([JPEG], { type: 'image/jpeg' }),
            Readable.from([JPEG]),
            new Blob([JPEG]).stream(),
        ]
        for (const image of images) {
            const result = await client.verify.bankByImage(image)
            assert.equal(result.amountInSlip, 100)
            const form = seen.at(-1)
            assert.match(form.headers['content-type'], /^multipart\/form-data; boundary=/)
            assert.ok(form.body.includes(JPEG), 'the image bytes reach the API unchanged')
        }

        // API errors map to their classes.
        await assert.rejects(client.verify.bankByPayload('missing'), (error) => {
            assert.ok(error instanceof sdk.SlipNotFoundError)
            assert.ok(error instanceof sdk.ApiError)
            assert.equal(error.name, 'SlipNotFoundError')
            assert.equal(error.status, 404)
            assert.equal(error.code, 'SLIP_NOT_FOUND')
            assert.equal(error.requestId, 'ray-1')
            return true
        })
        const stranger = new sdk.EasySlip({ apiKey: 'wrong', v2BaseUrl: client.v2BaseUrl })
        await assert.rejects(stranger.verify.bankByPayload('x'), sdk.AuthenticationError)

        // A safe call retries a 503 and then succeeds.
        const before = seen.length
        const banks = await client.banks.list()
        assert.equal(banks.items[0].shortCode, 'KBANK')
        assert.equal(seen.length - before, 2)

        // Network failures.
        const slow = new sdk.EasySlip({
            apiKey: KEY,
            v2BaseUrl: client.v2BaseUrl,
            timeout: 100,
            maxRetries: 0,
        })
        await assert.rejects(slow.verify.bankByPayload('hang'), sdk.RequestTimeoutError)
        const closed = createServer()
        const closedPort = await new Promise((resolve) => {
            closed.listen(0, '127.0.0.1', () => {
                const { port: free } = closed.address()
                closed.close(() => resolve(free))
            })
        })
        const offline = new sdk.EasySlip({
            apiKey: KEY,
            v2BaseUrl: `http://127.0.0.1:${closedPort}/v2`,
            maxRetries: 0,
        })
        await assert.rejects(offline.banks.list(), sdk.NetworkError)

        // Local input errors and webhook signatures need no network.
        await assert.rejects(client.verify.bankByImage(join(work, 'nope.jpg')), sdk.InputError)
        const event = JSON.stringify({ jobId: 'j1', status: 'success', timestamp: 't' })
        const signature = `sha256=${createHmac('sha256', 'secret').update(event).digest('hex')}`
        assert.equal(sdk.verifyWebhookSignature(event, signature, 'secret'), true)
        assert.equal(sdk.verifyWebhookSignature(`${event} `, signature, 'secret'), false)
        assert.equal(sdk.constructWebhookEvent(event, signature, 'secret').jobId, 'j1')
        assert.throws(
            () => sdk.constructWebhookEvent(event, 'sha256=00', 'secret'),
            sdk.WebhookSignatureError,
        )
    } finally {
        server.closeAllConnections?.()
        server.close()
        rmSync(work, { recursive: true, force: true })
    }
}
