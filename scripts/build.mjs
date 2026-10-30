// Compiles src/ to dist/esm (ES modules) and dist/cjs (CommonJS), each with type definitions.
import { spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true })
for (const project of ['tsconfig.esm.json', 'tsconfig.cjs.json']) {
    const run = spawnSync(process.execPath, [tsc, '-p', project], { cwd: root, stdio: 'inherit' })
    if (run.status !== 0) process.exit(run.status ?? 1)
}
writeFileSync(new URL('../dist/esm/package.json', import.meta.url), '{ "type": "module" }\n')
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{ "type": "commonjs" }\n')
console.log('built dist/esm and dist/cjs')
