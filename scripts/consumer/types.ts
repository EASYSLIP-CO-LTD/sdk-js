// Type-checks the published .d.ts files the way an application uses them.
import {
    type BankSlipResult,
    type Client,
    EasySlip,
    EasySlipError,
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
