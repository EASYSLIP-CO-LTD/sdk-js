# EasySlip SDK สำหรับ JavaScript และ TypeScript

[![CI](https://github.com/EASYSLIP-CO-LTD/sdk-js/actions/workflows/ci.yml/badge.svg)](https://github.com/EASYSLIP-CO-LTD/sdk-js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

ไลบรารีทางการของ [EasySlip API](https://document.easyslip.com) สำหรับ JavaScript และ TypeScript ใช้ตรวจสลิปโอนเงินธนาคารไทยและสลิป TrueMoney Wallet ได้ทั้งบน Node.js, Bun, Deno และ JavaScript runtime อื่น ๆ

[Read in English](README.md)

## ความสามารถ

- ตรวจสลิปธนาคารได้จากข้อความในคิวอาร์โค้ด ไฟล์รูป URL ของรูป หรือ base64 และตรวจสลิป TrueMoney Wallet ได้จากรูป URL หรือ base64
- เช็กสลิปซ้ำ เทียบบัญชีผู้รับกับบัญชีที่ลงทะเบียนไว้ และเทียบยอดเงิน ได้ในคำขอเดียว
- ส่งสลิปไปตรวจเบื้องหลังเป็นงาน (job) ได้ครั้งละสูงสุด 100 ใบ แล้วรับผลทางเว็บฮุค
- จัดการบัญชีธนาคารที่ใช้รับเงิน และดูโควตา ข้อมูลสาขา และข้อมูลบัญชีผู้ใช้
- ใช้ API v1 ต่อได้สำหรับระบบเดิม รวมถึงสร้างคิวอาร์ PromptPay, บิลเพย์เมนต์, K SHOP, แม่มณี และถุงเงิน โดยไม่เสียโควตา
- ตรวจลายเซ็นเว็บฮุคแบบ constant time
- แยกคลาส error ตามรหัส error ของ API ทุกตัว ระบบลองใหม่อัตโนมัติจะไม่ส่งคำขอที่คิดโควตาซ้ำ และ API key จะไม่หลุดไปอยู่ในข้อความ error
- ไม่มี runtime dependency เลย แพ็กเกจมีทั้ง ESM และ CommonJS พร้อมไฟล์ type

## สิ่งที่ต้องมี

- **Node.js 22, 24 หรือ 26** ขั้นต่ำคือ Node.js 22 (`"engines": { "node": ">=22" }`) CI รันชุดทดสอบเต็มบนทั้งสามเวอร์ชัน
- **Bun และ Deno** ใช้ได้เช่นกัน CI ติดตั้งแพ็กเกจบน Bun 1.4 และ Deno 2.9 แล้วลองเรียกใช้จริง
- **Edge runtime** อย่าง Cloudflare Workers ก็ใช้ได้ เพราะ SDK ต้องการแค่ `fetch` มาตรฐาน แต่ runtime กลุ่มนี้ไม่มีระบบไฟล์ จึงต้องส่ง `apiKey` ในโค้ดแทนการใช้ `EASYSLIP_API_KEY_FILE`
- **TypeScript 5 ขึ้นไป** ถ้าใช้ TypeScript ไฟล์ type ที่เผยแพร่ผ่านการตรวจกับ TypeScript 5.9 และ 7.0
- **API key ของ EasySlip** สร้างได้ที่ [EasySlip developer portal](https://developer.easyslip.com)

## การติดตั้ง

```sh
npm install @easyslip/sdk
```

ใช้ `pnpm add @easyslip/sdk`, `yarn add @easyslip/sdk` หรือ `bun add @easyslip/sdk` ก็ได้ ส่วน Deno ให้ import จาก `npm:@easyslip/sdk`

## เริ่มใช้งาน

ตั้ง API key ไว้ใน environment แล้วสร้าง client ได้เลย client จะอ่าน `EASYSLIP_API_KEY` ให้เอง

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

`EasySlip` กับ `Client` เป็นคลาสเดียวกัน จะเขียน `new Client()` ก็ได้ การตรวจสลิปแต่ละครั้งจะนับโควตา

### ตรวจสลิปธนาคาร

มีเมธอดแยกตามรูปแบบสลิปที่ได้รับมา ทั้งสี่เมธอดให้ผลลัพธ์แบบเดียวกัน

```ts
// ข้อความในคิวอาร์โค้ดของสลิป เช่น จากตัวสแกนคิวอาร์
await easyslip.verify.bankByPayload(payload)

// ไฟล์รูป: path, bytes, Blob หรือ File, หรือ stream
await easyslip.verify.bankByImage('./slip.jpg')

// URL แบบ https ของรูปสลิปที่เข้าถึงได้จากภายนอก
await easyslip.verify.bankByUrl('https://example.com/slip.jpg')

// รูปในรูปแบบ base64 จะมี data: นำหน้าหรือไม่ก็ได้
await easyslip.verify.bankByBase64(base64Image)
```

`bankByImage` รับ path ของไฟล์หรือ URL แบบ `file:`, `Uint8Array`, `Buffer` หรือ `ArrayBuffer`, `Blob` หรือ `File` (เช่น ที่ได้จาก `request.formData()`), web `ReadableStream` และ readable stream ของ Node.js SDK ดูชนิดไฟล์จากเนื้อไฟล์จริง และรับ JPEG, PNG, GIF และ WebP ขนาดไม่เกิน 4 MB ถ้าส่งเป็น string SDK จะถือว่าเป็น path ของไฟล์เสมอ จึงห้ามส่งข้อความที่รับมาจากผู้ใช้เป็นรูปโดยตรง

เมธอดตรวจสลิปทุกตัวรับตัวเลือกด้านล่าง ตัวเลือกที่ไม่ได้ใส่จะไม่ถูกส่งไป และฟิลด์ผลลัพธ์ของตัวเลือกนั้นจะไม่มีอยู่ใน response เลย (ไม่ใช่ `null`)

| ตัวเลือก | ใช้ทำอะไร | ค่าเริ่มต้น |
| --- | --- | --- |
| `checkDuplicate` | เช็กว่าสาขานี้เคยตรวจสลิปใบนี้แล้วหรือยัง และเพิ่ม `isDuplicate` ในผลลัพธ์ | ไม่เช็ก |
| `matchAccount` | เทียบบัญชีผู้รับกับบัญชีธนาคารที่ลงทะเบียนไว้ และเพิ่ม `matchedAccount` (บัญชีที่ตรงกัน หรือ `null`) | ไม่เทียบ |
| `matchAmount` | เทียบยอดในสลิปกับยอดที่คาดไว้ หน่วยเป็นบาท และเพิ่ม `amountInOrder` กับ `isAmountMatched` | ไม่เทียบ |
| `remark` | บันทึกโน้ตของคุณเองยาว 1 ถึง 255 ตัวอักษรไว้กับการตรวจครั้งนี้ และส่งกลับมาใน `remark` | ไม่มี |

```ts
const result = await easyslip.verify.bankByImage('./slip.jpg', {
    checkDuplicate: true,
    matchAccount: true,
    matchAmount: 1500,
    remark: 'Invoice 1001',
})

if (result.isDuplicate || !result.isAmountMatched || result.matchedAccount === null) {
    console.log('ยังไม่ควรรับยอดนี้')
}
console.log(result.rawSlip.sender.account.name.th, result.rawSlip.receiver.account.bank?.account)
```

### ตรวจสลิป TrueMoney Wallet

ใช้ตัวเลือกชุดเดียวกับสลิปธนาคาร

```ts
const wallet = await easyslip.verify.truewalletByImage('./wallet-slip.png')
await easyslip.verify.truewalletByUrl('https://example.com/wallet-slip.png')
await easyslip.verify.truewalletByBase64(base64Image)

console.log(wallet.rawSlip.transactionId, wallet.rawSlip.amount, wallet.rawSlip.receiver.phone)
```

### ดูโควตาและรายชื่อธนาคาร

```ts
const info = await easyslip.getInfo()
console.log(info.application.name, info.application.quota.remaining, info.branch.name)

const banks = await easyslip.banks.list()
for (const bank of banks) console.log(bank.code, bank.nameTh)
```

ถ้าโควตาไม่จำกัด `quota.max` และ `quota.remaining` จะเป็น `null`

### สร้างคิวอาร์รับเงิน

คิวอาร์สร้างผ่าน API v1 และไม่เสียโควตา `imageBytes()` คืนรูป PNG

```ts
import { writeFile } from 'node:fs/promises'

const qr = await easyslip.v1.generateQr({ type: 'PROMPTPAY', msisdn: '0812345678', amount: 100 })
await writeFile('qr.png', qr.imageBytes())
console.log(qr.payload)
```

| `type` | ฟิลด์ที่ต้องใส่ | ฟิลด์ที่ใส่หรือไม่ก็ได้ |
| --- | --- | --- |
| `PROMPTPAY` | ใส่อย่างใดอย่างหนึ่งเท่านั้น: `msisdn` (เบอร์โทร), `natId` (เลขบัตรประชาชนหรือเลขผู้เสียภาษี), `eWalletId` หรือ `billerId` | `amount` และใส่ `ref1`, `ref2` ได้เมื่อใช้ `billerId` |
| `BILL_PAYMENT` | `billerId` | `amount`, `ref1`, `ref2` |
| `KSHOP` | `ref1`: รหัสร้าน ขึ้นต้นด้วย `KB` ตามด้วยตัวเลข 12 หลัก | `amount` |
| `MAE_MANEE` | `ref1`: รหัสร้าน 15 หลัก | `amount` |
| `TUNGNGERN` | `ref1`: รหัสร้านค้า และ `merchantName`: ชื่อร้านภาษาอังกฤษ | `amount` |

ถ้าไม่ใส่ `amount` ผู้จ่ายจะกรอกยอดเอง

### ใช้ API v1

ถ้าระบบของคุณใช้ API v1 อยู่แล้ว เรียกผ่าน `easyslip.v1` ได้เลย เมธอดตรวจสลิปของ v1 คืนข้อมูลสลิปโดยตรง

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

เมื่อใส่ `checkDuplicate: true` แล้วสลิปเคยถูกตรวจมาก่อน SDK จะโยน `DuplicateSlipError` และ `error.slip` คือข้อมูลสลิปเดิม API v1 ไม่คิดโควตาสำหรับสลิปซ้ำ

### ตรวจสลิปเบื้องหลัง

งาน (job) จะตรวจสลิปฝั่ง EasySlip แล้วส่งผลไปที่เว็บฮุคของคุณ ต้องใส่ `callbackUrl` แบบ https ทุกครั้ง เว้นแต่สาขาตั้ง Default Webhook URL ไว้แล้ว

```ts
const callbackUrl = 'https://example.com/webhooks/slip'

const { jobId } = await easyslip.jobs.submitBank(payload, { callbackUrl, checkDuplicate: true })

const job = await easyslip.jobs.waitForJob(jobId)
if (job.status === 'done' && job.result?.status === 'success') {
    console.log(job.result.data?.rawSlip.transRef)
}
```

| เมธอด | ใช้ทำอะไร |
| --- | --- |
| `jobs.submitBank(payload, options)` | ส่งสลิปหนึ่งใบ รับตัวเลือกการตรวจและ `callbackUrl` |
| `jobs.submitBankBatch(slips, { callbackUrl })` | ส่งสลิป 1 ถึง 100 ใบในคำขอเดียว แต่ละใบตั้งตัวเลือกของตัวเองได้ |
| `jobs.submitBankMany(slips, { callbackUrl })` | แบ่งสลิปจำนวนเท่าไรก็ได้เป็นชุดละ 100 ใบ แล้วส่งทีละชุด |
| `jobs.get(jobId)` | คืนสถานะงาน และผลลัพธ์เมื่องานเสร็จแล้ว |
| `jobs.waitForJob(jobId, options)` | เรียก `jobs.get` ซ้ำจนงานเป็น `done` หรือ `failed` งานที่ `failed` จะถูกคืนกลับมา ไม่ได้โยนเป็น error |

`waitForJob` รับ `interval` คือระยะห่างระหว่างการเช็กแต่ละครั้ง หน่วยมิลลิวินาที (ค่าเริ่มต้น 2000 ต่ำสุด 500), `timeout` คือเวลารอนานที่สุด หน่วยมิลลิวินาที (ค่าเริ่มต้น 600000 หรือ 10 นาที) และ `signal` คือ `AbortSignal` สำหรับหยุดรอ

### จัดการบัญชีธนาคารที่ใช้รับเงิน

`matchAccount` เทียบบัญชีผู้รับในสลิปกับบัญชีกลุ่มนี้ บัญชีเป็นของบริการ (service) และผูกกับสาขาได้

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

| เมธอด | ใช้ทำอะไร |
| --- | --- |
| `bankAccounts.create(params)` | เพิ่มบัญชีเข้าบริการ และผูกกับสาขานี้ |
| `bankAccounts.list(params)` | ดึงบัญชีที่ผูกกับสาขานี้ทีละหน้า `page` เริ่มที่ 1 และ `limit` อยู่ระหว่าง 1 ถึง 100 (ค่าเริ่มต้น 20) |
| `bankAccounts.listAll(params)` | ดึงบัญชีทั้งหมดของบริการทีละหน้า แบ่งหน้าแบบเดียวกัน |
| `bankAccounts.iterate(params)` | ไล่ดูบัญชีทุกบัญชีที่ผูกกับสาขานี้ โดย SDK ดึงให้หน้าละ 100 บัญชี |
| `bankAccounts.iterateAll(params)` | ไล่ดูบัญชีทุกบัญชีของบริการ หน้าละ 100 บัญชี |
| `bankAccounts.get(id)` | ดึงบัญชีเดียว |
| `bankAccounts.update(id, params)` | แก้เฉพาะฟิลด์ที่ส่งมา ส่ง `extraVerify: null` เพื่อล้างค่า |
| `bankAccounts.link(id)` | ผูกบัญชีกับสาขานี้ ผูกซ้ำก็ไม่ error |
| `bankAccounts.unlink(id)` | ยกเลิกการผูกบัญชีกับสาขานี้ บัญชียังอยู่ในบริการ |

`list`, `listAll`, `iterate` และ `iterateAll` กรองด้วย `type` (`NATURAL` หรือ `JURISTIC`) และ `bankCode` ได้ ดูรหัสธนาคารได้จาก `banks.list()` และ `banks.find(code)` ยังบอกค่า `extraVerify` ที่ธนาคารนั้นรองรับด้วย

### ดูรายละเอียดของ response

ผลลัพธ์ทุกตัวมี property `meta` ที่เก็บรายละเอียดของ HTTP response แยกจากข้อมูลหลัก จึงไม่ปรากฏใน `JSON.stringify(result)`

| ฟิลด์ | เก็บอะไร |
| --- | --- |
| `meta.status` | HTTP status code |
| `meta.requestId` | รหัสคำขอ แนบมาด้วยทุกครั้งที่ติดต่อฝ่ายซัพพอร์ต |
| `meta.message` | ข้อความที่ API ส่งมากับผลลัพธ์ หรือ `null` |
| `meta.rateLimit` | `{ limit, remaining, reset }` จาก header ของ rate limit หรือ `null` |
| `meta.headers` | header ทั้งหมดของ response ชื่อเป็นตัวพิมพ์เล็ก |

## การตั้งค่า

### API key

client หา API key ตามลำดับนี้

1. ตัวเลือก `apiKey`: `new EasySlip({ apiKey: 'your-api-key' })`
2. ตัวแปร environment `EASYSLIP_API_KEY`
3. ไฟล์ที่ `EASYSLIP_API_KEY_FILE` ชี้ไป เช่น Docker secret หรือ Kubernetes secret SDK อ่านไฟล์ตอนส่งคำขอแรก และตัดช่องว่างหัวท้ายออกให้

ถ้าไม่ได้ตั้งไว้เลยสักแบบ `new EasySlip()` จะโยน `InputError` รหัส `INVALID_ARGUMENT` เก็บ key ไว้ฝั่งเซิร์ฟเวอร์เท่านั้น อย่าส่งไปที่เบราว์เซอร์

### ตัวเลือกของ client

| ตัวเลือก | ใช้ทำอะไร | ค่าเริ่มต้น |
| --- | --- | --- |
| `apiKey` | API key ของคุณ | `EASYSLIP_API_KEY` ถ้าไม่มีจะอ่านไฟล์ที่ `EASYSLIP_API_KEY_FILE` ชี้ไป |
| `timeout` | เวลาสูงสุดของการส่งคำขอแต่ละครั้ง หน่วยมิลลิวินาที | `30000` (30 วินาที) |
| `maxRetries` | จำนวนครั้งที่ลองใหม่เมื่อคำขอล้มเหลว ใส่ `0` เพื่อปิด | `2` |
| `fetch` | ฟังก์ชัน `fetch` ที่ใช้ส่งคำขอ | `fetch` ของ runtime |
| `v2BaseUrl` | base URL ของ API v2 | `EASYSLIP_V2_BASE_URL` ถ้าไม่มีใช้ `https://api.easyslip.com/v2` |
| `v1BaseUrl` | base URL ของ API v1 | `EASYSLIP_V1_BASE_URL` ถ้าไม่มีใช้ `https://api.easyslip.com/v1` |

### ตัวแปร environment

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `EASYSLIP_API_KEY` | API key ของคุณ |
| `EASYSLIP_API_KEY_FILE` | path ของไฟล์ที่เก็บ API key ใช้เมื่อไม่ได้ตั้ง `EASYSLIP_API_KEY` |
| `EASYSLIP_WEBHOOK_SECRET` | Webhook Secret ของสาขา ฟังก์ชันตรวจเว็บฮุคใช้ค่านี้เมื่อไม่ได้ส่ง secret เข้าไป |
| `EASYSLIP_V2_BASE_URL` | ใช้แทน base URL ของ API v2 |
| `EASYSLIP_V1_BASE_URL` | ใช้แทน base URL ของ API v1 |

### timeout และการลองใหม่รายคำขอ

ทุกเมธอดรับ `timeout`, `maxRetries` และ `signal` เพื่อใช้กับการเรียกครั้งนั้นครั้งเดียว เมธอดตรวจสลิปรับไว้ใน object เดียวกับตัวเลือกการตรวจ

```ts
const controller = new AbortController()

await easyslip.verify.bankByPayload(payload, { checkDuplicate: true, signal: controller.signal })
await easyslip.banks.list({ timeout: 5_000, maxRetries: 0 })
```

| ตัวเลือก | ใช้ทำอะไร | ค่าเริ่มต้น |
| --- | --- | --- |
| `timeout` | เวลาสูงสุดของการส่งแต่ละครั้งสำหรับการเรียกนี้ หน่วยมิลลิวินาที | `timeout` ของ client |
| `maxRetries` | จำนวนครั้งที่ลองใหม่สำหรับการเรียกนี้ | `maxRetries` ของ client |
| `signal` | `AbortSignal` สำหรับยกเลิกการเรียก รวมถึงช่วงที่รอลองใหม่ | ไม่มี |

### ใช้ HTTP client ของคุณเอง

ส่ง `fetch` ของคุณเองเข้าไปได้ เช่น เพื่อเก็บ log ส่งผ่าน proxy agent หรือบันทึกคำขอในเทสต์ ฟังก์ชันนี้จะได้รับ URL กับตัวเลือกของคำขอ และต้องคืน `Response`

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

## การจัดการ error

error ทุกตัวที่ SDK โยนสืบทอดจาก `EasySlipError` ส่วน error ที่มาจาก response ของ API สืบทอดจาก `ApiError` และมีฟิลด์เหล่านี้

| ฟิลด์ | เก็บอะไร |
| --- | --- |
| `status` | HTTP status code |
| `code` | รหัส error ของ API เช่น `SLIP_NOT_FOUND` ดูความหมายได้ที่ [รหัส error](https://document.easyslip.com/th/reference/error-codes) |
| `message` | ข้อความ error จาก API |
| `requestId` | รหัสคำขอ แนบมาด้วยทุกครั้งที่ติดต่อฝ่ายซัพพอร์ต |
| `retryAfter` | จำนวนวินาทีที่ควรรอก่อนลองใหม่ เมื่อ API บอกมา ถ้าไม่บอกจะเป็น `null` |
| `headers` และ `rawBody` | header และ body ของ response ตามที่ได้รับมา |

| คลาส error | HTTP status | เกิดเมื่อ | ควรทำอย่างไร |
| --- | --- | --- | --- |
| `AuthenticationError` | 401 | ไม่มี API key, key ผิด หรือ key ถูกยกเลิกแล้ว | ตรวจ key ที่ส่งเข้าไปหรือ `EASYSLIP_API_KEY` ถ้าจำเป็นให้สร้าง key ใหม่ใน developer portal |
| `PermissionDeniedError` | 403 | key ถูกต้องแต่ไม่มีสิทธิ์ทำคำขอนี้ เช่น สาขาถูกปิด บริการหมดอายุ หรือ IP ไม่อยู่ในรายการที่อนุญาต | ดู `error.code` แล้วแก้การตั้งค่าใน developer portal |
| `QuotaExceededError` | 403 | โควตาหมด คำขอนี้ยังไม่ถูกคิดเงิน | เติมโควตาหรือเปลี่ยนแพ็กเกจ แล้วส่งคำขอใหม่ |
| `InvalidRequestError` | 400 | API ไม่รับบางฟิลด์ในคำขอ เช่น ข้อความคิวอาร์หรือค่าตัวเลือก | แก้คำขอตาม `error.code` และ `error.message` ส่งซ้ำแบบเดิมจะได้ error เดิม |
| `InvalidImageError` | 400 | รูปไม่ใช่สลิปที่ API อ่านได้ หรือรูปใหญ่เกินไป | ขอรูป JPEG, PNG, GIF หรือ WebP ที่ชัดและไม่เกิน 4 MB |
| `InvalidUrlError` | 400 | URL ของรูปหรือ `callbackUrl` ไม่ได้รับอนุญาต หรือเข้าถึงไม่ได้ | ใช้ URL แบบ https ที่เข้าถึงได้จากภายนอก |
| `DuplicateSlipError` | 400 | เฉพาะ API v1 เมื่อใส่ `checkDuplicate: true`: สลิปนี้เคยถูกตรวจแล้ว `error.slip` คือข้อมูลสลิปเดิม | ถือว่าได้รับยอดนี้ไปแล้ว ห้ามเติมเงินให้ซ้ำ |
| `NotFoundError` | 404 | ไม่พบบัญชีธนาคาร งาน หรือรายการที่ระบุ | ตรวจ ID ที่ส่งเข้าไป |
| `SlipNotFoundError` | 404 | ธนาคารไม่มีรายการที่ตรงกับสลิปนี้ | อย่ารับยอดนี้ และขอสลิปตัวจริงจากผู้โอน |
| `SlipPendingError` | 404 | ธนาคารยังไม่เผยแพร่รายการนี้ มักเกิดกับสลิปกรุงเทพที่เพิ่งโอน | รอสักครู่แล้วตรวจใหม่ |
| `ConflictError` | 409 | บัญชีธนาคารที่กำลังสร้างมีอยู่แล้ว | ใช้บัญชีเดิม หาได้ด้วย `bankAccounts.listAll()` |
| `RateLimitError` | 429 | ส่งคำขอถี่เกินไป `error.retryAfter` บอกว่าต้องรอนานเท่าไร | รอแล้วลดความถี่ลง SDK ลองใหม่ให้แล้วก่อนโยน error นี้ |
| `ServerError` | 500, 502, 504 | เกิดปัญหาฝั่ง EasySlip | ลองใหม่ภายหลัง ถ้ายังเกิดซ้ำให้ติดต่อซัพพอร์ตพร้อม `error.requestId` |
| `ServiceUnavailableError` | 503 | บริการไม่พร้อมชั่วคราว เช่น ช่วงต่ออายุโควตา | ลองใหม่ในอีกไม่กี่นาที |
| `NetworkError` | ไม่มี | ไม่ได้รับ response เพราะ DNS การเชื่อมต่อ หรือ TLS ล้มเหลว | ตรวจเครือข่ายหรือ proxy แล้วลองใหม่ |
| `RequestTimeoutError` | ไม่มี | ไม่ได้รับ response ภายใน `timeout` | ลองใหม่หรือเพิ่ม `timeout` การตรวจสลิปครั้งนั้นอาจถูกนับโควตาไปแล้ว |
| `InputError` | ไม่มี | SDK ปฏิเสธค่าที่ส่งเข้ามาก่อนส่งคำขอ เช่น ไม่มี API key ข้อความคิวอาร์ว่าง รูปเกิน 4 MB หรือชนิดไฟล์ไม่รองรับ `error.code` บอกสาเหตุ | แก้ค่าที่ส่งเข้าไป |
| `WebhookSignatureError` | ไม่มี | ไม่มีลายเซ็นเว็บฮุค หรือลายเซ็นไม่ตรง | ตอบเว็บฮุคนั้นด้วย status 401 |
| `JobWaitTimeoutError` | ไม่มี | `waitForJob` รอจนครบ `timeout` แล้ว `error.lastJob` คือสถานะล่าสุดที่เห็น | รอนานขึ้น หรือรอผลทางเว็บฮุคแทน |
| `BatchSubmitError` | ไม่มี | `submitBankMany` ล้มเหลวกลางทาง `error.submitted` คือชุดที่ส่งไปแล้ว และ `error.failedChunk` คือลำดับของชุดที่ล้มเหลว | ส่งชุดที่ล้มเหลวและชุดถัดไปใหม่ ชุดที่ส่งไปแล้วยังทำงานต่อ |

ตัวอย่างนี้จัดการกรณีที่พบบ่อย และพิมพ์รายละเอียดที่ต้องใช้ตอนติดต่อซัพพอร์ต

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
    console.log('ตรวจผ่าน', slip.rawSlip.transRef)
} catch (error) {
    if (error instanceof SlipNotFoundError) {
        console.log('ธนาคารไม่มีรายการของสลิปนี้ อย่ารับยอด')
    } else if (error instanceof SlipPendingError) {
        console.log('ธนาคารยังไม่เผยแพร่รายการนี้ ลองใหม่อีกครั้งในหนึ่งนาที')
    } else if (error instanceof QuotaExceededError) {
        console.log('โควตาหมดแล้ว')
    } else if (error instanceof RateLimitError) {
        console.log(`ส่งคำขอถี่เกินไป ลองใหม่ในอีก ${error.retryAfter ?? 1} วินาที`)
    } else if (error instanceof ApiError) {
        console.log(error.status, error.code, error.message, error.requestId)
    } else {
        throw error
    }
}
```

### การลองใหม่อัตโนมัติ

SDK ลองส่งคำขอที่ล้มเหลวใหม่ได้สูงสุด `maxRetries` ครั้ง (ค่าเริ่มต้น 2) ก่อนลองใหม่แต่ละครั้งจะรอ 0.5 วินาที แล้วเพิ่มเป็น 1, 2 และ 4 วินาที ไม่เกิน 8 วินาที และสุ่มลดเวลารอลงไม่เกินครึ่งหนึ่ง ถ้า API ส่ง `Retry-After` มา SDK จะรอตามนั้นแทน และจะเลิกทันทีถ้าต้องรอนานกว่า 60 วินาที

| คำขอ | ลองใหม่เมื่อ |
| --- | --- |
| การอ่านข้อมูลและคำขอที่ส่งซ้ำได้อย่างปลอดภัย: `getInfo`, `banks.list`, `bankAccounts.list`, `listAll`, `get` และ `link`, `jobs.get`, `v1.getMe` และ `v1.generateQr` | network error, timeout, 429, 500, 502, 503 และ 504 |
| การตรวจสลิปและการส่งงาน ซึ่งอาจนับโควตา | 429 และกรณีเชื่อมต่อไม่สำเร็จจนคำขอไปไม่ถึง API |
| การแก้ไขบัญชีธนาคาร: `create`, `update` และ `unlink` | 429 และกรณีเชื่อมต่อไม่สำเร็จจนคำขอไปไม่ถึง API |

SDK ไม่ลองตรวจสลิปใหม่หลัง timeout หรือ error 5xx เพราะ API อาจนับคำขอนั้นไปแล้ว วิธีนี้ทำให้สลิปใบเดียวไม่ถูกคิดเงินซ้ำ ส่วน error ที่ลองใหม่ก็ไม่หาย เช่น 400, 401, 403, 404 และ 409 จะไม่ลองใหม่เลย

## ตรวจลายเซ็นเว็บฮุค

เมื่องานเสร็จ EasySlip จะส่งคำขอ POST ไปที่ `callbackUrl` ของคุณ ถ้าสาขาตั้ง Webhook Secret ไว้ คำขอจะมี header `X-EasySlip-Signature` มาด้วย ตรวจลายเซ็นนี้ก่อนเชื่อข้อมูลใน body ทุกครั้ง

```ts
import { constructWebhookEvent, WEBHOOK_SIGNATURE_HEADER, WebhookSignatureError } from '@easyslip/sdk'

// ใช้ได้กับทุก framework ที่ให้ web Request มา เช่น Next.js, Bun.serve หรือ Deno.serve
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

| ฟังก์ชัน | ใช้ทำอะไร |
| --- | --- |
| `constructWebhookEvent(rawBody, header, secret?)` | ตรวจลายเซ็นแล้วแปลง body เป็น event โยน `WebhookSignatureError` เมื่อไม่มีลายเซ็นหรือลายเซ็นไม่ตรง |
| `verifyWebhookSignature(rawBody, header, secret?)` | คืน `true` เมื่อลายเซ็นตรง และ `false` เมื่อไม่ตรง |
| `parseWebhookEvent(rawBody)` | แปลง body เป็น event โดยไม่ตรวจลายเซ็น ใช้กับเว็บฮุคที่ตรวจลายเซ็นแล้วเท่านั้น |
| `WEBHOOK_SIGNATURE_HEADER` | ชื่อ header คือ `X-EasySlip-Signature` |

ถ้าไม่ส่ง `secret` จะใช้ค่าจาก `EASYSLIP_WEBHOOK_SECRET` ต้องส่ง body ดิบตามที่ได้รับมาเสมอ เพราะการแปลง JSON แล้วแปลงกลับอาจทำให้ bytes เปลี่ยน แล้วลายเซ็นจะไม่ตรง ถ้าใช้ Express ให้ใช้ `express.raw({ type: 'application/json' })` กับ route ของเว็บฮุค ตอบกลับด้วย status 2xx ภายใน 5 วินาที และใช้ `jobId` กันการประมวลผล event ที่ส่งมาซ้ำ

## ตัวอย่างและเอกสาร API

โฟลเดอร์ [`examples`](examples) มีโปรแกรมสั้น ๆ ครบทุกเมธอด วิธีรันคือ clone repository นี้แล้ว build ก่อน

```sh
git clone https://github.com/EASYSLIP-CO-LTD/sdk-js.git
cd sdk-js
npm install
npm run build
export EASYSLIP_API_KEY="your-api-key"
node examples/get-info.ts
```

ถ้ารันตัวอย่างโดยไม่ใส่ argument ตัวอย่างจะบอกวิธีเรียกที่ถูกต้อง เช่น `node examples/verify-bank-image.ts ./slip.jpg` Node.js 22.18 ขึ้นไปรันไฟล์ `.ts` ได้โดยตรง

- เอกสาร API: [document.easyslip.com](https://document.easyslip.com)
- หน้า SDK นี้ในเอกสาร: [document.easyslip.com/th/sdk/javascript](https://document.easyslip.com/th/sdk/javascript)
- รหัส error: [document.easyslip.com/th/reference/error-codes](https://document.easyslip.com/th/reference/error-codes)
- บันทึกการเปลี่ยนแปลงแต่ละเวอร์ชัน: [CHANGELOG.md](CHANGELOG.md)

## ช่องทางช่วยเหลือ

- **เรื่องบัญชี โควตา หรือการชำระเงิน:** ติดต่อ EasySlip ทาง [LINE @ai-easy](https://line.me/R/ti/p/@ai-easy), โทร 02-114-8806, [Facebook](https://www.facebook.com/Easyslip.tech/) หรือ[หน้าติดต่อเรา](https://developer.easyslip.com/contact) แนบรหัสคำขอจาก `meta.requestId` หรือ `error.requestId` มาด้วย
- **แจ้งบั๊กหรือขอฟีเจอร์ของ SDK นี้:** เปิด [issue](https://github.com/EASYSLIP-CO-LTD/sdk-js/issues) ห้ามโพสต์ API key, Webhook Secret หรือรูปสลิปจริง
- **ปัญหาด้านความปลอดภัย:** แจ้งแบบส่วนตัวตามขั้นตอนใน [SECURITY.md](SECURITY.md)

## สัญญาอนุญาต

SDK นี้เผยแพร่ภายใต้ [MIT License](LICENSE)
