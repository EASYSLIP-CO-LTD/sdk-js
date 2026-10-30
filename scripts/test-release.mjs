import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
const step = workflow.split('      - name: Publish\n')[1].split('      - name: Attach')[0]
const script = step
    .split('        run: |\n')[1]
    .split('\n')
    .map((line) => line.slice(10))
    .join('\n')

for (const [scenario, succeeds, publishes] of [
    ['missing', true, true],
    ['network', false, false],
    ['auth', false, false],
    ['invalid-json', false, false],
    ['same', true, false],
    ['different', false, false],
]) {
    test(`npm release handles ${scenario}`, () => {
        const directory = mkdtempSync(join(tmpdir(), 'sdk-release-'))
        try {
            mkdirSync(join(directory, 'bin'))
            mkdirSync(join(directory, 'package'))
            writeFileSync(join(directory, 'package/easyslip-sdk-1.0.0.tgz'), 'package bytes')
            const integrity = `sha512-${createHash('sha512').update('package bytes').digest('base64')}`
            writeFileSync(
                join(directory, 'bin/npm'),
                `#!${process.execPath}
const args = process.argv.slice(2)
if (args[0] === 'publish') { console.log('PUBLISH_CALLED'); process.exit(0) }
if (args[1] === '@easyslip/sdk') { console.log('@easyslip/sdk'); process.exit(0) }
const scenario = process.env.SCENARIO
if (scenario === 'same' || scenario === 'different') {
    const value = scenario === 'same' ? process.env.INTEGRITY : 'sha512-different'
    console.log(args.includes('--json') ? JSON.stringify(value) : value)
} else {
    const code = scenario === 'missing' ? 'E404' : scenario === 'auth' ? 'E401' : 'ECONNRESET'
    console.log(scenario === 'invalid-json' ? 'invalid response' : JSON.stringify({error: {code}}))
    process.exit(1)
}
`,
                { mode: 0o755 },
            )
            const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
                cwd: directory,
                env: {
                    ...process.env,
                    PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
                    VERSION: '1.0.0',
                    SCENARIO: scenario,
                    INTEGRITY: integrity,
                },
                encoding: 'utf8',
            })
            assert.equal(result.status === 0, succeeds, result.stdout + result.stderr)
            assert.equal(result.stdout.includes('PUBLISH_CALLED'), publishes)
        } finally {
            rmSync(directory, { recursive: true, force: true })
        }
    })
}
