// Type-checks the published .d.ts files the way an application uses them.
import {
    type AccountType,
    type BankSlipResult,
    type Client,
    type CreateBankAccountParams,
    EasySlip,
    EasySlipError,
    type QrType,
    SlipNotFoundError,
    type WithMeta,
} from '@easyslip/sdk'

const client: Client = new EasySlip({ apiKey: 'sk_offline_check_0000', timeout: 1000 })

export async function amount(payload: string): Promise<number> {
    const result: WithMeta<BankSlipResult> = await client.verify.bankByPayload(payload, {
        checkDuplicate: true,
    })
    const requestId: string | null = result.meta.requestId
    return requestId === null ? result.amountInSlip : result.rawSlip.amount.amount
}

export const rooted: boolean =
    new SlipNotFoundError({
        status: 404,
        code: 'X',
        message: 'm',
        requestId: null,
        rawBody: '',
        headers: {},
    }) instanceof EasySlipError

// @ts-expect-error the API key is a string, so the types are not `any`
new EasySlip({ apiKey: 1 })

// Request values the API rejects do not type check.
export const juristic: CreateBankAccountParams = {
    bankCode: '004',
    bankNumber: '1234567890',
    nameTh: 'บริษัท ตัวอย่าง จำกัด',
    nameEn: 'EXAMPLE CO., LTD.',
    type: 'JURISTIC',
}
// @ts-expect-error a receiving account type is NATURAL or JURISTIC
export const bankType: AccountType = 'BANK'
// @ts-expect-error the API has no QR type BANK
export const qrType: QrType = 'BANK'
