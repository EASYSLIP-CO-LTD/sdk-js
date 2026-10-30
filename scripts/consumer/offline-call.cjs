// The CommonJS build: require() the installed package and make one call through a stand-in fetch.
const { EasySlip, EasySlipError, SlipNotFoundError } = require('@easyslip/sdk')

async function main() {
    const sent = []
    const client = new EasySlip({
        apiKey: 'sk_offline_check_0000',
        maxRetries: 0,
        fetch: async (url, init) => {
            sent.push({ url: String(url), auth: new Headers(init?.headers).get('authorization') })
            const body = {
                success: true,
                data: {
                    application: {
                        name: 'Example App',
                        quota: { used: 1, max: null, remaining: null },
                    },
                    branch: { name: 'Main Branch', isActive: true },
                    account: { email: 'developer@example.com', credit: 0 },
                    product: { name: 'Free' },
                },
            }
            return new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'content-type': 'application/json', 'x-request-id': 'req-offline-1' },
            })
        },
    })
    const info = await client.getInfo()
    const error = new SlipNotFoundError({
        status: 404,
        code: 'SLIP_NOT_FOUND',
        message: 'm',
        requestId: null,
        rawBody: '',
        headers: {},
    })
    const result = {
        module: 'cjs',
        url: sent[0]?.url,
        auth: sent[0]?.auth,
        name: info.application.name,
        requestId: info.meta.requestId,
        rootError: error instanceof EasySlipError,
    }
    console.log(JSON.stringify(result))
    const want = {
        url: 'https://api.easyslip.com/v2/info',
        auth: 'Bearer sk_offline_check_0000',
        name: 'Example App',
        requestId: 'req-offline-1',
        rootError: true,
    }
    for (const [key, value] of Object.entries(want)) {
        if (result[key] !== value) {
            console.error(`${key} is ${result[key]}, want ${value}`)
            process.exitCode = 1
        }
    }
}
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
