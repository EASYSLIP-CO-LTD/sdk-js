import { describe, expect, test } from 'bun:test'
import { DuplicateSlipError } from '../../src/index.ts'
import { bodyOf, json, mockClient, ok, type Sent } from './helpers.ts'

const base = { transactionId: '50012345678902', date: '2026-12-03T22:05:00+07:00', amount: 200.25 }
const withNames = {
    ...base,
    sender: { name: 'นาย ผู้โอน ทดสอบ' },
    receiver: { name: 'นาย รับเงิน ทดสอบ', phone: '08-xxx-4567' },
}
const withPhones = {
    ...base,
    sender: { phone: '08-xxx-2345' },
    receiver: { phone: '08-xxx-9876' },
}

describe('TrueMoney Wallet slip shapes', () => {
    test.each([
        ['with names (older answer)', withNames],
        ['with phones only', withPhones],
        ['with a receiver phone only', { ...base, receiver: { phone: '08-xxx-9876' } }],
        ['with no sender and no receiver', base],
    ])('v2 reads a slip %s', async (_name, rawSlip) => {
        const { client } = mockClient(() => ok({ amountInSlip: 200.25, rawSlip }))
        const data = await client.verify.truewalletByUrl('https://example.com/a.png')
        expect(JSON.parse(JSON.stringify(data.rawSlip))).toEqual(rawSlip)
        if (!('sender' in rawSlip)) expect(data.rawSlip.sender).toBeUndefined()
    })

    test.each([
        ['with names (older answer)', withNames],
        ['with phones only', withPhones],
        ['with no sender and no receiver', base],
    ])('v1 reads a slip %s', async (_name, data) => {
        const { client } = mockClient(() => json(200, { status: 200, data }))
        const result = await client.v1.verifyTruemoneyByPayload('wallet-qr')
        expect(JSON.parse(JSON.stringify(result))).toEqual(data)
    })

    test('a duplicate answer without names keeps the slip on the error', async () => {
        const { client } = mockClient(() =>
            json(400, { status: 400, message: 'duplicate_slip', data: withPhones }),
        )
        const error = await client.v1
            .verifyTruemoneyByPayload('wallet-qr', { checkDuplicate: true })
            .then(
                () => null,
                (e: unknown) => e,
            )
        expect(error).toBeInstanceOf(DuplicateSlipError)
        expect(JSON.parse(JSON.stringify((error as DuplicateSlipError).slip))).toEqual(withPhones)
    })
})

describe('TrueMoney Wallet by payload', () => {
    test('v2 sends the payload and the options as JSON', async () => {
        const { client, sent } = mockClient(() => ok({ amountInSlip: 200.25, rawSlip: base }))
        await client.verify.truewalletByPayload('wallet-qr', { remark: 'r', checkDuplicate: true })
        expect(sent[0]?.url.pathname).toBe('/v2/verify/truewallet')
        expect(bodyOf(sent[0] as Sent)).toEqual({
            payload: 'wallet-qr',
            remark: 'r',
            checkDuplicate: true,
        })
    })

    test('v1 sends a JSON boolean for checkDuplicate', async () => {
        const { client, sent } = mockClient(() => json(200, { status: 200, data: base }))
        await client.v1.verifyTruemoneyByPayload('wallet-qr', { checkDuplicate: false })
        expect(sent[0]?.url.pathname).toBe('/v1/verify/truewallet')
        expect(bodyOf(sent[0] as Sent)).toEqual({ payload: 'wallet-qr', checkDuplicate: false })
    })

    test('an empty payload is refused before any request', async () => {
        const { client, sent } = mockClient(() => ok({}))
        await expect(client.verify.truewalletByPayload('')).rejects.toThrow()
        await expect(client.v1.verifyTruemoneyByPayload('')).rejects.toThrow()
        expect(sent).toHaveLength(0)
    })
})
