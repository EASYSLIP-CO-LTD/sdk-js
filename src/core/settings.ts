/** Default hosts, environment variable names and header names the SDK uses. */
export const settings = {
    baseUrls: {
        v1: 'https://api.easyslip.com/v1',
        v2: 'https://api.easyslip.com/v2',
    },
    userAgentProduct: 'easyslip-js',
    webhook: {
        signatureHeader: 'X-EasySlip-Signature',
        signaturePrefix: 'sha256=',
    },
    env: {
        apiKey: 'EASYSLIP_API_KEY',
        apiKeyFile: 'EASYSLIP_API_KEY_FILE',
        webhookSecret: 'EASYSLIP_WEBHOOK_SECRET',
        v1BaseUrl: 'EASYSLIP_V1_BASE_URL',
        v2BaseUrl: 'EASYSLIP_V2_BASE_URL',
    },
} as const
