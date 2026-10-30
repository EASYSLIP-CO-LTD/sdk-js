import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['test/unit/**/*.test.ts', 'test/conformance.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reporter: ['text', 'lcov', 'json-summary'],
        },
    },
})
