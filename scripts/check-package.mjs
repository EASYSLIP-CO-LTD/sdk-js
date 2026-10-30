// Packs the package and checks it the way a user receives it:
// 1. the tarball holds the build, the READMEs, LICENSE and CHANGELOG, and no source or tests
// 2. publint and Are the Types Wrong? find no problems
// 3. a fresh project installs the tarball, imports it as ESM and CommonJS, and makes an offline call
// 4. the published types compile in that project with the newest TypeScript and with TypeScript 5
// Usage: node scripts/check-package.mjs [--keep <dir>]   (--keep leaves the consumer project there)
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const keepAt = process.argv.indexOf('--keep')
const keep = keepAt === -1 ? null : process.argv[keepAt + 1]

function run(cmd, args, cwd = root) {
    const result = spawnSync(cmd, args, {
        cwd,
        encoding: 'utf8',
        shell: process.platform === 'win32',
    })
    if (result.status !== 0) {
        process.stdout.write(result.stdout ?? '')
        process.stderr.write(result.stderr ?? '')
        throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.status}`)
    }
    return result.stdout
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const work = mkdtempSync(join(tmpdir(), 'easyslip-sdk-package-'))
try {
    // 1. Build and pack (the build already ran, so prepack is skipped), then check what is inside.
    run(process.execPath, [join(root, 'scripts', 'build.mjs')])
    const [packed] = JSON.parse(
        run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', work]),
    )
    const files = packed.files.map((f) => f.path).sort()
    for (const want of [
        'package.json',
        'README.md',
        'README.th.md',
        'LICENSE',
        'CHANGELOG.md',
        'dist/esm/index.js',
        'dist/esm/index.d.ts',
        'dist/cjs/index.js',
        'dist/cjs/index.d.ts',
    ]) {
        if (!files.includes(want)) throw new Error(`the package is missing ${want}`)
    }
    const stray = files.filter(
        (f) => !/^(dist\/|package\.json$|README|LICENSE$|CHANGELOG\.md$)/.test(f),
    )
    if (stray.length > 0) throw new Error(`the package must not contain ${stray.join(', ')}`)
    const tarball = join(work, packed.filename)
    console.log(`packed ${packed.filename}: ${files.length} files, ${packed.size} bytes`)

    // 2. Package linters.
    run(join(root, 'node_modules', '.bin', 'publint'), ['run', '--strict', '--pack', 'npm'])
    run(join(root, 'node_modules', '.bin', 'attw'), [tarball, '--format', 'ascii'])
    console.log('publint --strict: no problems; attw: no problems')

    // 3. A fresh consumer project.
    const app = keep ?? join(work, 'app')
    mkdirSync(app, { recursive: true })
    writeFileSync(
        join(app, 'package.json'),
        `${JSON.stringify({ name: 'consumer', private: true, type: 'module' }, null, 2)}\n`,
    )
    run(npm, ['install', '--no-audit', '--no-fund', '--ignore-scripts', tarball], app)
    for (const file of ['offline-call.mjs', 'offline-call.cjs', 'types.ts']) {
        cpSync(join(root, 'scripts', 'consumer', file), join(app, file))
    }
    for (const file of ['offline-call.mjs', 'offline-call.cjs']) {
        const out = JSON.parse(run(process.execPath, [file], app))
        const want = {
            url: 'https://api.easyslip.com/v2/info',
            auth: 'Bearer sk_offline_check_0000',
            name: 'Example App',
            requestId: 'req-offline-1',
            rootError: true,
        }
        for (const [key, value] of Object.entries(want)) {
            if (out[key] !== value) throw new Error(`${file}: ${key} is ${out[key]}, want ${value}`)
        }
        console.log(`node ${process.version} ${out.module}: offline call ok (${out.url})`)
    }

    // 4. The published types, without skipLibCheck, under nodenext (ESM and CJS) and bundler.
    const options = {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        types: [],
    }
    cpSync(join(app, 'types.ts'), join(app, 'types.mts'))
    cpSync(join(app, 'types.ts'), join(app, 'types.cts'))
    const projects = {
        'tsconfig.nodenext.json': {
            compilerOptions: { ...options, module: 'nodenext', moduleResolution: 'nodenext' },
            files: ['types.mts', 'types.cts'],
        },
        'tsconfig.bundler.json': {
            compilerOptions: { ...options, module: 'esnext', moduleResolution: 'bundler' },
            files: ['types.ts'],
        },
    }
    for (const [file, config] of Object.entries(projects)) {
        writeFileSync(join(app, file), JSON.stringify(config, null, 2))
    }
    for (const compiler of ['typescript', 'typescript-5']) {
        const tsc = join(root, 'node_modules', compiler, 'bin', 'tsc')
        for (const file of Object.keys(projects)) run(process.execPath, [tsc, '-p', file], app)
        const version = run(process.execPath, [tsc, '--version']).trim()
        console.log(`${version}: the published types compile (nodenext ESM and CJS, bundler)`)
    }
    console.log(`ok ${pkg.name}@${pkg.version}`)
} finally {
    rmSync(work, { recursive: true, force: true })
}
