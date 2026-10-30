// Type-checks every TypeScript code block in README.md and README.th.md exactly as written, so
// the samples customers copy keep compiling against the current API.
// Usage: node scripts/check-readme.mjs
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const work = mkdtempSync(join(root, 'node_modules', '.readme-check-'))
try {
    const files = []
    for (const readme of ['README.md', 'README.th.md']) {
        const text = readFileSync(join(root, readme), 'utf8')
        const blocks = [...text.matchAll(/^```ts\n([\s\S]*?)^```$/gm)].map((match) => match[1])
        if (blocks.length === 0) throw new Error(`${readme} has no ts code blocks`)
        blocks.forEach((code, index) => {
            const file = `${readme.replace(/\W/g, '-')}-${String(index + 1).padStart(2, '0')}.ts`
            writeFileSync(join(work, file), code)
            files.push(file)
        })
        console.log(`${readme}: ${blocks.length} ts code blocks`)
    }
    // The settings of a strict application project, with @easyslip/sdk resolved to this source.
    const config = {
        compilerOptions: {
            target: 'ES2022',
            module: 'esnext',
            moduleResolution: 'bundler',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            types: ['node'],
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            paths: { '@easyslip/sdk': [join(root, 'src', 'index.ts')] },
        },
        files,
    }
    writeFileSync(join(work, 'tsconfig.json'), JSON.stringify(config, null, 2))
    const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
    const result = spawnSync(process.execPath, [tsc, '-p', join(work, 'tsconfig.json')], {
        encoding: 'utf8',
    })
    if (result.status !== 0) {
        process.stdout.write(result.stdout)
        process.stderr.write(result.stderr)
        throw new Error('a README code block does not compile')
    }
    console.log(`all ${files.length} README code blocks compile`)
} finally {
    rmSync(work, { recursive: true, force: true })
}
