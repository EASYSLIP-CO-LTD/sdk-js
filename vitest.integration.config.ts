import { defineConfig } from 'vitest/config'

// Calls the live API. Every test is skipped unless EASYSLIP_API_KEY or EASYSLIP_API_KEY_FILE is set.
export default defineConfig({
    test: {
        include: ['test/integration/**/*.test.ts'],
        testTimeout: 180_000,
        hookTimeout: 60_000,
        fileParallelism: false,
    },
})
