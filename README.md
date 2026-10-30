# EasySlip SDK for JavaScript and TypeScript

[![CI](https://github.com/EASYSLIP-CO-LTD/sdk-js/actions/workflows/ci.yml/badge.svg)](https://github.com/EASYSLIP-CO-LTD/sdk-js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The official JavaScript and TypeScript library for the [EasySlip API](https://document.easyslip.com). Use it to verify Thai bank transfer slips and TrueMoney Wallet slips from Node.js, Bun, Deno and other JavaScript runtimes.

[อ่านภาษาไทย](README.th.md)

## Features

- Verify bank slips from the QR code text, an image file, an image URL or a base64 string, and TrueMoney Wallet slips from an image, a URL or base64.
- Check for duplicate slips, compare the receiver with your registered accounts and compare the amount, all in the same request.
- Send slips as background jobs, up to 100 per batch, and receive the results on your webhook.
- Manage your receiving bank accounts and read your quota, branch and account details.
- Keep using API v1 for existing integrations, including free PromptPay, bill payment, K SHOP, Mae Manee and Tung Ngern QR codes.
- Check webhook signatures in constant time.
- Get a typed error class for every API error code. Automatic retries never send a billed request twice, and API keys never appear in error messages.
- Install no runtime dependencies. The package ships ESM and CommonJS builds with type definitions.

## Requirements

- **Node.js 22, 24 or 26.** Node.js 22 is the minimum (`"engines": { "node": ">=22" }`). CI runs the full test suite on all three.
- **Bun and Deno** also work. CI installs the package on Bun 1.4 and Deno 2.9 and makes a call with it.
- **Edge runtimes** such as Cloudflare Workers work too, because the SDK only needs the standard `fetch`. They have no file system, so pass `apiKey` in code instead of `EASYSLIP_API_KEY_FILE`.
- **TypeScript 5 or newer**, if you use TypeScript. The published types are checked with TypeScript 5.9 and 7.0.
- **An EasySlip API key.** Create one in the [EasySlip developer portal](https://developer.easyslip.com).

## Installation

```sh
npm install @easyslip/sdk
```

The package is also available with `pnpm add @easyslip/sdk`, `yarn add @easyslip/sdk` and `bun add @easyslip/sdk`. On Deno, import it from `npm:@easyslip/sdk`.

## Quick start

Put your API key in the environment, then create a client. The client reads `EASYSLIP_API_KEY` on its own.

```sh
export EASYSLIP_API_KEY="your-api-key"
```

```ts
import { EasySlip } from '@easyslip/sdk'

const easyslip = new EasySlip()

const slip = await easyslip.verify.bankByPayload('<text from the QR code on the slip>', {
    checkDuplicate: true,
})

console.log(slip.rawSlip.transRef, slip.rawSlip.amount.amount, slip.isDuplicate)
```

`EasySlip` and `Client` are the same class, so `new Client()` works as well. Each verification counts against your quota.

### Verify a bank slip

There is one method for each way you can receive a slip. All four return the same result.

```ts
// The text in the slip's QR code, for example from a QR scanner
await easyslip.verify.bankByPayload(payload)

// An image file: a path, bytes, a Blob or File, or a stream
await easyslip.verify.bankByImage('./slip.jpg')

// A public https URL of the slip image
await easyslip.verify.bankByUrl('https://example.com/slip.jpg')

// The image as a base64 string, with or without a data: prefix
await easyslip.verify.bankByBase64(base64Image)
```

`bankByImage` accepts a file path or `file:` URL, a `Uint8Array`, `Buffer` or `ArrayBuffer`, a `Blob` or `File` (for example from `request.formData()`), a web `ReadableStream`, or a Node.js readable stream. The SDK detects the file type from its content and accepts JPEG, PNG, GIF and WebP images up to 4 MB. A string is always treated as a file path, so never pass text you received from a user as the image.

Every verification method takes these options. An option you leave out is not sent, and its result field is missing from the response (not `null`).

| Option | What it does | Default |
| --- | --- | --- |
| `checkDuplicate` | Checks whether this branch verified the slip before and adds `isDuplicate` to the result. | Not checked |
| `matchAccount` | Compares the receiver with your registered bank accounts and adds `matchedAccount` (the matching account, or `null`). | Not compared |
| `matchAmount` | Compares the slip amount with the amount you expect, in baht, and adds `amountInOrder` and `isAmountMatched`. | Not compared |
| `remark` | Stores your own note of 1 to 255 characters with the verification and returns it as `remark`. | None |

```ts
const result = await easyslip.verify.bankByImage('./slip.jpg', {
    checkDuplicate: true,
    matchAccount: true,
    matchAmount: 1500,
    remark: 'Invoice 1001',
})

if (result.isDuplicate || !result.isAmountMatched || result.matchedAccount === null) {
    console.log('Do not accept this payment yet')
}
console.log(result.rawSlip.sender.account.name.th, result.rawSlip.receiver.account.bank?.account)
```

### Verify a TrueMoney Wallet slip

These methods take the same options as bank slips.

```ts
const wallet = await easyslip.verify.truewalletByImage('./wallet-slip.png')
await easyslip.verify.truewalletByUrl('https://example.com/wallet-slip.png')
await easyslip.verify.truewalletByBase64(base64Image)

console.log(wallet.rawSlip.transactionId, wallet.rawSlip.amount, wallet.rawSlip.receiver.phone)
```

### Check your quota and the supported banks

```ts
const info = await easyslip.getInfo()
console.log(info.application.name, info.application.quota.remaining, info.branch.name)

const banks = await easyslip.banks.list()
for (const bank of banks) console.log(bank.code, bank.nameTh)
```

`quota.max` and `quota.remaining` are `null` when your quota is unlimited.

### Generate a payment QR code

QR codes come from API v1 and use no quota. `imageBytes()` returns the PNG image.

```ts
import { writeFile } from 'node:fs/promises'

const qr = await easyslip.v1.generateQr({ type: 'PROMPTPAY', msisdn: '0812345678', amount: 100 })
await writeFile('qr.png', qr.imageBytes())
console.log(qr.payload)
```

| `type` | Required fields | Optional fields |
| --- | --- | --- |
| `PROMPTPAY` | Exactly one of `msisdn` (phone number), `natId` (national ID or tax ID), `eWalletId` or `billerId` | `amount`; `ref1` and `ref2` with `billerId` |
| `BILL_PAYMENT` | `billerId` | `amount`, `ref1`, `ref2` |
| `KSHOP` | `ref1`: the shop ID, `KB` and 12 digits | `amount` |
| `MAE_MANEE` | `ref1`: the 15 digit shop ID | `amount` |
| `TUNGNGERN` | `ref1`: the merchant code, and `merchantName`: the English shop name | `amount` |

Leave out `amount` to let the payer enter it.

### Use API v1

If your integration already uses API v1, call it through `easyslip.v1`. The v1 methods return the slip itself.

```ts
const me = await easyslip.v1.getMe()
console.log(me.usedQuota, me.remainingQuota, me.currentCredit)

const slip = await easyslip.v1.verifyBankByPayload(payload, { checkDuplicate: true })
await easyslip.v1.verifyBankByImage('./slip.jpg')
await easyslip.v1.verifyBankByUrl('https://example.com/slip.jpg')
await easyslip.v1.verifyBankByBase64(base64Image)
await easyslip.v1.verifyTruemoneyByImage('./wallet-slip.png')
console.log(slip.transRef)
```

With `checkDuplicate: true`, a slip that was verified before throws `DuplicateSlipError`, and `error.slip` holds the original slip. API v1 does not charge for a duplicate.

### Verify slips in the background

A job verifies the slip on the EasySlip side and posts the result to your webhook. Pass an https `callbackUrl`, unless your branch already has a default webhook URL.

```ts
const callbackUrl = 'https://example.com/webhooks/slip'

const { jobId } = await easyslip.jobs.submitBank(payload, { callbackUrl, checkDuplicate: true })

const job = await easyslip.jobs.waitForJob(jobId)
if (job.status === 'done' && job.result?.status === 'success') {
    console.log(job.result.data?.rawSlip.transRef)
}
```

| Method | What it does |
| --- | --- |
| `jobs.submitBank(payload, options)` | Submits one slip. Takes the verification options and `callbackUrl`. |
| `jobs.submitBankBatch(slips, { callbackUrl })` | Submits 1 to 100 slips in one request. Each slip can have its own options. |
| `jobs.submitBankMany(slips, { callbackUrl })` | Splits any number of slips into batches of 100 and submits them one after another. |
| `jobs.get(jobId)` | Returns the job and, once it has finished, its result. |
| `jobs.waitForJob(jobId, options)` | Polls `jobs.get` until the job is `done` or `failed`. A failed job is returned, not thrown. |

`waitForJob` takes `interval`, the time between polls in milliseconds (default 2000, minimum 500), `timeout`, the longest it waits in milliseconds (default 600000, which is 10 minutes), and `signal`, an `AbortSignal` that stops the wait.

### Manage receiving bank accounts

`matchAccount` compares the slip receiver with these accounts. Accounts belong to your service and are linked to branches.

```ts
const account = await easyslip.bankAccounts.create({
    bankCode: '004',
    bankNumber: '1234567890',
    nameTh: 'บริษัท ตัวอย่าง จำกัด',
    nameEn: 'EXAMPLE CO., LTD.',
    type: 'JURISTIC',
})

for await (const item of easyslip.bankAccounts.iterate()) {
    console.log(item.id, item.bankNumber)
}
```

| Method | What it does |
| --- | --- |
| `bankAccounts.create(params)` | Adds an account to the service and links it to this branch. |
| `bankAccounts.list(params)` | Lists one page of the accounts linked to this branch. `page` starts at 1 and `limit` is 1 to 100 (default 20). |
| `bankAccounts.listAll(params)` | Lists one page of every account in the service, with the same paging. |
| `bankAccounts.iterate(params)` | Goes through every account linked to this branch, fetching 100 per page for you. |
| `bankAccounts.iterateAll(params)` | Goes through every account in the service, 100 per page. |
| `bankAccounts.get(id)` | Returns one account. |
| `bankAccounts.update(id, params)` | Changes the fields you pass. Pass `extraVerify: null` to clear it. |
| `bankAccounts.link(id)` | Links an account to this branch. Linking twice is not an error. |
| `bankAccounts.unlink(id)` | Unlinks an account from this branch. The account stays in the service. |

`list`, `listAll`, `iterate` and `iterateAll` can filter by `type` (`NATURAL` or `JURISTIC`) and `bankCode`. Use `banks.list()` to find bank codes; `banks.find(code)` also returns the `extraVerify` values a bank allows.

### Read response details

Every result has a `meta` property with details of the HTTP response. It is not part of the data, so it does not appear in `JSON.stringify(result)`.

| Field | What it holds |
| --- | --- |
| `meta.status` | The HTTP status code. |
| `meta.requestId` | The request ID. Include it when you contact support. |
| `meta.message` | The message the API sent with the result, or `null`. |
| `meta.rateLimit` | `{ limit, remaining, reset }` from the rate limit headers, or `null`. |
| `meta.headers` | All response headers, with lower-case names. |

## Configuration

### API key

The client looks for your API key in this order:

1. The `apiKey` option: `new EasySlip({ apiKey: 'your-api-key' })`.
2. The `EASYSLIP_API_KEY` environment variable.
3. The file named by `EASYSLIP_API_KEY_FILE`, such as a Docker or Kubernetes secret. The SDK reads it on the first request and trims surrounding whitespace.

If none of them is set, `new EasySlip()` throws `InputError` with the code `INVALID_ARGUMENT`. Keep your key on the server; never ship it to a browser.

### Client options

| Option | What it does | Default |
| --- | --- | --- |
| `apiKey` | Your API key. | `EASYSLIP_API_KEY`, then the file named by `EASYSLIP_API_KEY_FILE` |
| `timeout` | How long one attempt may take, in milliseconds. | `30000` (30 seconds) |
| `maxRetries` | How many times a failed request is retried. `0` turns retries off. | `2` |
| `fetch` | The `fetch` function used to send requests. | The runtime's global `fetch` |
| `v2BaseUrl` | The base URL of API v2. | `EASYSLIP_V2_BASE_URL`, then `https://api.easyslip.com/v2` |
| `v1BaseUrl` | The base URL of API v1. | `EASYSLIP_V1_BASE_URL`, then `https://api.easyslip.com/v1` |

### Environment variables

| Variable | What it does |
| --- | --- |
| `EASYSLIP_API_KEY` | Your API key. |
| `EASYSLIP_API_KEY_FILE` | The path of a file that contains your API key. Used when `EASYSLIP_API_KEY` is not set. |
| `EASYSLIP_WEBHOOK_SECRET` | Your branch's webhook secret, used by the webhook helpers when you do not pass one. |
| `EASYSLIP_V2_BASE_URL` | Replaces the API v2 base URL. |
| `EASYSLIP_V1_BASE_URL` | Replaces the API v1 base URL. |

### Timeouts and retries for one request

Every method also accepts `timeout`, `maxRetries` and `signal` for that call only. Verification methods take them in the same object as the verification options.

```ts
const controller = new AbortController()

await easyslip.verify.bankByPayload(payload, { checkDuplicate: true, signal: controller.signal })
await easyslip.banks.list({ timeout: 5_000, maxRetries: 0 })
```

| Option | What it does | Default |
| --- | --- | --- |
| `timeout` | How long one attempt of this call may take, in milliseconds. | The client's `timeout` |
| `maxRetries` | How many times this call is retried. | The client's `maxRetries` |
| `signal` | An `AbortSignal` that cancels the call, including any wait between retries. | None |

### Custom HTTP client

Pass your own `fetch` to add logging, send requests through a proxy agent or record requests in tests. It receives the URL and the request options and must return a `Response`.

```ts
import { EasySlip } from '@easyslip/sdk'

const easyslip = new EasySlip({
    fetch: async (url, init) => {
        const started = Date.now()
        const response = await fetch(url, init)
        console.log(init.method, url, response.status, `${Date.now() - started} ms`)
        return response
    },
})
```

## Error handling

Every error the SDK throws extends `EasySlipError`. Errors that come from an API response extend `ApiError` and carry these fields:

| Field | What it holds |
| --- | --- |
| `status` | The HTTP status code. |
| `code` | The API error code, such as `SLIP_NOT_FOUND`. See [Error codes](https://document.easyslip.com/en/reference/error-codes). |
| `message` | The error message from the API. |
| `requestId` | The request ID. Include it when you contact support. |
| `retryAfter` | Seconds to wait before trying again, when the API says so, otherwise `null`. |
| `headers` and `rawBody` | The response headers and the response body as received. |

| Error class | HTTP status | When it happens | What to do |
| --- | --- | --- | --- |
| `AuthenticationError` | 401 | The API key is missing, wrong or revoked. | Check the key you pass or `EASYSLIP_API_KEY`. Create a new key in the developer portal if needed. |
| `PermissionDeniedError` | 403 | The key is valid but the request is not allowed, for example because the branch is inactive, the service has expired or your IP address is not on the allow list. | Read `error.code`, then fix the setting in the developer portal. |
| `QuotaExceededError` | 403 | Your quota is used up. Nothing was charged for this request. | Top up or change your plan, then send the request again. |
| `InvalidRequestError` | 400 | The API rejected a field of the request, for example the QR text or an option value. | Fix the request using `error.code` and `error.message`. Sending it again unchanged fails again. |
| `InvalidImageError` | 400 | The image is not a slip the API can read, or it is too large. | Ask for a clear JPEG, PNG, GIF or WebP image under 4 MB. |
| `InvalidUrlError` | 400 | The image URL or `callbackUrl` is not allowed or could not be reached. | Use a public https URL. |
| `DuplicateSlipError` | 400 | API v1 only, with `checkDuplicate: true`: the slip was verified before. `error.slip` holds the original slip. | Treat the payment as already received. Do not credit it again. |
| `NotFoundError` | 404 | The bank account, job or other item does not exist. | Check the ID you passed. |
| `SlipNotFoundError` | 404 | The bank has no transaction that matches this slip. | Do not accept the payment. Ask the payer for the original slip. |
| `SlipPendingError` | 404 | The bank has not published the transaction yet. This happens with very new Bangkok Bank slips. | Verify the slip again after a short wait. |
| `ConflictError` | 409 | The bank account you are creating already exists. | Use the existing account. `bankAccounts.listAll()` finds it. |
| `RateLimitError` | 429 | You sent too many requests. `error.retryAfter` says how long to wait. | Wait and send fewer requests. The SDK has already retried this request. |
| `ServerError` | 500, 502, 504 | Something went wrong on the EasySlip side. | Try again later. If it keeps happening, contact support with `error.requestId`. |
| `ServiceUnavailableError` | 503 | The service is briefly unavailable, for example while quotas renew. | Try again in a few minutes. |
| `NetworkError` | None | No response arrived because of a DNS, connection or TLS failure. | Check the network or proxy, then try again. |
| `RequestTimeoutError` | None | No response arrived within `timeout`. | Try again or raise `timeout`. A verification may already have been counted. |
| `InputError` | None | The SDK rejected an argument before sending it, for example a missing API key, an empty QR text, an image over 4 MB or an unsupported file type. `error.code` names the reason. | Fix the argument. |
| `WebhookSignatureError` | None | A webhook signature is missing or does not match. | Reject the webhook with status 401. |
| `JobWaitTimeoutError` | None | `waitForJob` reached its `timeout`. `error.lastJob` is the last state it saw. | Wait longer, or rely on the webhook. |
| `BatchSubmitError` | None | `submitBankMany` failed part way. `error.submitted` lists the batches that were sent and `error.failedChunk` is the index of the batch that failed. | Submit the failed batch and the ones after it again. The batches already sent keep running. |

This example handles the most common cases and logs the details you need when you contact support:

```ts
import {
    ApiError,
    EasySlip,
    QuotaExceededError,
    RateLimitError,
    SlipNotFoundError,
    SlipPendingError,
} from '@easyslip/sdk'

const easyslip = new EasySlip()

try {
    const slip = await easyslip.verify.bankByImage('./slip.jpg', { checkDuplicate: true })
    console.log('Verified', slip.rawSlip.transRef)
} catch (error) {
    if (error instanceof SlipNotFoundError) {
        console.log('The bank has no record of this slip. Do not accept it.')
    } else if (error instanceof SlipPendingError) {
        console.log('The bank has not published this transfer yet. Try again in a minute.')
    } else if (error instanceof QuotaExceededError) {
        console.log('Your quota is used up.')
    } else if (error instanceof RateLimitError) {
        console.log(`Too many requests. Try again in ${error.retryAfter ?? 1} seconds.`)
    } else if (error instanceof ApiError) {
        console.log(error.status, error.code, error.message, error.requestId)
    } else {
        throw error
    }
}
```

### Automatic retries

The SDK retries a failed request up to `maxRetries` times (default 2). Before each retry it waits 0.5 seconds, then 1, 2 and 4 seconds, never more than 8 seconds, and shortens each wait by a random amount of up to half. When the API sends `Retry-After`, the SDK waits that long instead, and gives up at once if the wait would be longer than 60 seconds.

| Request | Retried on |
| --- | --- |
| Reads and calls that are safe to repeat: `getInfo`, `banks.list`, `bankAccounts.list`, `listAll`, `get` and `link`, `jobs.get`, `v1.getMe` and `v1.generateQr` | Network errors, timeouts, 429, 500, 502, 503 and 504 |
| Verifications and job submissions, which can use quota | 429, and connection failures where the request never reached the API |
| Bank account changes: `create`, `update` and `unlink` | 429, and connection failures where the request never reached the API |

Verifications are not retried after a timeout or a 5xx error, because the API may already have counted them. This way the SDK never bills the same slip twice. Errors that retrying cannot fix, such as 400, 401, 403, 404 and 409, are never retried.

## Webhook signatures

When a job finishes, EasySlip sends a POST request to your `callbackUrl`. If your branch has a webhook secret, the request carries an `X-EasySlip-Signature` header. Check it before you trust the body.

```ts
import { constructWebhookEvent, WEBHOOK_SIGNATURE_HEADER, WebhookSignatureError } from '@easyslip/sdk'

// Works with any framework that gives you a web Request, such as Next.js, Bun.serve or Deno.serve
export async function POST(request: Request): Promise<Response> {
    const rawBody = await request.text()
    try {
        const event = constructWebhookEvent(rawBody, request.headers.get(WEBHOOK_SIGNATURE_HEADER))
        if (event.status === 'success') console.log(event.jobId, event.data?.rawSlip.transRef)
        else console.log(event.jobId, event.status, event.error?.code)
        return new Response('ok')
    } catch (error) {
        if (error instanceof WebhookSignatureError) {
            return new Response('invalid signature', { status: 401 })
        }
        throw error
    }
}
```

| Function | What it does |
| --- | --- |
| `constructWebhookEvent(rawBody, header, secret?)` | Checks the signature, then parses the event. Throws `WebhookSignatureError` when the signature is missing or wrong. |
| `verifyWebhookSignature(rawBody, header, secret?)` | Returns `true` when the signature matches and `false` otherwise. |
| `parseWebhookEvent(rawBody)` | Parses the event without checking the signature. Use it only for webhooks you have already verified. |
| `WEBHOOK_SIGNATURE_HEADER` | The header name, `X-EasySlip-Signature`. |

`secret` defaults to `EASYSLIP_WEBHOOK_SECRET`. Always pass the raw body exactly as received: parsing the JSON and serializing it again can change the bytes, and then the signature will not match. In Express, use `express.raw({ type: 'application/json' })` on the webhook route. Answer with a 2xx status within 5 seconds, and use `jobId` to ignore an event that arrives more than once.

## Examples and API documentation

The [`examples`](examples) folder has one small program for every method. To run them, clone this repository and build it first:

```sh
git clone https://github.com/EASYSLIP-CO-LTD/sdk-js.git
cd sdk-js
npm install
npm run build
export EASYSLIP_API_KEY="your-api-key"
node examples/get-info.ts
```

Each example prints how to call it when you leave out its arguments, for example `node examples/verify-bank-image.ts ./slip.jpg`. Node.js 22.18 or newer runs the `.ts` files directly.

- API documentation: [document.easyslip.com](https://document.easyslip.com)
- This SDK in the documentation: [document.easyslip.com/en/sdk/javascript](https://document.easyslip.com/en/sdk/javascript)
- Error codes: [document.easyslip.com/en/reference/error-codes](https://document.easyslip.com/en/reference/error-codes)
- Release notes: [CHANGELOG.md](CHANGELOG.md)

## Support

- **Your account, quota or billing:** contact EasySlip on [LINE @ai-easy](https://line.me/R/ti/p/@ai-easy), by phone at 02-114-8806, on [Facebook](https://www.facebook.com/Easyslip.tech/) or through the [contact page](https://developer.easyslip.com/contact). Include the request ID from `meta.requestId` or `error.requestId`.
- **A bug or a feature request for this SDK:** open an [issue](https://github.com/EASYSLIP-CO-LTD/sdk-js/issues). Never post your API key, webhook secret or real slip images.
- **A security problem:** follow [SECURITY.md](SECURITY.md) and report it privately.

## License

This SDK is released under the [MIT License](LICENSE).
