import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { errorCodes, statusFallback } from '../../src/core/error-codes.ts'
import * as sdk from '../../src/index.ts'
import { VERSION } from '../../src/version.ts'

interface Catalogue {
    classes: Record<string, { parent: string }>
    statusFallback: Record<string, string>
    codes: Record<'v1' | 'v2', Record<string, { class: string }>>
}

const catalogue: Catalogue = JSON.parse(
    readFileSync(new URL('../fixtures/errors.json', import.meta.url), 'utf8'),
)
const classOf = (codes: Record<string, { class: string }>) =>
    Object.fromEntries(Object.entries(codes).map(([code, entry]) => [code, entry.class]))

test('every API error code maps to the class in the error catalogue', () => {
    expect(errorCodes.v1).toEqual(classOf(catalogue.codes.v1))
    expect(errorCodes.v2).toEqual(classOf(catalogue.codes.v2))
})

test('unknown codes fall back to the class for their HTTP status', () => {
    expect(statusFallback).toEqual(
        Object.fromEntries(
            Object.entries(catalogue.statusFallback).map(([status, cls]) => [Number(status), cls]),
        ),
    )
})

test('error classes have the parents listed in the catalogue', () => {
    for (const [name, { parent }] of Object.entries(catalogue.classes)) {
        const cls = (sdk as unknown as Record<string, abstract new (...args: never) => unknown>)[
            name
        ]
        expect(cls, name).toBeDefined()
        const expected = parent === 'root' ? sdk.EasySlipError : (sdk as never)[parent]
        expect(Object.getPrototypeOf(cls), name).toBe(expected)
    }
})

test('VERSION matches package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(VERSION).toBe(pkg.version)
})
